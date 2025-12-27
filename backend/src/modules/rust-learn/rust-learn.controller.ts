import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { RustLearnService } from './rust-learn.service';
import { ContextManagerService } from '../context-manager/context-manager.service';
import { QwenService } from '../qwen/qwen.service';

@Controller('api/rust-learn')
export class RustLearnController {
  constructor(
    private rustLearnService: RustLearnService,
    private contextManager: ContextManagerService,
    private qwen: QwenService,
  ) {}

  @Post('start')
  async startLearning(
    @Body() body: { userId: string; topics: string | string[] },
  ) {
    const { userId, topics } = body;

    const topicsArray = Array.isArray(topics) ? topics : [topics];
    const isMultiObjective = topicsArray.length > 1;

    this.contextManager.initSession(userId, topicsArray);

    // 첫 번째 주제의 설명 자동 생성
    let explanation = '';
    try {
      const initialPrompt = this.contextManager.buildInitialTopicPrompt(userId);
      explanation = await this.qwen.chat(initialPrompt);

      // AI 응답도 히스토리에 저장
      this.contextManager.saveAIResponse(userId, explanation);
    } catch (error) {
      console.error('Initial topic explanation generation failed:', error);
      explanation = '설명을 생성하는 중 오류가 발생했습니다. AI에게 직접 물어봐주세요.';
    }

    return {
      success: true,
      message: isMultiObjective
        ? `"${topicsArray.join(' → ')}" 순서로 학습을 시작합니다!`
        : `"${topicsArray[0]}" 학습을 시작합니다!`,
      instruction:
        'AI의 설명을 읽고 배운 내용을 <IS>요약</IS> 형식으로 작성해주세요.',
      explanation: explanation,
      isMultiObjective,
      totalTopics: topicsArray.length,
      userId,
    };
  }

  @Post('chat')
  async chat(@Body() body: { userId: string; message: string }) {
    const { userId, message } = body;

    try {
      const result = await this.rustLearnService.chat(userId, message);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '대화 처리 중 오류가 발생했습니다.';
      throw new HttpException(
        message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('next-topic')
  async nextTopic(@Body() body: { userId: string }) {
    const { userId } = body;

    try {
      const state = this.contextManager.getState(userId);
      const previousTopic = state?.currentTopic || '';

      const moved = this.contextManager.moveToNextTopic(userId);
      const progress = this.contextManager.getProgress(userId);

      if (moved && progress) {
        // 새로운 주제의 설명 자동 생성
        let newTopicExplanation = '';
        try {
          const initialPrompt = this.contextManager.buildInitialTopicPrompt(userId);
          newTopicExplanation = await this.qwen.chat(initialPrompt);

          // AI 응답도 히스토리에 저장
          this.contextManager.saveAIResponse(userId, newTopicExplanation);
        } catch (error) {
          console.error('Topic explanation generation failed:', error);
          newTopicExplanation = '새로운 주제의 설명을 생성하는 중 오류가 발생했습니다.';
        }

        return {
          success: true,
          message: `✨ "${previousTopic}" → "${progress.currentTopic}" 주제로 이동합니다!

📌 **주의사항**:
"${previousTopic}"에서 배운 개념이 "${progress.currentTopic}"의 기초가 됩니다.
이전 내용을 참고하며 새로운 주제를 학습하세요.`,
          explanation: newTopicExplanation,
          transitionTip: this.generateTopicTransitionExplanation(previousTopic, progress.currentTopic),
          progress,
        };
      } else {
        return {
          success: false,
          message: '🎉 모든 주제를 완료했습니다!\n\n지금까지 배운 모든 개념이 서로 연결되어 있습니다.\n마크다운 파일을 다운로드하여 학습 기록을 확인하세요!',
          progress: progress || null,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '다음 주제 이동 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMsg,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateTopicTransitionExplanation(previousTopic: string, nextTopic: string): string {
    const transitions: { [key: string]: { [key: string]: string } } = {
      'Option 타입': {
        'Result 타입': '✅ Option은 값의 **유무**만 표현합니다.\n✅ Result는 **성공/실패 상태**와 **에러 정보**를 모두 표현합니다.\n\n→ Option보다 더 상세한 에러 처리가 필요할 때 Result를 사용하세요!',
        '? 연산자': '✅ Option과 Result를 매번 match로 처리하면 코드가 길어집니다.\n✅ ? 연산자는 Error/None을 자동으로 전파합니다.\n\n→ 함수 내에서 Option/Result를 간결하게 처리할 수 있어요!',
      },
      'Result 타입': {
        '? 연산자': '✅ Result는 Ok(T)와 Err(E)를 명확히 구분합니다.\n✅ ? 연산자는 Err를 자동으로 함수 외부로 전파합니다.\n\n→ 에러 처리를 더 효율적으로 할 수 있어요!',
        '에러 처리': '✅ Result는 성공/실패를 타입으로 표현합니다.\n✅ 에러 처리는 Result를 활용한 고급 패턴입니다.\n\n→ 복잡한 에러 시나리오를 우아하게 처리하세요!',
      },
    };

    return transitions[previousTopic]?.[nextTopic] ||
      `✅ "${previousTopic}"에서 배운 개념을 바탕으로\n✅ "${nextTopic}"을 학습합니다.\n\n→ 주제들 간의 연결고리를 찾으며 학습하세요!`;
  }

  @Post('toggle-roleplay')
  toggleRoleplay(@Body() body: { userId: string }) {
    const { userId } = body;

    try {
      const isEnabled = this.contextManager.toggleRolePlayMode(userId);
      return {
        success: true,
        rolePlayMode: isEnabled,
        message: isEnabled
          ? '🎭 역할극 모드가 활성화되었습니다!'
          : '📚 일반 모드로 전환되었습니다.',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '역할극 모드 전환 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMsg,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('export/:userId')
  async exportMarkdown(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const markdown = this.contextManager.generateMarkdown(userId);
      const state = this.contextManager.getState(userId);

      // Sanitize filename to remove special characters and Korean text
      const sanitizedTopic = (state?.currentTopic || 'rust-study')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
      const filename = `rust-study-${sanitizedTopic}-${Date.now()}.md`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.status(HttpStatus.OK).send(markdown);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '마크다운 생성 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMsg,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  async healthCheck() {
    const isHealthy = await this.qwen.healthCheck();

    return {
      status: isHealthy ? 'ok' : 'error',
      ollama: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
