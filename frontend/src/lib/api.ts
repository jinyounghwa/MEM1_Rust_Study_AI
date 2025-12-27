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

export interface SessionListItem {
  id: string;
  title: string;
  topics: string[];
  startTime: number;
  lastUpdated: number;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SessionDetail {
  session: {
    userId: string;
    topics: string[];
    started: boolean;
    currentIS: string;
    currentTopic: string;
    currentTopicIndex: number;
    stepCount: number;
    rolePlayMode: boolean;
    progress?: Progress;
  };
  messages: SessionMessage[];
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

  // 데이터베이스에서 모든 세션 목록 조회
  async getSessions(): Promise<SessionListItem[]> {
    try {
      const response = await axios.get(`${API_BASE}/sessions`);
      return response.data.sessions || [];
    } catch (error) {
      console.error('Failed to fetch sessions from database:', error);
      return [];
    }
  },

  // 데이터베이스에서 특정 세션 로드
  async loadSession(userId: string): Promise<SessionDetail | null> {
    try {
      const response = await axios.get(`${API_BASE}/session/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to load session from database:', error);
      return null;
    }
  },

  // 데이터베이스에서 세션 삭제
  async deleteSession(userId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/session/${userId}`);
    } catch (error) {
      console.error('Failed to delete session from database:', error);
      throw error;
    }
  },
};
