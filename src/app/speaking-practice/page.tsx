'use client';

import { useState } from 'react';
import PipecatSession from '@/components/daily/PipecatSession';
import styles from './page.module.css';

export default function SpeakingPracticePage() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  
  // Example practice questions
  const practiceQuestions = [
    {
      id: 1,
      title: 'Technology & Education',
      question: 'How do you think technology has changed education? What are the benefits and drawbacks of using technology in the classroom?'
    },
    {
      id: 2,
      title: 'Cultural Traditions',
      question: 'What is an important cultural tradition in your country? How has it changed over time?'
    },
    {
      id: 3,
      title: 'Environmental Challenges',
      question: 'What do you think is the biggest environmental challenge facing our planet today? What solutions would you propose?'
    }
  ];
  
  const startSession = (question: any) => {
    setActiveQuestion(question);
    setIsSessionActive(true);
  };
  
  const endSession = () => {
    setIsSessionActive(false);
    setActiveQuestion(null);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Speaking Practice with Gemini</h1>
      
      {!isSessionActive ? (
        <div className={styles.questionList}>
          <p className={styles.intro}>
            Select a topic to start a conversation with Gemini. You'll be able to practice speaking
            about the topic in a natural conversation.
          </p>
          
          {practiceQuestions.map((question) => (
            <div key={question.id} className={styles.questionCard}>
              <h3 className={styles.questionTitle}>{question.title}</h3>
              <p className={styles.questionText}>{question.question}</p>
              <button 
                className={styles.startButton}
                onClick={() => startSession(question)}
              >
                Practice This Topic
              </button>
            </div>
          ))}
        </div>
      ) : (
        <PipecatSession
          roomName={`speaking-${activeQuestion.id}`}
          userName="Student"
          questionText={activeQuestion.question}
          sessionTitle={activeQuestion.title}
          onLeave={endSession}
        />
      )}
    </div>
  );
}
