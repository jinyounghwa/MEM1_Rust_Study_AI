import { Injectable } from '@nestjs/common';
import { Response } from 'express';
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
   * Streaming chat logic
   */
  async chatStream(userId: string, message: string, res: Response) {
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

    // 4. Stream Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 5. Get AI response (Streaming)
    let aiFullResponse = '';

    if (shouldGenerateScenario) {
      // Role-play (using standard chat for now, streaming supported but prompt is fixed)
      // We can't easily stream the custom scenario prompt because qwen.chatStream takes messages array
      // Let's refactor generateRolePlayScenario to return messages or use chatStream directly
      // For now, we will wait for full response on scenario (rare case) or just use chatStream with scenario prompt
      // Let's copy logic from generateRolePlayScenario but use chatStream
      
      const scenarioPrompt = [
        {
          role: 'system' as const,
          content: `당신은 Rust 시니어 개발자(Team Lead)입니다.
사용자(주니어 개발자)가 "${state.currentTopic}" 개념에 대해 질문했습니다.

다음 형식으로 **실제 코드 리뷰** 또는 **트러블 슈팅** 상황극을 연출하세요:

🎬 **상황**: [프로덕션 코드에서 발생한 구체적인 문제 상황 설명]

👥 **등장인물**:
- 🧑‍💻 **나(주니어)**: 열정적이지만 실수를 한 개발자
- 👨‍🏫 **팀장(당신)**: 친절하지만 코드 품질에 엄격한 멘토

💬 **대화**:
(주니어가 짠 문제의 코드를 보여주며 시작합니다. 3~4번의 티키타카)
🧑‍💻: "팀장님, 이 코드에서 계속 에러가 나는데 왜 이러죠?"
👨‍🏫: [문제점 지적 및 개념 설명]
...

💻 **올바른 솔루션**:
\`\`\`rust
// ❌ 기존 문제 코드 (Before)
[버그가 있는 코드]

// ✅ 개선된 코드 (After)
[Best Practice가 적용된 코드]
\`\`\`

🎯 **팀장의 한마디**: [이 개념이 왜 중요한지 실무적 관점에서 조언]

*제약사항*: 한국어로 자연스럽게 대화하세요.`,
        },
        {
          role: 'user' as const,
          content: `"${state.currentTopic}"를 실제 프로젝트에서 어떻게 사용하는지 보여줘.`,
        },
      ];
      
       aiFullResponse = await this.qwen.chatStream(scenarioPrompt, (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      });

    } else {
      // Regular conversation
      const prompt = await this.contextManager.buildPrompt(userId, message);
      aiFullResponse = await this.qwen.chatStream(prompt, (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      });
    }

    // 6. Save AI response to database
    await this.messageRepo.save({
      sessionId: userId,
      role: 'assistant',
      content: aiFullResponse,
    });
    await this.contextManager.saveAIResponse(userId, aiFullResponse);

    // 7. Get updated progress and send done event
    const progress = await this.contextManager.getProgress(userId);
    const updatedState = await this.contextManager.getState(userId);

    const tip = hasIS
      ? progress && progress.currentIndex < progress.totalTopics - 1
        ? '✅ 훌륭합니다! "다음 주제"라고 입력하면 다음으로 넘어갑니다.'
        : '✅ 모든 주제를 완료했습니다! 마크다운을 다운로드하세요.'
      : '💡 <IS>태그로 요약해야 다음 단계로 진행됩니다.';

    const doneData = {
      type: 'done',
      hasIS,
      tip,
      currentStep: updatedState?.stepCount || 0,
      progress: progress || undefined,
      isRolePlayMode,
    };

    res.write(`data: ${JSON.stringify(doneData)}\n\n`);
    res.end();
  }

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
        content: `당신은 Rust 시니어 개발자(Team Lead)입니다.
사용자(주니어 개발자)가 "${state.currentTopic}" 개념에 대해 질문했습니다.

다음 형식으로 **실제 코드 리뷰** 또는 **트러블 슈팅** 상황극을 연출하세요:

🎬 **상황**: [프로덕션 코드에서 발생한 구체적인 문제 상황 설명]

👥 **등장인물**:
- 🧑‍💻 **나(주니어)**: 열정적이지만 실수를 한 개발자
- 👨‍🏫 **팀장(당신)**: 친절하지만 코드 품질에 엄격한 멘토

💬 **대화**:
(주니어가 짠 문제의 코드를 보여주며 시작합니다. 3~4번의 티키타카)
🧑‍💻: "팀장님, 이 코드에서 계속 에러가 나는데 왜 이러죠?"
👨‍🏫: [문제점 지적 및 개념 설명]
...

💻 **올바른 솔루션**:
\`\`\`rust
// ❌ 기존 문제 코드 (Before)
[버그가 있는 코드]

// ✅ 개선된 코드 (After)
[Best Practice가 적용된 코드]
\`\`\`

🎯 **팀장의 한마디**: [이 개념이 왜 중요한지 실무적 관점에서 조언]

*제약사항*: 한국어로 자연스럽게 대화하세요.`,
      },
      {
        role: 'user' as const,
        content: `"${state.currentTopic}"를 실제 프로젝트에서 어떻게 사용하는지 보여줘.`,
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
