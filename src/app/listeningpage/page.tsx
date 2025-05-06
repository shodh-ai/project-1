'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  PauseCircle, 
  Loader2, 
  RefreshCw,
  XIcon 
} from "lucide-react";

interface ConversationTurn {
  speaker: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Conversation {
  id: string;
  title: string;
  topic: string;
  conversation: ConversationTurn[];
  questions: Question[];
}

interface Score {
  correct: number;
  total: number;
}

interface AnswersType {
  [key: string]: number;
}

interface DialogueLine {
  text: string;
  voice: string;
}

const SAMPLE_CONVERSATIONS = [
  {
    id: "conversation-1",
    title: "Campus Life Discussion",
    topic: "University Resources",
    conversation: [
      { speaker: "Speaker 1", text: "So, have you had a chance to check out the new student center that opened last month?" },
      { speaker: "Speaker 2", text: "Yes, I actually went there yesterday. It's really impressive! They have study rooms with smart boards, a much bigger cafeteria, and even a meditation room." },
      { speaker: "Speaker 1", text: "That sounds great! I've been meaning to go, but I've been so busy with midterms. Is it crowded?" },
      { speaker: "Speaker 2", text: "It depends on the time of day. In the mornings it's pretty quiet, but around noon it gets packed. I'd recommend going before 11 AM if you want to secure a good study spot." },
      { speaker: "Speaker 1", text: "Thanks for the tip. I've been studying in the library, but it's always so hard to find a seat there." },
      { speaker: "Speaker 2", text: "Oh, and did you know they also have a technology help desk? I was having trouble with my laptop, and they fixed it for free!" },
      { speaker: "Speaker 1", text: "Really? That's incredibly helpful. I've been having issues with my laptop connecting to the campus WiFi." },
      { speaker: "Speaker 2", text: "You should definitely take it to them. Also, they have these workshops every Thursday about different software that might be useful for classes." },
      { speaker: "Speaker 1", text: "What kind of software do they cover?" },
      { speaker: "Speaker 2", text: "Last week was about data visualization tools, and I think this week is about reference management software. The schedule is posted on the university website." },
      { speaker: "Speaker 1", text: "That's perfect timing. I'm working on a research paper and could use help with citations. Do you need to register for these workshops?" },
      { speaker: "Speaker 2", text: "Yes, but it's a simple online form. They limit it to 25 students per session to make sure everyone gets individual attention." },
      { speaker: "Speaker 1", text: "I'll definitely look into that. Thanks for letting me know about all these resources!" },
      { speaker: "Speaker 2", text: "No problem! The student center is really becoming the heart of campus activities." },
    ],
    questions: [
      {
        id: "q1",
        text: "What is the woman's opinion of the new student center?",
        options: [
          "She thinks it's too crowded.",
          "She is impressed by the facilities.",
          "She wishes it had more study spaces.",
          "She hasn't visited it yet."
        ],
        correctAnswer: 1
      },
      {
        id: "q2",
        text: "According to the conversation, when is the best time to find a study spot at the student center?",
        options: [
          "During midterms",
          "Around noon",
          "Before 11 AM",
          "In the evening"
        ],
        correctAnswer: 2
      },
      {
        id: "q3",
        text: "What service did the woman use at the student center?",
        options: [
          "WiFi troubleshooting",
          "Technology help desk",
          "Meditation room",
          "Citation assistance"
        ],
        correctAnswer: 1
      },
      {
        id: "q4",
        text: "What is the topic of the workshop mentioned for this week?",
        options: [
          "Data visualization tools",
          "Campus WiFi solutions",
          "Research paper writing",
          "Reference management software"
        ],
        correctAnswer: 3
      },
      {
        id: "q5",
        text: "How many students can attend each workshop?",
        options: [
          "Unlimited",
          "15 students",
          "25 students",
          "50 students"
        ],
        correctAnswer: 2
      }
    ]
  },
  {
    id: "conversation-2",
    title: "Environmental Science Lecture",
    topic: "Urban Sustainability",
    conversation: [
      { speaker: "Professor", text: "Today, we'll be discussing urban sustainability solutions and how cities are adapting to environmental challenges." },
      { speaker: "Student", text: "Professor, I read that New York City has been implementing some innovative approaches. Could you elaborate on those?" },
      { speaker: "Professor", text: "Yes, excellent question. New York has been a leader in several areas. Their green roof initiative has been particularly successful. They've converted over 730 acres of standard rooftops into green spaces." },
      { speaker: "Student", text: "What are the main benefits of these green roofs?" },
      { speaker: "Professor", text: "There are multiple benefits. First, they help reduce the urban heat island effect by absorbing less heat than traditional roofs. Second, they improve air quality by filtering pollutants. Third, they provide insulation, which reduces energy costs for heating and cooling." },
      { speaker: "Student", text: "That's impressive. Do they also help with stormwater management?" },
      { speaker: "Professor", text: "Absolutely. Green roofs can retain 70-90% of rainwater during summer months, which significantly reduces stormwater runoff and helps prevent flooding. This is crucial for cities like New York that have aging sewer systems." },
      { speaker: "Student", text: "Are there any challenges to implementing these green roofs?" },
      { speaker: "Professor", text: "Yes, there are several challenges. The initial installation cost is higher than traditional roofing. Some buildings require structural reinforcement to support the additional weight. And there's ongoing maintenance required to keep the vegetation healthy." },
      { speaker: "Student", text: "Has the city provided any incentives to encourage more buildings to adopt green roofs?" },
      { speaker: "Professor", text: "Yes, they've implemented a tax abatement program that covers about $5.23 per square foot of green roof installation. There are also expedited permit processes for buildings that incorporate green infrastructure." },
      { speaker: "Student", text: "That's helpful. Do you think other cities could replicate this model?" },
      { speaker: "Professor", text: "Many cities are already adapting similar approaches, but it's important to consider local climate conditions, building regulations, and available resources. What works in New York might need modifications for cities in different climate zones." },
      { speaker: "Student", text: "Thank you for explaining that. I'm particularly interested in how these solutions might apply to smaller cities." },
      { speaker: "Professor", text: "That's a great focus area. In fact, I'd like everyone to prepare a case study on a small to medium-sized city's sustainability initiatives for next week's discussion." },
    ],
    questions: [
      {
        id: "q1",
        text: "What is the main topic of the lecture?",
        options: [
          "Climate change effects",
          "Urban sustainability solutions",
          "New York City architecture",
          "Green technology innovations"
        ],
        correctAnswer: 1
      },
      {
        id: "q2",
        text: "How many acres of green roofs has New York City implemented according to the professor?",
        options: [
          "Over 370 acres",
          "Over 530 acres",
          "Over 730 acres",
          "Over 930 acres"
        ],
        correctAnswer: 2
      },
      {
        id: "q3",
        text: "What percentage of rainwater can green roofs retain during summer months?",
        options: [
          "30-50%",
          "50-70%",
          "70-90%",
          "90-100%"
        ],
        correctAnswer: 2
      },
      {
        id: "q4",
        text: "What is NOT mentioned as a benefit of green roofs?",
        options: [
          "Improved air quality",
          "Reduced energy costs",
          "Increased property values",
          "Reduced urban heat island effect"
        ],
        correctAnswer: 2
      },
      {
        id: "q5",
        text: "What incentive has New York City provided for green roof installation?",
        options: [
          "Free installation",
          "Tax abatement program",
          "Mandatory requirements",
          "Subsidized maintenance"
        ],
        correctAnswer: 1
      }
    ]
  },
  {
    id: "conversation-3",
    title: "Staff Meeting",
    topic: "Hiring Discussion",
    conversation: [
      { speaker: "Speaker 1", text: "We need to make a decision on the new position today." },
      { speaker: "Speaker 2", text: "I've reviewed all three candidates and I think Sarah is the most qualified." },
      { speaker: "Speaker 1", text: "I agree her resume is impressive, but I'm concerned about her lack of experience in our industry." },
      { speaker: "Speaker 2", text: "That's true, but she has transferable skills and seems like a quick learner." },
      { speaker: "Speaker 1", text: "What about Michael? He has five years of directly relevant experience." },
      { speaker: "Speaker 2", text: "Yes, but his references mentioned he can be difficult to work with sometimes." },
      { speaker: "Speaker 1", text: "And then there's Jessica. She has a good balance of experience and seems very collaborative." },
      { speaker: "Speaker 2", text: "I think we should go with Sarah. She had the strongest interview and showed a lot of initiative." },
      { speaker: "Speaker 1", text: "You've convinced me. Let's offer her the position and see if she accepts." },
    ],
    questions: [
      {
        id: "q1",
        text: "What topic are the two staff members talking about?",
        options: [
          "Who to hire for the specific job.",
          "What to do at the upcoming faculty party.",
          "Who to fire.",
          "How to evaluate new teachers."
        ],
        correctAnswer: 0
      },
      {
        id: "q2",
        text: "Which candidate did they ultimately decide to hire?",
        options: [
          "Michael",
          "Jessica",
          "Sarah",
          "They didn't reach a decision"
        ],
        correctAnswer: 2
      }
    ]
  }
];

function ListeningPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [userName, setUserName] = useState('');
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AnswersType>({});
  const [score, setScore] = useState<Score | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const questionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name);
    } else {
      const storedUserName = localStorage.getItem('userName');
      if (storedUserName) {
        setUserName(storedUserName);
      } else {
        router.push('/loginpage');
      }
    }
    
    const conversationIdFromUrl = searchParams?.get('conversationId');
    if (conversationIdFromUrl) {
      const conversation = SAMPLE_CONVERSATIONS.find(c => c.id === conversationIdFromUrl);
      if (conversation) {
        selectConversation(conversation);
      } else {
        setError(`Conversation ID "${conversationIdFromUrl}" not found in available conversations`);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [router, session, searchParams]);

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setCurrentConversation(conversation);
    setCompleted(false);
    setAnswers({});
    setScore(null);
    setFeedbackVisible(false);
    setAudioUrl(null);
    setAudioError(null);
    setAudioProgress(0);
    
    generateAudio(conversation);
  };

  const generateAudio = async (conversation: Conversation) => {
    setGeneratingAudio(true);
    setAudioError(null);
    
    try {
      const dialogueLines: DialogueLine[] = [];
      
      conversation.conversation.forEach((turn, index) => {
        if (index > 0) {
          dialogueLines.push({
            text: "...",
            voice: "alloy"
          });
        }
        
        dialogueLines.push({
          text: turn.text,
          voice: "alloy"
        });
      });
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dialogueLines,
          title: conversation.title
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate audio');
      }
      
      if (data.audioUrl && data.audioUrl.startsWith('data:audio/')) {
        setAudioUrl(data.audioUrl);
      } else if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
      } else {
        throw new Error('No audio URL in response');
      }
    } catch (error) {
      setAudioError("There was an error generating the audio. Please try again.");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          setAudioError("There was an error playing the audio. Please try again.");
        });
      }
      setPlaying(!playing);
    } else {
      if (!playing) {
        setPlaying(true);
        const interval = setInterval(() => {
          setAudioProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              setPlaying(false);
              setCompleted(true);
              return 100;
            }
            return prev + 2;
          });
        }, 500);
      } else {
        setPlaying(false);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlaying(false);
    setCompleted(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percentage = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(percentage);
    }
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const submitAnswers = () => {
    if (!currentConversation) return;
    
    let correct = 0;
    let total = currentConversation.questions.length;
    
    currentConversation.questions.forEach((question: Question) => {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    
    setScore({ correct, total });
    setFeedbackVisible(true);
    
    if (questionsContainerRef.current) {
      questionsContainerRef.current.scrollTop = 0;
    }
  };

  const resetExercise = () => {
    setSelectedConversation(null);
    setCurrentConversation(null);
    setCompleted(false);
    setAnswers({});
    setScore(null);
    setFeedbackVisible(false);
    setAudioUrl(null);
    setAudioError(null);
    setAudioProgress(0);
  };

  const loadNewConversation = () => {
    const availableIds = SAMPLE_CONVERSATIONS.map(c => c.id);
    
    const currentId = currentConversation?.id;
    const filteredIds = availableIds.filter(id => id !== currentId);
    const randomIndex = Math.floor(Math.random() * filteredIds.length);
    const newId = filteredIds[randomIndex];
    
    const newConversation = SAMPLE_CONVERSATIONS.find(c => c.id === newId);
    if (newConversation) {
      selectConversation(newConversation);
    }
  };

  const handleLeave = () => {
    try {
      const token = localStorage.getItem('token');
      if (token && currentConversation) {
        console.log('Would record task completion for conversation:', currentConversation.id);
      }
    } catch (err) {
      console.error('Error recording task completion:', err);
    }
    
    router.push('/roxpage');
  };

  const retryAudioGeneration = () => {
    if (selectedConversation) {
      setAudioError(null);
      generateAudio(selectedConversation);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center overflow-hidden relative">
      <div className="absolute w-[753px] h-[753px] top-0 right-0 bg-[#566fe9] rounded-[376.5px] -z-10" />
      <div className="absolute w-[353px] h-[353px] bottom-0 left-0 bg-[#336de6] rounded-[176.5px] -z-10" />
      <div className="absolute inset-0 bg-[#ffffff99] backdrop-blur-[200px] -z-10" />

      <div className="w-[1280px] h-[740px] bg-white rounded-xl border-none m-4 relative">
        <div className="p-8 h-full">
          <button 
            onClick={handleLeave}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <XIcon className="h-6 w-6" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-[600px] w-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#566fe9] mx-auto"></div>
                <p className="mt-4 text-gray-700 font-medium">Loading listening exercise...</p>
              </div>
            </div>
          ) : !selectedConversation ? (
            <div>
              <h1 className="text-3xl font-bold text-center mb-6">TOEFL Listening Practice</h1>
              <p className="text-center text-gray-600 mb-8">
                Select a conversation to practice your listening skills. You'll hear the conversation only once, then answer questions about what you heard.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {SAMPLE_CONVERSATIONS.map((conversation) => (
                  <Card key={conversation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle>{conversation.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500 mb-4">Topic: {conversation.topic}</p>
                      <p className="text-gray-500 mb-4">{conversation.questions.length} questions</p>
                      <Button 
                        onClick={() => selectConversation(conversation)}
                        className="w-full"
                      >
                        Start Practice
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                <div className="relative w-[200px] h-[200px] bg-gray-200 rounded-md overflow-hidden">
                  <img 
                    src="/user-profile.png" 
                    alt="User" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23E2E8F0"/><path d="M100,80 C111,80 120,71 120,60 C120,49 111,40 100,40 C89,40 80,49 80,60 C80,71 89,80 100,80 Z M100,90 C83.33,90 50,98.33 50,115 L50,130 L150,130 L150,115 C150,98.33 116.67,90 100,90 Z" fill="%23A0AEC0"/></svg>'
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-white rounded-md">
                    <span className="text-[#566fe9] font-semibold text-sm">User</span>
                  </div>
                </div>

                <div className="relative w-[200px] h-[200px] bg-gray-200 rounded-md overflow-hidden">
                  <img 
                    src="/ai-teacher.png" 
                    alt="AI Teacher" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23EBF8FF"/><path d="M100,40 L60,65 L60,115 L100,140 L140,115 L140,65 L100,40 Z" fill="%2363B3ED"/><circle cx="100" cy="90" r="20" fill="%23FFFFFF"/></svg>'
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-white rounded-md">
                    <span className="text-[#566fe9] font-semibold text-sm">AI Listening Teacher</span>
                  </div>
                </div>
              </div>

              <div className="max-w-[800px] space-y-8 absolute left-[56px] top-[80px]">
                <div className="space-y-4">
                  <h2 className="font-semibold text-base">Listening Practice Session: {selectedConversation.title}</h2>
                  <div className="w-[610px]">
                    <div className="h-2.5 bg-[#c7ccf8] bg-opacity-20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#566fe9] rounded-full" 
                        style={{ width: completed ? '100%' : `${audioProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="opacity-60 font-semibold text-base">Listen to the {selectedConversation.topic}</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={togglePlayback}
                      className={`w-12 h-12 rounded-md flex items-center justify-center ${playing ? 'bg-gray-200' : 'bg-[#566fe9]'}`}
                      disabled={completed || audioError !== null}
                    >
                      {playing ? (
                        <PauseCircle className="w-6 h-6 text-white" />
                      ) : (
                        <PlayCircle className="w-6 h-6 text-white" />
                      )}
                    </button>
                    <div className="relative w-[680px] h-[15px]">
                      <div className="relative h-[15px]">
                        <div 
                          className="absolute w-[680px] h-[5px] top-[5px] left-0 bg-[#566fe933] rounded-md"
                        />
                        <div 
                          className="absolute h-[5px] top-[5px] left-0 bg-[#566fe9] rounded-md opacity-90"
                          style={{ width: `${audioProgress * 6.8}px` }}
                        />
                        <div 
                          className="absolute w-[15px] h-[15px] top-0 bg-[#647aeb] rounded-[7.5px]"
                          style={{ left: `${audioProgress * 6.8 - 7.5}px` }}
                          hidden={audioProgress === 0}
                        />
                      </div>
                    </div>
                    
                    {audioUrl && (
                      <audio 
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={handleAudioEnded}
                        onTimeUpdate={handleTimeUpdate}
                        onError={() => {
                          setAudioError("There was an error playing the audio file. Please try again.");
                        }}
                      />
                    )}
                  </div>
                  
                  {generatingAudio && (
                    <div className="flex items-center mt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                      <p className="text-sm text-gray-600">Generating audio conversation...</p>
                    </div>
                  )}
                  
                  {audioError && (
                    <div className="flex flex-col items-start mt-2">
                      <p className="text-red-500 text-sm mb-1">{audioError}</p>
                      <Button 
                        onClick={retryAudioGeneration}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    </div>
                  )}
                  
                  {!completed && !audioError && !generatingAudio && (
                    <p className="mt-2 text-amber-600 text-xs">
                      ⚠️ You will only be able to listen to this conversation once.
                    </p>
                  )}
                </section>

                {completed && currentConversation && (
                  <div 
                    ref={questionsContainerRef}
                    className="space-y-8 max-h-[380px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    style={{ 
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#D1D5DB #F3F4F6'
                    }}
                  >
                    <h3 className="sticky top-0 bg-white pt-2 pb-4 font-semibold text-base z-10">
                      Answer questions about the conversation
                    </h3>
                    
                    {feedbackVisible && score && (
                      <div className="sticky top-12 bg-white pt-2 pb-4 mb-6 z-10">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-semibold text-lg">
                              Your Score: {score.correct}/{score.total}
                            </h4>
                            <p className="text-gray-600">
                              {score.correct === score.total 
                                ? "Perfect! Great job listening carefully." 
                                : "Keep practicing to improve your listening skills."}
                            </p>
                          </div>
                          <div className="text-3xl font-bold text-[#566fe9]">
                            {Math.round((score.correct / score.total) * 100)}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-8">
                      {currentConversation.questions.map((question, index) => (
                        <div key={question.id} className="space-y-4 pb-6 border-b border-gray-200 last:border-b-0">
                          <h4 className="font-medium">
                            {index + 1}. {question.text}
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {question.options.map((option, optIndex) => {
                              const isSelected = answers[question.id] === optIndex;
                              const isCorrect = question.correctAnswer === optIndex;
                              const isWrong = feedbackVisible && isSelected && !isCorrect;
                              
                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => !feedbackVisible && handleAnswerSelect(question.id, optIndex)}
                                  disabled={feedbackVisible}
                                  className={`p-3 rounded-md text-left flex items-center justify-between 
                                    ${isSelected 
                                      ? feedbackVisible
                                        ? isCorrect
                                          ? 'bg-green-50 border border-green-300'
                                          : 'bg-red-50 border border-red-300'
                                        : 'bg-[#566fe9] text-white'
                                      : 'bg-gray-50 hover:bg-gray-100'
                                    }
                                    ${feedbackVisible && isCorrect && !isSelected 
                                      ? 'bg-green-50 border border-green-300'
                                      : ''
                                    }
                                    transition-colors
                                  `}
                                >
                                  <span>
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                  </span>
                                  
                                  {feedbackVisible && (
                                    <>
                                      {isCorrect && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      )}
                                      {isWrong && (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                      )}
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {completed && !feedbackVisible && (
                      <div className="pt-4 pb-4 sticky bottom-0 bg-white z-10">
                        <Button 
                          onClick={submitAnswers}
                          className="w-full bg-[#566fe9] hover:bg-[#4258d3]"
                          disabled={Object.keys(answers).length < currentConversation.questions.length}
                        >
                          Submit Answers
                        </Button>
                        {Object.keys(answers).length < currentConversation.questions.length && (
                          <p className="text-amber-500 text-xs mt-2">
                            Please answer all {currentConversation.questions.length} questions before submitting.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {feedbackVisible && (
                      <div className="pt-6 pb-4 flex gap-4 sticky bottom-0 bg-white z-10">
                        <Button 
                          onClick={resetExercise}
                          variant="outline"
                          className="flex-1"
                        >
                          See All Exercises
                        </Button>
                        <Button 
                          onClick={loadNewConversation}
                          className="flex-1 bg-[#566fe9] hover:bg-[#4258d3]"
                        >
                          Try Another Conversation
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListeningPage() {
  return (
    <ProtectedRoute>
      <ListeningPageContent />
    </ProtectedRoute>
  );
}