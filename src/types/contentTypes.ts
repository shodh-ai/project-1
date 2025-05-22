/**
 * Type definitions for content service data models.
 * These types match the structure of the responses from the content service API.
 */

/**
 * Represents a vocabulary word from the content service
 */
export interface VocabWord {
  wordId: string;
  wordText: string;
  definition: string;
  exampleSentence: string | null;
  difficultyLevel: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a speaking topic from the content service
 */
export interface SpeakingTopic {
  topicId: string;
  title: string;
  promptText: string;
  difficultyLevel: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a writing prompt from the content service
 */
export interface WritingPrompt {
  promptId: string;
  title: string;
  promptText: string;
  difficultyLevel: number | null;
  createdAt: string;
  updatedAt: string;
}


// src/types/contentTypes.ts

// --- Existing Message and ChatHistory Interfaces (Keep them if used) ---
export interface Message {
  id: string;
  type: 'text' | 'image' | 'file' | 'system';
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatHistory {
  messages: Message[];
}

// --- NEW: Types for Context and Data Channel Payloads ---

/**
 * Represents the current learning and UI context of the student on the frontend.
 * This is sent to the backend AI to inform its decisions.
 */
export interface CurrentContext {
  user_id: string; // Unique identifier for the student
  toefl_section?: string; // e.g., "Speaking", "Writing"
  question_type?: string; // e.g., "Q1_Independent", "Integrated_Essay"
  task_stage?: string; // Current phase, e.g., "viewing_prompt", "prep_time", "active_response_speaking", "reviewing_feedback"
  current_prompt_id?: string; // Identifier for the specific TOEFL prompt/question being worked on
  ui_element_in_focus?: string; // e.g., "writing_paragraph_2", "speaking_point_1_notes" (optional)
  timer_value_seconds?: number; // Current value of any active timer (optional)
  selected_tools_or_options?: Record<string, any>; // Any UI tools/options selected by user (optional)
  last_interaction?: {
    type: string;
    payload: any;
    timestamp: string;
  };
  // Add any other fields relevant for the backend to understand the student's immediate UI/task context
}

/**
 * The inner payload sent within a 'student_interaction_context' data channel message.
 * This aligns with what the backend (FastAPI Pydantic model `InteractionRequest`) will partially expect.
 * The backend's InteractionRequest also includes chat_history, which might be managed differently.
 */
export interface InteractionContextPayload {
  transcript_if_relevant?: string | null; // For text submissions or if client-side STT provides a quick transcript.
                                         // If STT is purely server-side from audio stream, this can be null.
  current_context: CurrentContext;       // The detailed context object.
  session_id: string;                    // Consistent session identifier (e.g., room.sid).
}

/**
 * Wrapper for messages sent over the LiveKit Data Channel from frontend to the server-side LiveKit agent.
 */
export interface FrontendDataChannelMessage {
  type: "student_interaction_context" | "student_action_event" | "other_frontend_event"; // Differentiate message types
  payload: InteractionContextPayload | Record<string, any>; // Use specific payload for known types
}
