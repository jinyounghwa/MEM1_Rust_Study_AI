import { Injectable } from '@nestjs/common';
import { ContextManagerService } from '../context-manager/context-manager.service';
import { QwenService } from '../qwen/qwen.service';

@Injectable()
export class RustLearnService {
  constructor(
    private contextManager: ContextManagerService,
    private qwen: QwenService,
  ) {}

  private isRolePlayTrigger(message: string): boolean {
    const triggers = ['어떻게', '언제', '예시', '실제', '어떻게 사용', '언제 쓰', '실제로', '개발에서', '프로젝트에서', '어떻게 해'];
    return triggers.some(trigger => message.includes(trigger));
  }

  async chat(userId: string, message: string) {
    // 1. IS 추출
    const hasIS = this.contextManager.extractAndSaveIS(userId, message);

    // 2. 역할극 모드 체크
    const state = this.contextManager.getState(userId);
    const isRolePlayMode = state?.rolePlayMode || false;
    const shouldGenerateScenario = isRolePlayMode && this.isRolePlayTrigger(message) && !hasIS;

    // 3. MEM1 방식 프롬프트 구성
    let prompt = this.contextManager.buildPrompt(userId, message);

    // 4. 역할극 시나리오가 필요하면 생성
    let aiResponse = '';
    if (shouldGenerateScenario) {
      aiResponse = await this.generateRolePlayScenario(userId, message);
    } else {
      // 4. Qwen 호출 (일반 응답)
      aiResponse = await this.qwen.chat(prompt);
    }

    // 5. 응답 저장
    this.contextManager.saveAIResponse(userId, aiResponse);

    // 6. 현재 상태 조회
    const updatedState = this.contextManager.getState(userId);
    const progress = this.contextManager.getProgress(userId);

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

  private async generateRolePlayScenario(userId: string, userMessage: string): Promise<string> {
    const state = this.contextManager.getState(userId);
    if (!state) return '세션을 찾을 수 없습니다.';

    const scenarioPrompt: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `당신은 Rust 프로그래밍 튜터입니다.

사용자가 "${state.currentTopic}" 개념을 실제로 언제, 어떻게 사용하는지 묻고 있습니다.

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

🎯 **핵심**: [이 개념이 왜 필요한지, 어떻게 도움이 되는지 한 문장으로]

반드시 한국어로만 작성하세요.`,
      },
      {
        role: 'user',
        content: `"${state.currentTopic}"를 실제 프로젝트에서 어떻게 사용하는지 개발 시나리오로 보여줘.`,
      },
    ];

    try {
      const response = await this.qwen.chat(scenarioPrompt);
      return response;
    } catch (error) {
      return '역할극 시나리오 생성 중 오류가 발생했습니다. 다시 시도해주세요.';
    }
  }
}
