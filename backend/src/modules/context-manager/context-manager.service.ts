import { Injectable } from '@nestjs/common';
import {
  ConversationState,
  Message,
  QwenMessage,
} from './types/conversation.types';

@Injectable()
export class ContextManagerService {
  private sessions = new Map<string, ConversationState>();

  initSession(userId: string, topics: string | string[]): void {
    const topicArray = Array.isArray(topics) ? topics : [topics];

    this.sessions.set(userId, {
      currentIS: '',
      currentTopic: topicArray[0],
      allTopics: topicArray,
      currentTopicIndex: 0,
      topicISHistory: new Map(),
      conversationHistory: [],
      lastAIResponse: '',
      stepCount: 0,
      rolePlayMode: false,
    });
  }

  moveToNextTopic(userId: string): boolean {
    const state = this.sessions.get(userId);
    if (!state) throw new Error('세션을 찾을 수 없습니다.');

    if (state.currentIS) {
      state.topicISHistory.set(state.currentTopic, state.currentIS);
    }

    if (state.currentTopicIndex < state.allTopics.length - 1) {
      state.currentTopicIndex++;
      state.currentTopic = state.allTopics[state.currentTopicIndex];
      state.currentIS = '';
      return true;
    }

    return false;
  }

  getPreviousTopicsSummary(userId: string): string {
    const state = this.sessions.get(userId);
    if (!state || state.currentTopicIndex === 0) return '';

    let summary = '\n\n**📚 이전에 학습한 내용 (필수 참고):**\n';
    for (let i = 0; i < state.currentTopicIndex; i++) {
      const topic = state.allTopics[i];
      const is = state.topicISHistory.get(topic);
      if (is) {
        summary += `\n▪️ **${topic}**: ${is}`;
      }
    }

    // 현재 주제와 이전 주제의 연결고리 명시
    if (state.currentTopicIndex > 0) {
      const previousTopic = state.allTopics[state.currentTopicIndex - 1];
      const currentTopic = state.currentTopic;
      summary += `\n\n**🔗 주제 간 연결고리:**\n`;
      summary += `"${previousTopic}" → "${currentTopic}"\n`;
      summary += `이전 주제를 기초로 삼아 현재 주제를 설명하세요.`;
    }

    return summary;
  }

  toggleRolePlayMode(userId: string): boolean {
    const state = this.sessions.get(userId);
    if (!state) throw new Error('세션을 찾을 수 없습니다.');

    state.rolePlayMode = !state.rolePlayMode;
    return state.rolePlayMode;
  }

  getProgress(userId: string) {
    const state = this.sessions.get(userId);
    if (!state) return null;

    return {
      currentTopic: state.currentTopic,
      currentIndex: state.currentTopicIndex,
      totalTopics: state.allTopics.length,
      completedTopics: state.allTopics.slice(0, state.currentTopicIndex),
    };
  }

  buildInitialTopicPrompt(userId: string): QwenMessage[] {
    const state = this.sessions.get(userId);

    if (!state) {
      throw new Error('세션을 찾을 수 없습니다. 먼저 학습을 시작하세요.');
    }

    const previousSummary = this.getPreviousTopicsSummary(userId);

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

"${state.currentTopic}" 주제를 명확하게 설명하세요.
- 핵심 개념 중심 설명 (150-250단어)
- 실제 사용 사례 2-3개 포함
- 쉽고 이해하기 편한 한국어로 사용
${previousSummary ? `- 이전 학습 내용과 연결지어 설명:\n${previousSummary.split('\n').slice(2).join('\n')}` : ''}`,
    };

    const userMsg: QwenMessage = {
      role: 'user',
      content: `"${state.currentTopic}"를 설명해줘.`,
    };

    return [systemPrompt, userMsg];
  }

  buildPrompt(userId: string, userMessage: string): QwenMessage[] {
    const state = this.sessions.get(userId);

    if (!state) {
      throw new Error('세션을 찾을 수 없습니다. 먼저 학습을 시작하세요.');
    }

    const previousSummary = this.getPreviousTopicsSummary(userId);

    const progress =
      state.allTopics.length > 1
        ? `\n**학습 진행 상황**: ${state.currentTopicIndex + 1}/${state.allTopics.length} (${state.allTopics.join(' → ')})`
        : '';

    const rolePlayInstruction = state.rolePlayMode
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
     state.allTopics.length > 1 &&
     state.currentTopicIndex < state.allTopics.length - 1
       ? `"다음 주제로 진행하세요"`
       : `"완료! 축하합니다"`
   }
3. 부족하면: 구체적으로 설명하고 다시 요약하라고 하세요
4. <IS>가 없으면: "<IS>태그로 요약해주세요"라고 안내하세요
${rolePlayInstruction}${
  state.allTopics.length > 1 && previousSummary
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

    return [systemPrompt, userMsg];
  }

  extractAndSaveIS(userId: string, userMessage: string): boolean {
    const isMatch = userMessage.match(/<IS>([\s\S]*?)<\/IS>/i);

    const state = this.sessions.get(userId);
    if (!state) return false;

    if (isMatch) {
      state.currentIS = isMatch[1].trim();
      state.stepCount += 1;
    }

    state.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    return !!isMatch;
  }

  saveAIResponse(userId: string, response: string): void {
    const state = this.sessions.get(userId);
    if (!state) return;

    state.lastAIResponse = response;
    state.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });
  }

  getState(userId: string): ConversationState | undefined {
    return this.sessions.get(userId);
  }

  generateMarkdown(userId: string): string {
    const state = this.sessions.get(userId);

    if (!state) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    const isMultiObjective = state.allTopics.length > 1;
    let markdown = `# 🦀 Rust 학습 노트${isMultiObjective ? ' (Multi-Objective)' : ''}\n\n`;

    if (isMultiObjective) {
      markdown += `## 📚 학습 주제\n\n`;
      state.allTopics.forEach((topic, idx) => {
        const status =
          idx < state.currentTopicIndex
            ? '✅'
            : idx === state.currentTopicIndex
              ? '🔄'
              : '⏳';
        markdown += `${idx + 1}. ${status} ${topic}\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `**주제**: ${state.currentTopic}\n\n`;
    }

    markdown += `**생성 일시**: ${new Date().toLocaleString('ko-KR')}\n`;
    markdown += `**총 학습 단계**: ${state.stepCount}단계\n\n`;
    markdown += `---\n\n`;

    if (isMultiObjective) {
      state.allTopics.forEach((topic, topicIdx) => {
        markdown += `## 📖 주제 ${topicIdx + 1}: ${topic}\n\n`;

        const topicIS = state.topicISHistory.get(topic);
        if (topicIS) {
          markdown += `### ✅ 최종 이해 요약\n\n`;
          markdown += `<IS>${topicIS}</IS>\n\n`;
        }

        let stepNum = 1;
        for (let i = 0; i < state.conversationHistory.length; i++) {
          const msg = state.conversationHistory[i];

          if (msg.content.includes(topic)) {
            if (msg.role === 'user') {
              const hasIS = /<IS>([\s\S]*?)<\/IS>/i.test(msg.content);
              if (hasIS) {
                markdown += `#### Step ${stepNum}: 나의 이해\n\n`;
                markdown += `${msg.content}\n\n`;
              }
            } else if (msg.role === 'assistant') {
              markdown += `**AI 피드백**:\n\n${msg.content}\n\n`;
              stepNum++;
            }
          }
        }

        markdown += `---\n\n`;
      });
    } else {
      let stepNum = 1;
      for (let i = 0; i < state.conversationHistory.length; i++) {
        const msg = state.conversationHistory[i];

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

          if (i > 0 && state.conversationHistory[i - 1].role === 'user') {
            const prevHasIS = /<IS>([\s\S]*?)<\/IS>/i.test(
              state.conversationHistory[i - 1].content,
            );
            if (prevHasIS) stepNum++;
          }
        }
      }
    }

    markdown += `\n## ✅ 학습 완료!\n\n`;

    if (isMultiObjective) {
      markdown += `총 ${state.allTopics.length}개의 주제를 ${state.stepCount}단계로 나누어 학습했습니다.\n\n`;
      markdown += `**학습한 주제들의 연결고리**:\n`;
      state.allTopics.forEach((topic, idx) => {
        const is = state.topicISHistory.get(topic) || '(요약 없음)';
        markdown += `${idx + 1}. **${topic}**: ${is.substring(0, 100)}...\n`;
      });
    } else {
      markdown += `총 ${state.stepCount}단계의 학습을 완료했습니다.`;
    }

    markdown += `\n\n수고하셨습니다! 🎉\n`;

    return markdown;
  }
}
