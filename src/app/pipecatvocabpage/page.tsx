'use client';

import React, { useState, useEffect } from 'react';
import { PipecatProvider } from '@/services/pipecat/PipecatProvider';
import VocabPipecatSession from '@/components/pipecat/VocabPipecatSession';
import PipecatNavbar from '@/components/pipecat/PipecatNavbar';

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  example?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const sampleWords: VocabularyWord[] = [
  {
    id: '1',
    word: 'Ephemeral',
    definition: 'Lasting for a very short time',
    example: 'The ephemeral beauty of cherry blossoms',
    difficulty: 'medium'
  },
  {
    id: '2',
    word: 'Serendipity',
    definition: 'The occurrence of events by chance in a happy or beneficial way',
    example: 'Finding a perfect book while looking for something else was pure serendipity',
    difficulty: 'medium'
  },
  {
    id: '3',
    word: 'Ubiquitous',
    definition: 'Present, appearing, or found everywhere',
    example: 'Mobile phones have become ubiquitous in modern society',
    difficulty: 'hard'
  },
  {
    id: '4',
    word: 'Juxtaposition',
    definition: 'The fact of two things being seen or placed close together with contrasting effect',
    example: 'The juxtaposition of bright colors against a dark background',
    difficulty: 'hard'
  },
  {
    id: '5',
    word: 'Quintessential',
    definition: 'Representing the most perfect or typical example of a quality or class',
    example: 'The quintessential English gentleman',
    difficulty: 'hard'
  },
  {
    id: '6',
    word: 'Luminous',
    definition: 'Giving off light; bright or shining',
    example: 'The stars were luminous in the night sky',
    difficulty: 'easy'
  },
  {
    id: '7',
    word: 'Resilience',
    definition: 'The capacity to recover quickly from difficulties',
    example: 'The resilience shown by the community after the disaster',
    difficulty: 'medium'
  },
  {
    id: '8',
    word: 'Eloquent',
    definition: 'Fluent or persuasive in speaking or writing',
    example: 'She gave an eloquent speech that moved the audience',
    difficulty: 'medium'
  },
];

export default function PipecatVocabPage() {
  const [userName, setUserName] = useState('Student');
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [showWordSelection, setShowWordSelection] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  // Select a random word on first render
  useEffect(() => {
    if (sampleWords.length > 0 && !selectedWord) {
      const randomIndex = Math.floor(Math.random() * sampleWords.length);
      setSelectedWord(sampleWords[randomIndex]);
    }
  }, [selectedWord]);
  
  // Filter words based on difficulty
  const filteredWords = filter === 'all' 
    ? sampleWords 
    : sampleWords.filter(word => word.difficulty === filter);
  
  // Handle selection of a new word
  const handleSelectWord = (word: VocabularyWord) => {
    setSelectedWord(word);
    setShowWordSelection(false);
  };
  
  // Handle exiting the current session
  const handleExitSession = () => {
    setShowWordSelection(true);
  };
  
  // Handle user name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PipecatNavbar />
      
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* User name input */}
          <div className="p-4 bg-indigo-50 border-b">
            <div className="flex flex-wrap gap-4 items-end justify-between">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Your Name:</label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={handleNameChange}
                  className="mt-1 p-2 border rounded-md w-full max-w-xs"
                />
              </div>
              
              {showWordSelection && (
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty:</label>
                  <select
                    id="difficulty"
                    value={filter}
                    onChange={handleFilterChange}
                    className="mt-1 p-2 border rounded-md bg-white"
                  >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {showWordSelection ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Select a Vocabulary Word to Learn</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWords.map((word) => (
                  <div
                    key={word.id}
                    onClick={() => handleSelectWord(word)}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-indigo-600">{word.word}</h3>
                      {word.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          word.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          word.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {word.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{word.definition}</p>
                    {word.example && (
                      <p className="text-gray-500 text-sm mt-2 italic">"{word.example}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : selectedWord ? (
            <div className="p-0">
              <PipecatProvider>
                <VocabPipecatSession
                  vocabularyWord={selectedWord.word}
                  definition={selectedWord.definition}
                  userName={userName}
                  onLeave={handleExitSession}
                />
              </PipecatProvider>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-600">Please select a vocabulary word to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
