import {
  Controller,
  Post,
  Get,
  Delete,
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
import { SessionRepository } from '../database/repositories/session.repository';
import { MessageRepository } from '../database/repositories/message.repository';

@Controller('api/rust-learn')
export class RustLearnController {
  constructor(
    private rustLearnService: RustLearnService,
    private contextManager: ContextManagerService,
    private qwen: QwenService,
    private sessionRepo: SessionRepository,
    private messageRepo: MessageRepository,
  ) {}

  /**
   * 학습 시작
   */
  @Post('start')
  async startLearning(
    @Body() body: { userId: string; topics: string | string[] },
  ) {
    const { userId, topics } = body;

    const topicsArray = Array.isArray(topics) ? topics : [topics];
    const isMultiObjective = topicsArray.length > 1;

    // Initialize session in database
    await this.contextManager.initSession(userId, topicsArray);

    // 첫 번째 주제의 설명 자동 생성
    let explanation = '';
    try {
      const initialPrompt = await this.contextManager.buildInitialTopicPrompt(userId);
      explanation = await this.qwen.chat(initialPrompt);

      // AI 응답도 DB에 저장
      await this.messageRepo.save({
        sessionId: userId,
        role: 'assistant',
        content: explanation,
      });
      await this.contextManager.saveAIResponse(userId, explanation);
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

  /**
   * 대화 진행
   */
  @Post('chat')
  async chat(@Body() body: { userId: string; message: string }) {
    const { userId, message } = body;

    try {
      const result = await this.rustLearnService.chat(userId, message);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '대화 처리 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 다음 주제로 이동
   */
  @Post('next-topic')
  async nextTopic(@Body() body: { userId: string }) {
    const { userId } = body;

    try {
      const state = await this.contextManager.getState(userId);
      if (!state) {
        throw new HttpException(
          '세션을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const previousTopic = state.currentTopic;

      const moved = await this.contextManager.moveToNextTopic(userId);
      const progress = await this.contextManager.getProgress(userId);

      if (moved && progress) {
        // 새로운 주제의 설명 자동 생성
        let newTopicExplanation = '';
        try {
          const initialPrompt = await this.contextManager.buildInitialTopicPrompt(userId);
          newTopicExplanation = await this.qwen.chat(initialPrompt);

          // AI 응답도 DB에 저장
          await this.messageRepo.save({
            sessionId: userId,
            role: 'assistant',
            content: newTopicExplanation,
          });
          await this.contextManager.saveAIResponse(userId, newTopicExplanation);
        } catch (error) {
          console.error('Topic explanation generation failed:', error);
          newTopicExplanation =
            '새로운 주제의 설명을 생성하는 중 오류가 발생했습니다.';
        }

        return {
          success: true,
          message: `✨ ${progress.currentTopic} 주제로 넘어갑니다!`,
          explanation: newTopicExplanation,
          progress,
          previousTopic,
        };
      } else {
        return {
          success: true,
          message: '🎉 모든 주제를 완료했습니다! 축하합니다!',
          progress,
          previousTopic,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '주제 이동 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 역할극 모드 토글
   */
  @Post('toggle-roleplay')
  async toggleRoleplay(@Body() body: { userId: string }) {
    const { userId } = body;

    try {
      const rolePlayMode = await this.contextManager.toggleRolePlayMode(userId);

      return {
        success: true,
        rolePlayMode,
        message: rolePlayMode
          ? '🎭 역할극 모드가 활성화되었습니다!'
          : '역할극 모드가 비활성화되었습니다.',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '모드 전환 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 마크다운 파일 내보내기
   */
  @Get('export/:userId')
  async exportMarkdown(@Param('userId') userId: string, @Res() res: Response) {
    try {
      const markdown = await this.contextManager.generateMarkdown(userId);
      const state = await this.contextManager.getState(userId);

      if (!state) {
        throw new HttpException(
          '세션을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      // 파일명을 ASCII 문자만 사용하도록 변환 (한글 등 비ASCII 문자 제거)
      const safeTopicName = state.currentTopic
        .replace(/[^a-zA-Z0-9]/g, '_')  // 영문숫자 외의 문자를 언더스코어로 변환
        .substring(0, 30)  // 길이 제한
        .replace(/_+/g, '_')  // 연속된 언더스코어를 하나로
        .replace(/^_|_$/g, '');  // 앞뒤 언더스코어 제거

      const filename = `rust-study-${safeTopicName}-${Date.now()}.md`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.status(HttpStatus.OK).send(markdown);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '마크다운 생성 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ollama 상태 확인
   */
  @Get('health')
  async healthCheck() {
    const isHealthy = await this.qwen.healthCheck();

    return {
      status: isHealthy ? 'ok' : 'error',
      ollama: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 모든 세션 목록 조회 (Sidebar용)
   */
  @Get('sessions')
  async getSessions() {
    try {
      const sessions = await this.sessionRepo.findAll();

      return {
        sessions: sessions.map((session) => ({
          id: session.id,
          title: session.title,
          topics: session.allTopics,
          startTime: session.createdAt.getTime(),
          lastUpdated: session.updatedAt.getTime(),
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '세션 목록 조회 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 특정 세션 로드 (DB에서 복원)
   */
  @Get('session/:userId')
  async loadSession(@Param('userId') userId: string) {
    try {
      const session = await this.sessionRepo.findOne(userId);

      if (!session) {
        throw new HttpException(
          '세션을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const messages = await this.messageRepo.findBySessionId(userId);
      const progress = await this.contextManager.getProgress(userId);

      return {
        session: {
          userId: session.id,
          topics: session.allTopics,
          started: true,
          currentIS: session.currentIS,
          currentTopic: session.currentTopic,
          currentTopicIndex: session.currentTopicIndex,
          stepCount: session.stepCount,
          rolePlayMode: session.rolePlayMode,
          progress,
        },
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : '세션 로드 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 세션 삭제
   */
  @Delete('session/:userId')
  async deleteSession(@Param('userId') userId: string) {
    try {
      const exists = await this.sessionRepo.findOne(userId);

      if (!exists) {
        throw new HttpException(
          '세션을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.sessionRepo.delete(userId);

      return {
        success: true,
        message: '세션이 삭제되었습니다.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : '세션 삭제 중 오류가 발생했습니다.';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
