import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/rust-learn';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Progress {
  currentTopic: string;
  currentIndex: number;
  totalTopics: number;
  completedTopics: string[];
}

export interface ChatResponse {
  response: string;
  hasIS: boolean;
  tip: string;
  currentStep: number;
  progress?: Progress;
}

export interface StartLearningResponse {
  success: boolean;
  message: string;
  explanation: string;
  instruction: string;
  isMultiObjective: boolean;
  totalTopics: number;
  userId: string;
}

export interface NextTopicResponse {
  success: boolean;
  message: string;
  explanation?: string;
  instruction?: string;
  progress?: Progress | null;
}

export const api = {
  async startLearning(userId: string, topics: string | string[]) {
    const response = await axios.post(`${API_BASE}/start`, { userId, topics });
    return response.data;
  },

  async sendMessage(userId: string, message: string): Promise<ChatResponse> {
    const response = await axios.post(`${API_BASE}/chat`, { userId, message });
    return response.data;
  },

  async nextTopic(userId: string) {
    const response = await axios.post(`${API_BASE}/next-topic`, { userId });
    return response.data;
  },

  async toggleRolePlay(userId: string) {
    const response = await axios.post(`${API_BASE}/toggle-roleplay`, {
      userId,
    });
    return response.data;
  },

  getExportUrl(userId: string): string {
    return `${API_BASE}/export/${userId}`;
  },

  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      return response.data;
    } catch (error) {
      return { status: 'error', ollama: 'disconnected' };
    }
  },
};
