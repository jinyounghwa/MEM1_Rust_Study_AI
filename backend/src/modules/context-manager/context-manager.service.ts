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
      content: `당신은 Rust 전문 튜터입니다.

⚠️ **KOREAN ONLY**: 반드시 한국어로만 답변하세요. 중국어, 영어 텍스트 금지. Rust 코드만 영어.

"${session.currentTopic}" 설명:
1. 개념 정의 (한 문장)
2. 코드 예시 2-3개
3. 주의할 점
4. <IS> 태그로 요약 유도

${previousSummary ? `\n이전 학습: ${previousSummary.split('\n').slice(2).join('\n')}` : ''}`,
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
    const rolePlayInstruction = session.rolePlayMode
      ? `\n[📢 실무자 모드 ON: 모든 설명은 "현업 개발자" 관점에서 실제 사용 사례 위주로 설명하세요.]`
      : '';

    // 1. CoT (Chain Of Thought) System Prompt
    const systemPrompt: QwenMessage = {
      role: 'system',
      content: `당신은 Rust 전문 튜터입니다.

⚠️ **CRITICAL: KOREAN ONLY (한국어만 사용)**
- 반드시 한국어로만 답변하세요
- 중국어, 일본어, 영어 텍스트는 절대 금지
- Rust 코드와 함수명, 키워드만 영어 사용 가능
- 예: "Option이란 Some과 None으로..." (O), "Option ，Some None" (X)

답변 구조:
1. **💡 개념 정의**: 한 문장으로 명확히 정의
2. **💻 코드 예시**: 실행 가능한 Rust 코드 (주석은 한국어)
3. **⚠️ 주의할 점**: 초보자가 자주 하는 실수
4. **✨ 핵심**: <IS> 태그로 요약 유도

학습자 반응:
- <IS>요약</IS> 포함 → "정확합니다!"라고 칭찬하고 ${
        session.allTopics.length > 1 &&
        session.currentTopicIndex < session.allTopics.length - 1
          ? `"다음 주제"`
          : `"완료"`
      }로 안내
- <IS> 미포함 → <IS> 태그 사용 요청

${rolePlayInstruction}
${previousSummary ? `\n\n${previousSummary}` : ''}`,
    };

    // 2. Short-term Memory (Recent Context)
    // Fetch all messages (including the current one just saved)
    const allMessages = await this.messageRepo.findBySessionId(userId);
    
    // Take the last 6 messages (3 turns) to maintain context
    const recentMessages = allMessages.slice(-6).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // If for some reason the DB save didn't happen or list is empty, ensure current message is there
    const hasCurrent = recentMessages.some(m => m.content === userMessage && m.role === 'user');
    if (!hasCurrent) {
        recentMessages.push({ role: 'user', content: userMessage });
    }

    return [systemPrompt, ...recentMessages];
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
