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
    try {
      const response = await axios.post(`${API_BASE}/start`, { userId, topics });
      return response.data;
    } catch (error) {
      console.error(`API Error (startLearning): ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  async sendMessage(userId: string, message: string): Promise<ChatResponse> {
    try {
      const response = await axios.post(`${API_BASE}/chat`, { userId, message });
      return response.data;
    } catch (error) {
      console.error(`API Error (sendMessage): ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  async nextTopic(userId: string) {
    try {
      const response = await axios.post(`${API_BASE}/next-topic`, { userId });
      return response.data;
    } catch (error) {
      console.error(`API Error (nextTopic): ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  async toggleRolePlay(userId: string) {
    try {
      const response = await axios.post(`${API_BASE}/toggle-roleplay`, {
        userId,
      });
      return response.data;
    } catch (error) {
      console.error(`API Error (toggleRolePlay): ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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
      if (error instanceof Error) {
        console.error(`API Error (getSessions): ${error.message}`);
      }
      return [];
    }
  },

  // 데이터베이스에서 특정 세션 로드
  async loadSession(userId: string): Promise<SessionDetail | null> {
    try {
      const response = await axios.get(`${API_BASE}/session/${userId}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`API Error (loadSession/${userId}): ${error.message}`);
      }
      return null;
    }
  },

  // 데이터베이스에서 세션 삭제
  async deleteSession(userId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/session/${userId}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`API Error (deleteSession/${userId}): ${error.message}`);
      }
      throw error;
    }
  },

  // 스트리밍 채팅 메시지 전송
  async *streamMessage(userId: string, message: string) {
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, message }),
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // 마지막 불완전한 라인은 버퍼에 유지

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          try {
            const jsonStr = trimmed.substring(6);
            const data = JSON.parse(jsonStr);
            yield data;
          } catch (e) {
            console.warn('SSE parsing error:', e);
          }
        }
      }
    } catch (error) {
       console.error(`API Error (streamMessage): ${error instanceof Error ? error.message : String(error)}`);
       throw error;
    }
  },
};
