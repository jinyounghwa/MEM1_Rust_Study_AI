import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { QwenMessage } from '../context-manager/types/conversation.types';
import { ResponseCleaner } from './response-cleaner';

interface QwenResponse {
  message: {
    content: string;
  };
}

@Injectable()
export class QwenService {
  private readonly ollamaUrl = 'http://localhost:11434/api/chat';
  private readonly model = 'qwen2.5:7b';
  private retryCount = 0;
  private readonly maxRetries = 2;

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

      let content = response.data.message.content;

      // 중국어 정제
      const cleaningResult = ResponseCleaner.clean(content);

      // 디버그 로그 (개발 중에만)
      if (process.env.DEBUG_CLEANER === 'true') {
        console.log(ResponseCleaner.getDetailedReport(content));
      }

      // 중국어가 많으면 재시도 (최대 2회)
      if (cleaningResult.hasChinese && this.retryCount < this.maxRetries) {
        console.warn(
          `⚠️  응답에 중국어 감지 (${cleaningResult.chineseCharCount}자), 재시도 중... (${this.retryCount + 1}/${this.maxRetries})`,
        );
        this.retryCount++;

        // 프롬프트에 재시도 지시 추가
        const retryMessages = [
          ...messages.slice(0, -1),
          {
            ...messages[messages.length - 1],
            content:
              messages[messages.length - 1].content +
              '\n\n⚠️ [재시도] 반드시 한국어만 사용하세요. 중국어는 절대 금지입니다.',
          },
        ];

        return this.chat(retryMessages);
      }

      // 정제된 응답 반환
      return cleaningResult.cleaned;
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
