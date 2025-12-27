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
  private responseCache = new Map<string, { response: string; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1시간

  /**
   * Get cache key from messages
   */
  private getCacheKey(messages: QwenMessage[]): string {
    const messageContent = messages
      .map((m) => `${m.role}:${m.content}`)
      .join('|');
    return Buffer.from(messageContent).toString('base64').substring(0, 100);
  }

  /**
   * Non-streaming chat (전체 응답을 기다리는 방식)
   */
  async chat(messages: QwenMessage[]): Promise<string> {
    // 캐시 확인
    const cacheKey = this.getCacheKey(messages);
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Cache hit - returning cached response');
      return cached.response;
    }

    try {
      const response = await axios.post<QwenResponse>(
        this.ollamaUrl,
        {
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.6,
            top_p: 0.85,
            num_predict: 1000, // 900 → 1000 (약간 더 자세한 응답)
            num_ctx: 2048,
            repeat_penalty: 1.1,
          },
        },
        {
          timeout: 90000,
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

      // 캐시에 저장
      this.responseCache.set(cacheKey, {
        response: cleaningResult.cleaned,
        timestamp: Date.now(),
      });

      // 캐시 크기 제한 (최대 100개)
      if (this.responseCache.size > 100) {
        const firstKey = this.responseCache.keys().next().value;
        if (firstKey) {
          this.responseCache.delete(firstKey);
        }
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

  /**
   * Streaming chat (토큰 하나씩 전송하는 방식)
   * EventSource로 실시간 응답 받기 위함
   */
  async chatStream(
    messages: QwenMessage[],
    onToken: (token: string) => void,
  ): Promise<string> {
    try {
      const response = await axios.post(
        this.ollamaUrl,
        {
          model: this.model,
          messages: messages,
          stream: true, // 스트리밍 활성화
          options: {
            temperature: 0.6,
            top_p: 0.85,
            num_predict: 1000,
            num_ctx: 2048,
            repeat_penalty: 1.1,
          },
        },
        {
          timeout: 120000,
          responseType: 'stream',
        },
      );

      return new Promise((resolve, reject) => {
        let fullContent = '';

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content && typeof json.message.content === 'string') {
                  const token = json.message.content;
                  fullContent += token;
                  onToken(token); // 토큰 콜백
                }
              } catch {
                // JSON 파싱 실패 무시
              }
            }
          }
        });

        response.data.on('end', () => {
          // 중국어 정제
          const cleaningResult = ResponseCleaner.clean(fullContent);
          resolve(cleaningResult.cleaned);
        });

        response.data.on('error', reject);
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Ollama 서버에 연결할 수 없습니다.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
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
