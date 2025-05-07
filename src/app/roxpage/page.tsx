'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import contentApi from '@/api/contentService';
import userProgressApi from '@/api/userProgressService';
import { useRoxAssistant } from '@/hooks/useRoxAssistant';

// Define interfaces for our data types
interface VocabWord {
  wordId: string;
  word: string;
  definition: string;
  example: string;
}

interface SpeakingTopic {
  topicId: string;
  title: string;
  description: string;
}

interface UserTask {
  id: string;
  taskType: 'vocab' | 'speaking' | 'writing';
  contentRefId: string;
  completedAt?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  level?: string;
}

function RoxPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [userName, setUserName] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProgress, setUserProgress] = useState<UserTask[]>([]);
  const [nextTask, setNextTask] = useState<UserTask | null>(null);
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [speakingTopics, setSpeakingTopics] = useState<SpeakingTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Rox AI assistant hook
  const { messages, sendMessage, isLoading, error: roxError } = useRoxAssistant();
  const [userInput, setUserInput] = useState<string>('');
  
  // Get latest AI message
  const latestAIMessage = messages
    .filter(msg => msg.role === 'assistant')
    .slice(-1)[0];
  
  // Get username from session or localStorage when component mounts
  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name);
    } else {
      const storedUserName = localStorage.getItem('userName');
      if (storedUserName) {
        setUserName(storedUserName);
      }
    }
    
    // Fetch user data from services
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Get sample vocabulary words
        const vocabSamples = ['ubiquitous', 'ameliorate', 'ephemeral', 'serendipity'];
        const vocabPromises = vocabSamples.map(id => contentApi.getVocabWord(id));
        
        // Get sample speaking topics
        const topicSamples = ['topic-daily-routine', 'topic-climate-change', 'topic-technology'];
        const topicPromises = topicSamples.map(id => contentApi.getSpeakingTopic(id));
        
        // Fetch user profile and progress if token exists
        const token = localStorage.getItem('token');
        let profileData = null;
        let progressData: UserTask[] = [];
        let nextTaskData = null;
        
        if (token) {
          try {
            profileData = await userProgressApi.getUserProfile();
            progressData = await userProgressApi.getUserProgress();
            nextTaskData = await userProgressApi.getNextTask();
          } catch (err) {
            console.error('Error fetching user data:', err);
            // Token might be invalid, but we'll continue with content data
          }
        }
        
        // Resolve all promises
        const [vocabResults, topicResults] = await Promise.all([
          Promise.allSettled(vocabPromises),
          Promise.allSettled(topicPromises)
        ]);
        
        // Extract successful results
        const validVocabWords = vocabResults
          .filter((result): result is PromiseFulfilledResult<VocabWord> => 
            result.status === 'fulfilled')
          .map(result => result.value);
          
        const validTopics = topicResults
          .filter((result): result is PromiseFulfilledResult<SpeakingTopic> => 
            result.status === 'fulfilled')
          .map(result => result.value);
        
        setVocabWords(validVocabWords);
        setSpeakingTopics(validTopics);
        setUserProfile(profileData);
        setUserProgress(progressData);
        setNextTask(nextTaskData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [session]);

  // Navigation to other practice sections with context
  const navigateToSpeaking = () => {
    // If we have a next task and it's a speaking task, pass the topic ID
    if (nextTask && nextTask.taskType === 'speaking') {
      router.push(`/speakingpage?topicId=${nextTask.contentRefId}`);
    } else if (speakingTopics.length > 0) {
      // Otherwise use the first available topic
      router.push(`/speakingpage?topicId=${speakingTopics[0].topicId}`);
    } else {
      router.push('/speakingpage');
    }
  };
  
  const navigateToWriting = () => {
    // If we have a next task and it's a writing task, pass the prompt ID
    if (nextTask && nextTask.taskType === 'writing') {
      router.push(`/writingpage?promptId=${nextTask.contentRefId}`);
    } else {
      router.push('/writingpage');
    }
  };
  
  const navigateToVocab = () => {
    // If we have a next task and it's a vocab task, pass the word ID
    if (nextTask && nextTask.taskType === 'vocab') {
      router.push(`/vocabpage?wordId=${nextTask.contentRefId}`);
    } else if (vocabWords.length > 0) {
      // Otherwise use the first available word
      router.push(`/vocabpage?wordId=${vocabWords[0].wordId}`);
    } else {
      router.push('/vocabpage');
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (userInput.trim() && !isLoading) {
      sendMessage(userInput);
      setUserInput('');
    }
  };

  // Handle key press (send on Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Navigation items data
  const navItems = [
    { active: true, icon: "/dashboard.svg", alt: "Dashboard" },
    { active: false, icon: "/frame-1.svg", alt: "Frame 1" },
    { active: false, icon: "/frame.svg", alt: "Frame" },
    { active: false, icon: "/reference-material.svg", alt: "Reference Material" },
    { active: false, icon: "/frame-3.svg", alt: "Frame 3" },
  ];

  // Suggestion cards data - dynamically based on user progress
  const getSuggestionCards = () => {
    const defaultCards = [
      {
        title: "Summarize my learning",
        description: "so far, what have I covered and how well?",
        action: () => setUserInput("Can you summarize my learning progress so far?")
      },
      {
        title: "Improve my speaking skills",
        description: "where am I lacking and how to fix it?",
        action: () => setUserInput("How can I improve my TOEFL speaking skills?")
      },
      {
        title: "Start vocabulary practice",
        description: "enhance your English vocabulary",
        action: navigateToVocab
      },
    ];
    
    // If we have next task data, replace the first card with personalized suggestion
    if (nextTask) {
      let customCard = {
        title: "Continue your learning",
        description: "Your next task is ready",
        action: () => {}
      };
      
      if (nextTask.taskType === 'vocab') {
        customCard = {
          title: `Learn the word "${nextTask.contentRefId}"`,
          description: "Continue your vocabulary practice",
          action: navigateToVocab
        };
      } else if (nextTask.taskType === 'speaking') {
        customCard = {
          title: `Practice speaking about ${nextTask.contentRefId}`,
          description: "Continue your speaking practice",
          action: navigateToSpeaking
        };
      } else if (nextTask.taskType === 'writing') {
        customCard = {
          title: `Write about ${nextTask.contentRefId}`,
          description: "Continue your writing practice",
          action: navigateToWriting
        };
      }
      
      return [customCard, ...defaultCards.slice(1)];
    }
    
    return defaultCards;
  };
  
  const suggestionCards = getSuggestionCards();

  // Render message content with basic markdown support
  const renderMessageContent = (content: string) => {
    // Simple markdown parsing (could be replaced with a proper markdown library)
    const parsedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .split('\n').map(line => `<p>${line}</p>`).join(''); // Paragraphs
      
    return <div dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-blue-50 to-white overflow-hidden">
      {/* Sidebar navigation */}
      <div className="flex flex-col w-14 h-full py-3.5 px-2 items-center justify-between bg-white shadow-sm">
        {/* Logo */}
        <div className="flex w-[28px] h-7 items-center justify-center">
          <Image
            className="w-[23px] h-7"
            alt="Final logo"
            src="/final-logo.png"
            width={23}
            height={28}
          />
        </div>

        {/* Navigation icons */}
        <div className="flex flex-col items-center gap-3">
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              className={`flex items-center justify-center p-2 rounded-md ${item.active ? "bg-[#566fe9]" : ""}`}
            >
              <Image
                className="w-6 h-6"
                alt={item.alt}
                src={item.icon}
                width={24}
                height={24}
              />
            </Button>
          ))}
        </div>

        {/* Spacer element */}
        <div className="w-[28px] h-7 opacity-0">
          <Image
            className="w-[23px] h-7"
            alt="Final logo"
            src="/final-logo.png"
            width={23}
            height={28}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center relative">
        {/* Decorative Elements */}
        <div className="absolute top-[-300px] right-[-300px] w-[600px] h-[600px] bg-[#566fe9] rounded-full opacity-10" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[400px] h-[400px] bg-[#336de6] rounded-full opacity-10" />
        
        {/* Content container - vertically centered */}
        <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl px-4 z-10">
          {/* AI Assistant avatar */}
          <div className="w-[200px] h-[200px] mb-6 flex items-center justify-center">
            <Image
              className="object-cover rounded-full"
              alt="AI Assistant"
              src="/image-3.png"
              width={200}
              height={200}
            />
          </div>

          {/* AI response container */}
          <div className="w-full mb-8 px-8">
            <div className="max-h-[200px] overflow-y-auto">
              {isLoading ? (
                <div className="font-normal text-center text-black text-lg">
                  Rox is typing...
                </div>
              ) : latestAIMessage ? (
                <div className="font-normal text-black text-lg text-center">
                  {renderMessageContent(latestAIMessage.content)}
                </div>
              ) : (
                <div className="font-semibold text-black text-lg text-center leading-normal">
                  {loading ? (
                    "Loading your personalized content..."
                  ) : error ? (
                    error
                  ) : (
                    <>
                      Hello {userName || 'there'}. I am Rox, your AI Assistant!
                      {userProgress && userProgress.length > 0 && (
                        <div className="mt-2 text-sm font-normal">
                          You've completed {userProgress.length} learning tasks. {nextTask ? "Let's continue your journey!" : "Great job!"}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Input area */}
          <div className="w-full flex items-center justify-center gap-3 mb-8">
            <div className="flex w-full max-w-lg h-12 items-center justify-between pl-4 pr-2 py-5 rounded-md border border-solid border-[#566fe933] bg-white shadow-sm">
              <Input
                className="border-none shadow-none focus-visible:ring-0 font-normal text-black text-sm leading-normal"
                placeholder="Ask me anything about TOEFL!"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              <Button
                size="sm"
                className="flex items-center gap-2.5 p-2 bg-[#566fe9] rounded"
                onClick={handleSendMessage}
                disabled={isLoading || !userInput.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                </svg>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="flex h-12 items-center gap-3.5 px-3.5 py-5 rounded-md border border-solid border-[#566fe933] bg-white shadow-sm"
            >
              <Image
                className="w-5 h-5"
                alt="Frame"
                src="/frame-2.svg"
                width={20}
                height={20}
              />
              <div className="w-px h-[29px] bg-gray-200"></div>
              <Image
                className="w-5 h-5"
                alt="Frame"
                src="/frame-4.svg"
                width={20}
                height={20}
              />
            </Button>
          </div>

          {/* Suggestion cards */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-4xl">
            {!loading && suggestionCards.map((card, index) => (
              <Card
                key={index}
                className="flex flex-col items-start gap-2.5 pt-3 pb-4 px-4 flex-[0_0_auto] max-w-[230px] rounded-md border-none bg-gradient-to-b from-white to-blue-50 cursor-pointer hover:shadow-md transition-shadow"
                onClick={card.action}
              >
                <CardContent className="flex flex-col items-start gap-2 p-0">
                  <div className="w-fit font-medium text-black text-base">
                    {card.title}
                  </div>
                  <div className="w-full font-normal text-black text-sm leading-normal">
                    {card.description}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Display error if any */}
          {(error || roxError) && (
            <div className="w-full max-w-lg mt-4 text-red-500 text-sm text-center">
              {error || roxError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoxPage() {
  return (
    <ProtectedRoute>
      <RoxPageContent />
    </ProtectedRoute>
  );
}