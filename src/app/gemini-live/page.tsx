'use client';

import React, { useState } from 'react';
import GeminiLiveRTVI from '@/components/pipecat/GeminiLiveRTVI';
import styles from './page.module.css';

export default function GeminiLivePage() {
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [topics, setTopics] = useState([
    {
      id: 1,
      title: 'Technology Impact',
      question: 'How has technology changed education and learning? Discuss both benefits and challenges.'
    },
    {
      id: 2,
      title: 'Environmental Policy',
      question: 'What environmental policies should governments prioritize? Explain your reasoning.'
    },
    {
      id: 3,
      title: 'Cultural Understanding',
      question: 'How does learning about different cultures benefit society? Provide examples.'
    }
  ]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Direct Gemini Live Speaking Practice</h1>
      <p className={styles.description}>
        Practice your speaking skills with Gemini 2.0 Flash Live using real-time speech-to-speech conversation.
      </p>
      
      {!selectedTopic ? (
        <div className={styles.topicList}>
          <h2 className={styles.sectionTitle}>Select a Topic</h2>
          <div className={styles.topics}>
            {topics.map((topic) => (
              <div key={topic.id} className={styles.topicCard}>
                <h3 className={styles.topicTitle}>{topic.title}</h3>
                <p className={styles.topicQuestion}>{topic.question}</p>
                <button 
                  className={styles.startButton}
                  onClick={() => setSelectedTopic(topic)}
                >
                  Practice This Topic
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.practiceSession}>
          <div className={styles.backButtonContainer}>
            <button 
              className={styles.backButton}
              onClick={() => setSelectedTopic(null)}
            >
              ← Back to Topics
            </button>
          </div>
          
          <GeminiLiveRTVI topic={selectedTopic.question} />
        </div>
      )}
    </div>
  );
}
