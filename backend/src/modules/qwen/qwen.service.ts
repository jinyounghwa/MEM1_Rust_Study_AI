import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { QwenMessage } from '../context-manager/types/conversation.types';

interface QwenResponse {
  message: {
    content: string;
  };
}

@Injectable()
export class QwenService {
  private readonly ollamaUrl = 'http://localhost:11434/api/chat';
  private readonly model = 'qwen2.5:7b';

  async chat(messages: QwenMessage[]): Promise<string> {
    try {
      const response = await axios.post<QwenResponse>(
        this.ollamaUrl,
        {
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.6,        // 더 일관된 응답 (0.7 → 0.6)
            top_p: 0.85,              // 추론 속도 개선 (0.9 → 0.85)
            num_predict: 1200,         // 응답 길이 제한으로 속도 개선 (2000 → 1200)
            num_ctx: 2048,             // 컨텍스트 윈도우 최적화
            repeat_penalty: 1.1,       // 반복 패턴 방지로 효율성 증대
          },
        },
        {
          timeout: 90000,            // 타임아웃 단축 (120초 → 90초)
        },
      );

      return response.data.message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요. (http://localhost:11434)',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        throw new HttpException(
          `Qwen API 오류: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get('http://localhost:11434/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}
