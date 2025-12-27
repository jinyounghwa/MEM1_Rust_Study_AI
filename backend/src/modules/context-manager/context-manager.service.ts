import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../database/repositories/session.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { TopicISHistoryRepository } from '../database/repositories/topic-is-history.repository';
import {
  ConversationState,
  QwenMessage,
} from './types/conversation.types';
import { Session } from '../database/entities/session.entity';

@Injectable()
export class ContextManagerService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly messageRepo: MessageRepository,
    private readonly topicISRepo: TopicISHistoryRepository,
  ) {}

  /**
   * Initialize a new learning session
   */
  async initSession(
    userId: string,
    topics: string | string[],
  ): Promise<Session> {
    const topicArray = Array.isArray(topics) ? topics : [topics];
    const title =
      topicArray.length === 1
        ? topicArray[0]
        : `${topicArray[0]} 외 ${topicArray.length - 1}개`;

    return this.sessionRepo.save({
      id: userId,
      title,
      allTopics: topicArray,
      currentTopic: topicArray[0],
      currentTopicIndex: 0,
      currentIS: '',
      lastAIResponse: '',
      stepCount: 0,
      rolePlayMode: false,
    });
  }

  /**
   * Move to next topic and save current IS to history
   */
  async moveToNextTopic(userId: string): Promise<boolean> {
    const session = await this.sessionRepo.findOne(userId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    // Save current IS to topic_is_history
    if (session.currentIS) {
      await this.topicISRepo.save({
        sessionId: userId,
        topic: session.currentTopic,
        isSummary: session.currentIS,
      });
    }

    // Check if next topic exists
    if (session.currentTopicIndex < session.allTopics.length - 1) {
      const nextIndex = session.currentTopicIndex + 1;
      await this.sessionRepo.update(userId, {
        currentTopicIndex: nextIndex,
        currentTopic: session.allTopics[nextIndex],
        currentIS: '',
      });
      return true;
    }

    return false;
  }

  /**
   * Get previous topics' IS summaries for prompt building
   * MEM1 principle: Only IS summaries, no full conversation history
   */
  async getPreviousTopicsSummary(userId: string): Promise<string> {
    const session = await this.sessionRepo.findOne(userId);
    if (!session || session.currentTopicIndex === 0) {
      return '';
    }

    const topicHistories = await this.topicISRepo.findBySessionId(userId);
    if (topicHistories.length === 0) {
      return '';
    }

    let summary = '\n\n**📚 이전에 학습한 내용 (필수 참고):**\n';
    for (const history of topicHistories) {
      if (history.topic !== session.currentTopic) {
        summary += `\n▪️ **${history.topic}**: ${history.isSummary}`;
      }
    }

    // Add connection between topics
    if (session.currentTopicIndex > 0) {
      const previousTopic = session.allTopics[session.currentTopicIndex - 1];
      const currentTopic = session.currentTopic;
      summary += `\n\n**🔗 주제 간 연결고리:**\n`;
      summary += `"${previousTopic}" → "${currentTopic}"\n`;
      summary += `이전 주제를 기초로 삼아 현재 주제를 설명하세요.`;
    }

    return summary;
  }

  /**
   * Toggle role-play mode
   */
  async toggleRolePlayMode(userId: string): Promise<boolean> {
    const session = await this.sessionRepo.findOneLight(userId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    const newRolePlayMode = !session.rolePlayMode;
    await this.sessionRepo.update(userId, {
      rolePlayMode: newRolePlayMode,
    });

    return newRolePlayMode;
  }

  /**
   * Get current session progress
   */
  async getProgress(userId: string) {
    const session = await this.sessionRepo.findOneLight(userId);
    if (!session) return null;

    return {
      currentTopic: session.currentTopic,
      currentIndex: session.currentTopicIndex,
      totalTopics: session.allTopics.length,
      completedTopics: session.allTopics.slice(0, session.currentTopicIndex),
    };
  }

  /**
   * Build initial topic explanation prompt
   * MEM1 Principle: Only previous IS summaries, no full conversation history
   */
  async buildInitialTopicPrompt(userId: string): Promise<QwenMessage[]> {
    const session = await this.sessionRepo.findOne(userId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다. 먼저 학습을 시작하세요.');
    }

    const previousSummary = await this.getPreviousTopicsSummary(userId);

    const systemPrompt: QwenMessage = {
      role: 'system',
      content: `당신은 한국인을 위한 Rust 프로그래밍 튜터입니다.

📌 **언어 규칙 (매우 중요)**:
- ✅ 한국어로만 답변하세요
- ✅ Rust 관련 영문 키워드, 함수명, 변수명은 괜찮습니다 (예: Option, unwrap, match)
- ❌ 중국어 문자는 절대 금지입니다
- ❌ 영어 문장은 절대 금지입니다 (예: "For example", "In this case" 등)

부정적 예시 (하지 말 것):
❌ "这个概念很重要" (중국어)
❌ "The Option type is used for null safety" (영어 문장)
✅ "Option 타입은 값이 있을 수도, 없을 수도 있는 상황을 나타냅니다"

"${session.currentTopic}" 주제를 명확하게 설명하세요.
- 핵심 개념 중심 설명 (150-250단어)
- 실제 사용 사례 2-3개 포함
- 쉽고 이해하기 편한 한국어로 사용
${previousSummary ? `- 이전 학습 내용과 연결지어 설명:\n${previousSummary.split('\n').slice(2).join('\n')}` : ''}`,
    };

    const userMsg: QwenMessage = {
      role: 'user',
      content: `"${session.currentTopic}"를 설명해줘.`,
    };

    return [systemPrompt, userMsg];
  }

  /**
   * Build prompt for chat interaction
   * MEM1 Principle: Only previous IS summaries + current message, no conversation history
   */
  async buildPrompt(userId: string, userMessage: string): Promise<QwenMessage[]> {
    const session = await this.sessionRepo.findOne(userId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다. 먼저 학습을 시작하세요.');
    }

    const previousSummary = await this.getPreviousTopicsSummary(userId);

    const progress =
      session.allTopics.length > 1
        ? `\n**학습 진행 상황**: ${session.currentTopicIndex + 1}/${session.allTopics.length} (${session.allTopics.join(' → ')})`
        : '';

    const rolePlayInstruction = session.rolePlayMode
      ? `

**🎭 역할극 모드 활성화됨**

사용자가 "어떻게 사용해?", "언제 사용해?", "실제로 어떻게 쓰는지 예시 보여줘" 같은 질문을 하면:

1. **실제 개발 상황을 역할극으로 만들어주세요**
2. 등장인물 설정 (예: 주니어 개발자, 시니어 개발자)
3. 구체적인 대화 형식으로 상황 전개
4. 학습한 개념이 **왜 필요한지**, **어떻게 해결하는지** 보여주기
5. 반드시 실행 가능한 코드 예제 포함

예시 형식:
---
🎬 **상황**: API 서버 개발 중 널 포인터 에러로 서버가 다운됨

👤 **등장인물**:
- 민수 (주니어 개발자): Rust를 배우는 중
- 지연 (시니어 개발자): 3년 차 Rust 개발자

💬 **대화**:
민수: "아... 또 서버가 터졌어요 ㅠㅠ"
지연: "로그 좀 보자. 아, 이거 user.name이 None인데 unwrap() 쓴 거 때문이네."

💻 **코드 예제**:
\`\`\`rust
// 기존 코드 (문제)
let name = user.name.unwrap(); // 💥 panic!

// 개선 코드 (해결)
let name = user.name.unwrap_or("익명".to_string());
\`\`\`
---

이런 식으로 생생하게 만들어주세요!`
      : '';

    const systemPrompt: QwenMessage = {
      role: 'system',
      content: `당신은 한국인을 위한 Rust 프로그래밍 튜터입니다.

📌 **언어 규칙 (매우 중요)**:
- ✅ 한국어로만 답변하세요
- ✅ Rust 관련 영문 키워드, 함수명, 변수명은 괜찮습니다 (예: Option, Result, unwrap)
- ❌ 중국어 문자는 절대 금지입니다
- ❌ 중국어 또는 영어 문장은 절대 금지입니다

**핵심 규칙**:
1. 학생의 <IS>태그 내용을 평가하세요
2. 정확하면: 칭찬 + ${
     session.allTopics.length > 1 &&
     session.currentTopicIndex < session.allTopics.length - 1
       ? `"다음 주제로 진행하세요"`
       : `"완료! 축하합니다"`
   }
3. 부족하면: 구체적으로 설명하고 다시 요약하라고 하세요
4. <IS>가 없으면: "<IS>태그로 요약해주세요"라고 안내하세요
${rolePlayInstruction}${
  session.allTopics.length > 1 && previousSummary
    ? `
${previousSummary}

**중요한 지시사항**:
위의 "이전에 학습한 내용"과 "주제 간 연결고리"를 반드시 고려하세요.
학생의 답변을 평가할 때, 이전 주제와의 관계를 언급하며 통합적으로 설명하세요.`
    : ''
}`,
    };

    const userMsg: QwenMessage = {
      role: 'user',
      content: userMessage,
    };

    // ✅ MEM1 Principle: Only system prompt + current message (no conversation history)
    return [systemPrompt, userMsg];
  }

  /**
   * Extract and save IS from user message
   */
  async extractAndSaveIS(userId: string, userMessage: string): Promise<boolean> {
    const isMatch = userMessage.match(/<IS>([\s\S]*?)<\/IS>/i);

    if (isMatch) {
      const extractedIS = isMatch[1].trim();
      await this.sessionRepo.update(userId, {
        currentIS: extractedIS,
      });
      // Increment step count
      const session = await this.sessionRepo.findOneLight(userId);
      if (session) {
        await this.sessionRepo.update(userId, {
          stepCount: session.stepCount + 1,
        });
      }
    }

    return !!isMatch;
  }

  /**
   * Save AI response
   */
  async saveAIResponse(userId: string, response: string): Promise<void> {
    await this.sessionRepo.update(userId, {
      lastAIResponse: response,
    });
  }

  /**
   * Get current session state
   */
  async getState(userId: string): Promise<Session | null> {
    return this.sessionRepo.findOne(userId);
  }

  /**
   * Generate markdown export
   * Uses full conversation history from database
   */
  async generateMarkdown(userId: string): Promise<string> {
    const session = await this.sessionRepo.findOne(userId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    const isMultiObjective = session.allTopics.length > 1;
    let markdown = `# 🦀 Rust 학습 노트${isMultiObjective ? ' (Multi-Objective)' : ''}\n\n`;

    if (isMultiObjective) {
      markdown += `## 📚 학습 주제\n\n`;
      session.allTopics.forEach((topic, idx) => {
        const status =
          idx < session.currentTopicIndex
            ? '✅'
            : idx === session.currentTopicIndex
              ? '🔄'
              : '⏳';
        markdown += `${idx + 1}. ${status} ${topic}\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `**주제**: ${session.currentTopic}\n\n`;
    }

    markdown += `**생성 일시**: ${new Date().toLocaleString('ko-KR')}\n`;
    markdown += `**총 학습 단계**: ${session.stepCount}단계\n\n`;
    markdown += `---\n\n`;

    // Load all messages from database
    const messages = await this.messageRepo.findBySessionId(userId);

    let stepNum = 1;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === 'user') {
        const hasIS = /<IS>([\s\S]*?)<\/IS>/i.test(msg.content);

        if (hasIS) {
          markdown += `## 📝 Step ${stepNum}: 나의 이해\n\n`;
          markdown += `${msg.content}\n\n`;
        } else {
          markdown += `### 💬 질문/응답\n\n`;
          markdown += `${msg.content}\n\n`;
        }
      } else if (msg.role === 'assistant') {
        markdown += `### 🤖 AI 피드백\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += `---\n\n`;

        if (i > 0 && messages[i - 1].role === 'user') {
          const prevHasIS = /<IS>([\s\S]*?)<\/IS>/i.test(messages[i - 1].content);
          if (prevHasIS) stepNum++;
        }
      }
    }

    markdown += `\n## ✅ 학습 완료!\n\n`;

    if (isMultiObjective) {
      const topicHistories = await this.topicISRepo.findBySessionId(userId);
      markdown += `총 ${session.allTopics.length}개의 주제를 ${session.stepCount}단계로 나누어 학습했습니다.\n\n`;
      markdown += `**학습한 주제들의 연결고리**:\n`;
      session.allTopics.forEach((topic, idx) => {
        const history = topicHistories.find((h) => h.topic === topic);
        const is = history?.isSummary || '(요약 없음)';
        markdown += `${idx + 1}. **${topic}**: ${is.substring(0, 100)}...\n`;
      });
    } else {
      markdown += `총 ${session.stepCount}단계의 학습을 완료했습니다.`;
    }

    markdown += `\n\n수고하셨습니다! 🎉\n`;

    return markdown;
  }
}
