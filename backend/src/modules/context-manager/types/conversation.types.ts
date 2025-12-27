export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface RolePlayScenario {
  situation: string;
  characters: {
    name: string;
    role: string;
    description: string;
  }[];
  dialogue: {
    speaker: string;
    message: string;
    codeExample?: string;
  }[];
  problem: string;
  solution: string;
}

export interface ConversationState {
  currentIS: string;
  currentTopic: string;
  allTopics: string[];
  currentTopicIndex: number;
  topicISHistory: Map<string, string>;
  conversationHistory: Message[];
  lastAIResponse: string;
  stepCount: number;
  rolePlayMode: boolean;
  currentScenario?: RolePlayScenario;
}

export interface ChatResponse {
  response: string;
  hasIS: boolean;
  tip: string;
  currentStep: number;
  scenario?: RolePlayScenario;
  progress?: {
    currentTopic: string;
    currentIndex: number;
    totalTopics: number;
    completedTopics: string[];
  };
}

export interface MarkdownExport {
  content: string;
  filename: string;
}

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
