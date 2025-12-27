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
  // MLX Server (mlx-lm.server)는 기본적으로 8080 포트에서 OpenAI 호환 API를 제공합니다.
  private readonly baseUrl = process.env.MLX_SERVER_URL || 'http://localhost:8080/v1';
  private readonly model = process.env.MLX_MODEL || 'mlx-community/Qwen2.5-7B-Instruct-4bit';
  private readonly timeout = parseInt(process.env.MLX_TIMEOUT || '60000', 10);
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
    // 각 요청마다 재시도 카운트 초기화
    this.retryCount = 0;

    // 캐시 확인
    const cacheKey = this.getCacheKey(messages);
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Cache hit - returning cached response');
      return cached.response;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          stream: false,
          temperature: 0.6,
          top_p: 0.85,
          max_tokens: 800,
        },
        {
          timeout: this.timeout,
        },
      );

      let content = response.data.choices[0].message.content;

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
            'MLX 서버에 연결할 수 없습니다. mlx-lm.server를 실행 중인지 확인해주세요. (http://localhost:8080)',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        throw new HttpException(
          `MLX API 오류: ${error.message}`,
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
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          stream: true,
          temperature: 0.6,
          top_p: 0.85,
          max_tokens: 1000,
        },
        {
          timeout: this.timeout * 2,  // 스트리밍은 더 긴 타임아웃
          responseType: 'stream',
        },
      );

      return new Promise((resolve, reject) => {
        let fullContent = '';

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmedLine.substring(6));
                const token = json.choices[0]?.delta?.content || '';
                if (token) {
                  fullContent += token;
                  onToken(token);
                }
              } catch (e) {
                // 파싱 에러 무시
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
            'MLX 서버에 연결할 수 없습니다.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/models`);
      return true;
    } catch {
      return false;
    }
  }
}
