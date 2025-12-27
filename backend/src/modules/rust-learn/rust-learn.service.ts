import { Injectable } from '@nestjs/common';
import { ContextManagerService } from '../context-manager/context-manager.service';
import { QwenService } from '../qwen/qwen.service';
import { MessageRepository } from '../database/repositories/message.repository';

@Injectable()
export class RustLearnService {
  constructor(
    private contextManager: ContextManagerService,
    private qwen: QwenService,
    private messageRepo: MessageRepository,
  ) {}

  /**
   * Check if message triggers role-play mode
   */
  private isRolePlayTrigger(message: string): boolean {
    const triggers = [
      '어떻게',
      '언제',
      '예시',
      '실제',
      '어떻게 사용',
      '언제 쓰',
      '실제로',
      '개발에서',
      '프로젝트에서',
      '어떻게 해',
    ];
    return triggers.some((trigger) => message.includes(trigger));
  }

  /**
   * Main chat logic with database persistence
   */
  async chat(userId: string, message: string) {
    // 1. Save user message to database
    await this.messageRepo.save({
      sessionId: userId,
      role: 'user',
      content: message,
    });

    // 2. Extract IS from user message
    const hasIS = await this.contextManager.extractAndSaveIS(userId, message);

    // 3. Get current session state
    const state = await this.contextManager.getState(userId);
    if (!state) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    const isRolePlayMode = state.rolePlayMode || false;
    const shouldGenerateScenario =
      isRolePlayMode && this.isRolePlayTrigger(message) && !hasIS;

    // 4. Build MEM1 prompt
    let prompt = await this.contextManager.buildPrompt(userId, message);

    // 5. Get AI response
    let aiResponse = '';
    if (shouldGenerateScenario) {
      aiResponse = await this.generateRolePlayScenario(userId, message);
    } else {
      // Regular conversation response
      aiResponse = await this.qwen.chat(prompt);
    }

    // 6. Save AI response to database
    await this.messageRepo.save({
      sessionId: userId,
      role: 'assistant',
      content: aiResponse,
    });
    await this.contextManager.saveAIResponse(userId, aiResponse);

    // 7. Get updated progress
    const progress = await this.contextManager.getProgress(userId);
    const updatedState = await this.contextManager.getState(userId);

    return {
      response: aiResponse,
      hasIS: hasIS,
      isRolePlayMode,
      tip: hasIS
        ? progress && progress.currentIndex < progress.totalTopics - 1
          ? '✅ 훌륭합니다! "다음 주제"라고 입력하면 다음으로 넘어갑니다.'
          : '✅ 모든 주제를 완료했습니다! 마크다운을 다운로드하세요.'
        : '💡 <IS>태그로 요약해야 다음 단계로 진행됩니다.',
      currentStep: updatedState?.stepCount || 0,
      progress: progress || undefined,
    };
  }

  /**
   * Generate role-play scenario for practical usage examples
   */
  private async generateRolePlayScenario(
    userId: string,
    userMessage: string,
  ): Promise<string> {
    const state = await this.contextManager.getState(userId);
    if (!state) {
      return '세션을 찾을 수 없습니다.';
    }

    const scenarioPrompt = [
      {
        role: 'system' as const,
        content: `당신은 Rust 프로그래밍 튜터입니다.

사용자가 "${state.currentTopic}" 개념을 실제로 언제, 어떻게 사용하는지 묻고 있습니다.

반드시 한국어로만 답변하세요. 중국어와 영어 문장은 금지입니다.

다음 형식으로 생생한 개발 상황 시나리오를 만들어주세요:

🎬 **상황**: [구체적인 개발 상황 설명]

👤 **등장인물**:
- [이름] ([역할]): [설명]
- [이름] ([역할]): [설명]

💬 **대화**:
[등장인물들 간의 자연스러운 대화 - 3-5번의 왕복]

💻 **코드 예제**:
\`\`\`rust
// 문제 상황
[코드]

// 해결 방법
[코드]
\`\`\`

🎯 **핵심**: [이 개념이 왜 필요한지, 어떻게 도움이 되는지 한 문장으로]`,
      },
      {
        role: 'user' as const,
        content: `"${state.currentTopic}"를 실제 프로젝트에서 어떻게 사용하는지 개발 시나리오로 보여줘.`,
      },
    ];

    try {
      const response = await this.qwen.chat(scenarioPrompt);
      return response;
    } catch (error) {
      console.error('Role-play scenario generation failed:', error);
      return '역할극 시나리오 생성 중 오류가 발생했습니다. 다시 시도해주세요.';
    }
  }
}
