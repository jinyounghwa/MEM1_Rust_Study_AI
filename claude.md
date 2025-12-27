# RustLearn-MEM1 프로젝트 구현 가이드

## 📋 프로젝트 개요

**목표**: MEM1 논문의 메모리 관리 기법을 활용한 Rust 학습 전용 AI 서비스 구축

**핵심 기능**:
- 사용자가 `<IS>` 태그로 학습 내용을 요약해야만 다음 단계 진행
- 이전 대화 컨텍스트를 과감히 제거하여 일정한 메모리 사용 (MEM1 방식)
- **다중 목표 기반 학습 (Multi-Objective Task Composition)**: 연관된 여러 주제를 조합하여 점진적 학습
- **역할극 기반 실전 예제 생성**: "어떻게 사용?", "언제 사용?" 질문에 실제 개발 상황 시뮬레이션으로 답변
- 학습 과정을 마크다운 파일로 자동 생성
- Qwen 2.5 7B 로컬 LLM 활용

**MEM1 논문 주요 개념 구현**:
1. ✅ **Constant Memory**: 대화가 길어져도 메모리 사용량 일정
2. ✅ **Internal State (IS)**: 요약을 통한 메모리 압축
3. ✅ **Multi-Objective Composition**: 여러 주제를 엮어서 장기 학습

---

## 🏗️ 기술 스택

- **Backend**: NestJS (TypeScript)
- **Frontend**: Next.js 16+ (React, TypeScript)
- **LLM**: Qwen 2.5 7B (via Ollama)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks

---

## 📁 프로젝트 구조

```
rustlearn-mem1/
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── context-manager/
│   │   │   │   ├── context-manager.service.ts
│   │   │   │   ├── context-manager.module.ts
│   │   │   │   └── types/
│   │   │   │       └── conversation.types.ts
│   │   │   ├── qwen/
│   │   │   │   ├── qwen.service.ts
│   │   │   │   └── qwen.module.ts
│   │   │   └── rust-learn/
│   │   │       ├── rust-learn.controller.ts
│   │   │       ├── rust-learn.service.ts
│   │   │       └── rust-learn.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                   # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx
    │   │   └── layout.tsx
    │   ├── components/
    │   │   ├── ChatInterface.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── InputArea.tsx
    │   │   └── LoadingSpinner.tsx
    │   └── lib/
    │       └── api.ts
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## 🔧 구현 단계

### Phase 1: Backend 구축

#### 1.1 NestJS 프로젝트 초기화

```bash
# 백엔드 디렉토리 생성 및 NestJS CLI 설치
mkdir -p rustlearn-mem1/backend
cd rustlearn-mem1/backend
npm init -y
npm install -g @nestjs/cli
nest new . --skip-git
npm install axios
```

#### 1.2 타입 정의 파일 생성

**파일**: `backend/src/modules/context-manager/types/conversation.types.ts`

```typescript
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationState {
  currentIS: string;          // 현재 사용자의 Internal State (요약)
  currentTopic: string;        // 현재 학습 주제
  allTopics: string[];         // 전체 학습 주제 목록 (Multi-Objective)
  currentTopicIndex: number;   // 현재 진행 중인 주제 인덱스
  topicISHistory: Map<string, string>;  // 각 주제별 IS 기록
  conversationHistory: Message[];  // 전체 대화 기록 (마크다운 생성용)
  lastAIResponse: string;
  stepCount: number;          // 학습 단계 카운트
  rolePlayMode: boolean;      // 역할극 모드 활성화 여부
  currentScenario?: RolePlayScenario;  // 현재 진행 중인 시나리오
}

export interface ChatResponse {
  response: string;
  hasIS: boolean;
  tip: string;
  currentStep: number;
  scenario?: RolePlayScenario;  // 생성된 시나리오 (있는 경우)
  progress?: {                  // Multi-Objective 진행 상황
    currentTopic: string;
    currentIndex: number;
    totalTopics: number;
    completedTopics: string[];
  };
}

export interface MarkdownExport {
  content: string;
  filename: string;
}

export interface RolePlayScenario {
  situation: string;          // 상황 설명
  characters: {               // 등장인물
    name: string;
    role: string;
    description: string;
  }[];
  dialogue: {                 // 대화 내용
    speaker: string;
    message: string;
    codeExample?: string;     // 코드 예제 (선택)
  }[];
  problem: string;            // 발생한 문제
  solution: string;           // 학습한 개념으로 해결하는 방법
}
```

#### 1.3 Context Manager Service 구현

**파일**: `backend/src/modules/context-manager/context-manager.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConversationState, Message } from './types/conversation.types';

@Injectable()
export class ContextManagerService {
  private sessions = new Map<string, ConversationState>();

  /**
   * 새 학습 세션 초기화
   * @param topics - 단일 주제 또는 여러 주제 배열
   */
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
      rolePlayMode: false
    });
  }

  /**
   * 다음 주제로 이동
   */
  moveToNextTopic(userId: string): boolean {
    const state = this.sessions.get(userId);
    if (!state) throw new Error('세션을 찾을 수 없습니다.');

    // 현재 주제의 IS 저장
    if (state.currentIS) {
      state.topicISHistory.set(state.currentTopic, state.currentIS);
    }

    // 다음 주제가 있는지 확인
    if (state.currentTopicIndex < state.allTopics.length - 1) {
      state.currentTopicIndex++;
      state.currentTopic = state.allTopics[state.currentTopicIndex];
      state.currentIS = '';  // 새 주제는 IS 초기화
      return true;
    }

    return false;  // 모든 주제 완료
  }

  /**
   * 이전 주제들의 IS 요약 가져오기
   */
  getPreviousTopicsSummary(userId: string): string {
    const state = this.sessions.get(userId);
    if (!state || state.currentTopicIndex === 0) return '';

    let summary = '\n\n**이전에 학습한 내용 요약:**\n';
    for (let i = 0; i < state.currentTopicIndex; i++) {
      const topic = state.allTopics[i];
      const is = state.topicISHistory.get(topic);
      if (is) {
        summary += `\n- ${topic}: ${is}`;
      }
    }
    return summary;
  }

  /**
   * 역할극 모드 토글
   */
  toggleRolePlayMode(userId: string): boolean {
    const state = this.sessions.get(userId);
    if (!state) throw new Error('세션을 찾을 수 없습니다.');
    
    state.rolePlayMode = !state.rolePlayMode;
    return state.rolePlayMode;
  }

  /**
   * 역할극 시나리오 저장
   */
  saveScenario(userId: string, scenario: any): void {
    const state = this.sessions.get(userId);
    if (!state) throw new Error('세션을 찾을 수 없습니다.');
    
    state.currentScenario = scenario;
  }

  /**
   * 학습 진행 상황 조회
   */
  getProgress(userId: string) {
    const state = this.sessions.get(userId);
    if (!state) return null;

    return {
      currentTopic: state.currentTopic,
      currentIndex: state.currentTopicIndex,
      totalTopics: state.allTopics.length,
      completedTopics: state.allTopics.slice(0, state.currentTopicIndex)
    };
  }

  /**
   * MEM1 방식의 프롬프트 구성
   * - 이전 대화는 모두 버리고
   * - System Prompt + 현재 IS 상태 + 이전 주제 요약 + 현재 메시지만 전달
   */
  buildPrompt(userId: string, userMessage: string): Message[] {
    const state = this.sessions.get(userId);
    
    if (!state) {
      throw new Error('세션을 찾을 수 없습니다. 먼저 학습을 시작하세요.');
    }

    // 이전 주제들의 요약 가져오기 (Multi-Objective)
    const previousSummary = this.getPreviousTopicsSummary(userId);

    // 진행 상황
    const progress = state.allTopics.length > 1 
      ? `\n**학습 진행 상황**: ${state.currentTopicIndex + 1}/${state.allTopics.length} (${state.allTopics.join(' → ')})`
      : '';

    // 역할극 모드용 시스템 프롬프트
    const rolePlayInstruction = state.rolePlayMode ? `

**🎭 역할극 모드 활성화됨**

사용자가 "어떻게 사용해?", "언제 사용해?", "실제로 어떻게 쓰는지 예시 보여줘" 같은 질문을 하면:

1. **실제 개발 상황을 역할극으로 만들어주세요**
2. 등장인물 설정 (예: 주니어 개발자, 시니어 개발자, 동료)
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
민수: "그럼 어떻게 해야 해요?"
지연: "Option 타입은 이렇게 처리하는 거야."

\`\`\`rust
// 기존 코드 (문제)
let name = user.name.unwrap(); // 💥 panic!

// 개선 코드 (해결)
let name = user.name.unwrap_or("익명".to_string());
\`\`\`
---

이런 식으로 생생하게 만들어주세요!` : '';

    const systemPrompt: Message = {
      role: 'system',
      content: `당신은 친절하고 체계적인 Rust 프로그래밍 튜터입니다.

**핵심 규칙** (절대 어기지 마세요):
1. 학생이 <IS>태그 안에 학습 내용을 요약하면, 그 이해도를 면밀히 평가하세요.
2. <IS> 내용이 정확하고 충분하면:
   - 진심으로 칭찬해주세요
   - ${state.allTopics.length > 1 && state.currentTopicIndex < state.allTopics.length - 1 
     ? '다음 주제(' + state.allTopics[state.currentTopicIndex + 1] + ')로 넘어가도 좋다고 안내하세요'
     : '학습이 완료되었다고 축하해주세요'}
3. <IS> 내용이 부족하거나 틀렸으면:
   - 어떤 부분이 부족한지 구체적으로 설명하세요
   - 다시 요약하도록 유도하세요
4. <IS>가 없으면:
   - 절대 다음 진도로 나가지 마세요
   - "<IS>태그로 요약해주셔야 다음 단계로 넘어갈 수 있습니다" 라고 안내하세요

**현재 학습 상황**:
- 주제: ${state.currentTopic}${progress}
- 학생의 현재 이해 상태: ${state.currentIS || '(아직 요약하지 않음)'}
- 진행 단계: ${state.stepCount}
${previousSummary}
${rolePlayInstruction}

${state.allTopics.length > 1 ? `
**중요**: 여러 주제를 순차적으로 학습하고 있습니다. 
이전 주제(${state.allTopics.slice(0, state.currentTopicIndex).join(', ')})에서 배운 내용을 
현재 주제와 연결지어 설명해주세요.
` : ''}

학생이 스스로 생각하고 요약할 수 있도록 도와주세요.`,
      timestamp: new Date()
    };

    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // MEM1 핵심: 과거 대화 제거, IS + 이전 주제 요약 + 현재만 유지
    return [systemPrompt, userMsg];
  }

  /**
   * 사용자 메시지에서 <IS> 태그 추출 및 저장
   */
  extractAndSaveIS(userId: string, userMessage: string): boolean {
    const isMatch = userMessage.match(/<IS>([\s\S]*?)<\/IS>/i);
    
    if (isMatch) {
      const state = this.sessions.get(userId);
      state.currentIS = isMatch[1].trim();
      state.stepCount += 1;
      
      // 전체 대화 기록에 추가 (마크다운 생성용)
      state.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });
      
      return true;
    }
    
    // IS 태그가 없어도 일단 기록은 해둠
    const state = this.sessions.get(userId);
    state.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    return false;
  }

  /**
   * AI 응답 저장
   */
  saveAIResponse(userId: string, response: string): void {
    const state = this.sessions.get(userId);
    state.lastAIResponse = response;
    state.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
  }

  /**
   * 현재 상태 조회
   */
  getState(userId: string): ConversationState | undefined {
    return this.sessions.get(userId);
  }

  /**
   * 마크다운 파일 생성
   */
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
        const status = idx < state.currentTopicIndex ? '✅' : idx === state.currentTopicIndex ? '🔄' : '⏳';
        markdown += `${idx + 1}. ${status} ${topic}\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `**주제**: ${state.currentTopic}\n\n`;
    }

    markdown += `**생성 일시**: ${new Date().toLocaleString('ko-KR')}\n`;
    markdown += `**총 학습 단계**: ${state.stepCount}단계\n\n`;
    markdown += `---\n\n`;

    // Multi-Objective인 경우 주제별로 그룹화
    if (isMultiObjective) {
      state.allTopics.forEach((topic, topicIdx) => {
        markdown += `## 📖 주제 ${topicIdx + 1}: ${topic}\n\n`;
        
        // 해당 주제의 IS가 있으면 표시
        const topicIS = state.topicISHistory.get(topic);
        if (topicIS) {
          markdown += `### ✅ 최종 이해 요약\n\n`;
          markdown += `<IS>${topicIS}</IS>\n\n`;
        }

        // 해당 주제와 관련된 대화 추출 (간단한 버전)
        let stepNum = 1;
        for (let i = 0; i < state.conversationHistory.length; i++) {
          const msg = state.conversationHistory[i];
          
          // 주제 전환 마커가 있는지 확인 (실제로는 더 정교한 로직 필요)
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
      // 단일 주제인 경우 기존 방식
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
          
          if (i > 0 && state.conversationHistory[i-1].role === 'user') {
            const prevHasIS = /<IS>([\s\S]*?)<\/IS>/i.test(state.conversationHistory[i-1].content);
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
  } = 1;
    for (let i = 0; i < state.conversationHistory.length; i++) {
      const msg = state.conversationHistory[i];
      
      if (msg.role === 'user') {
        // IS 태그가 있는지 확인
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
        
        // IS가 포함된 사용자 메시지 다음의 AI 응답일 경우 스텝 증가
        if (i > 0 && state.conversationHistory[i-1].role === 'user') {
          const prevHasIS = /<IS>([\s\S]*?)<\/IS>/i.test(state.conversationHistory[i-1].content);
          if (prevHasIS) stepNum++;
        }
      }
    }

    markdown += `\n## ✅ 학습 완료!\n\n`;
    markdown += `총 ${state.stepCount}단계의 학습을 완료했습니다. 수고하셨습니다! 🎉\n`;

    return markdown;
  }
}
```

#### 1.4 Qwen Service 구현

**파일**: `backend/src/modules/qwen/qwen.service.ts`

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

interface QwenMessage {
  role: string;
  content: string;
}

interface QwenResponse {
  message: {
    content: string;
  };
}

@Injectable()
export class QwenService {
  private readonly ollamaUrl = 'http://localhost:11434/api/chat';
  private readonly model = 'qwen2.5:7b';

  /**
   * Qwen 모델과 대화
   */
  async chat(messages: QwenMessage[]): Promise<string> {
    try {
      const response = await axios.post<QwenResponse>(
        this.ollamaUrl,
        {
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 1000
          }
        },
        {
          timeout: 60000  // 60초 타임아웃
        }
      );

      return response.data.message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
        throw new HttpException(
          `Qwen API 오류: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * Ollama 서버 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get('http://localhost:11434/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 1.5 Controller 구현

**파일**: `backend/src/modules/rust-learn/rust-learn.controller.ts`

```typescript
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Res, 
  HttpStatus,
  HttpException 
} from '@nestjs/common';
import { Response } from 'express';
import { ContextManagerService } from '../context-manager/context-manager.service';
import { QwenService } from '../qwen/qwen.service';
import { ChatResponse } from '../context-manager/types/conversation.types';

@Controller('api/rust-learn')
export class RustLearnController {
  constructor(
    private contextManager: ContextManagerService,
    private qwen: QwenService
  ) {}

  /**
   * 학습 시작
   */
  @Post('start')
  startLearning(@Body() body: { userId: string; topics: string | string[] }) {
    const { userId, topics } = body;
    
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    const isMultiObjective = topicsArray.length > 1;
    
    this.contextManager.initSession(userId, topicsArray);
    
    return {
      success: true,
      message: isMultiObjective 
        ? `"${topicsArray.join(' → ')}" 순서로 학습을 시작합니다!`
        : `"${topicsArray[0]}" 학습을 시작합니다!`,
      instruction: 'AI의 설명을 듣고 <IS>여기에 요약</IS> 형식으로 작성해주세요.',
      isMultiObjective,
      totalTopics: topicsArray.length,
      userId
    };
  }

  /**
   * 대화 진행
   */
  @Post('chat')
  async chat(@Body() body: { userId: string; message: string }): Promise<ChatResponse> {
    const { userId, message } = body;

    try {
      // 1. IS 추출 시도
      const hasIS = this.contextManager.extractAndSaveIS(userId, message);

      // 2. MEM1 방식으로 프롬프트 구성
      const prompt = this.contextManager.buildPrompt(userId, message);

      // 3. Qwen 호출
      const aiResponse = await this.qwen.chat(prompt);

      // 4. 응답 저장
      this.contextManager.saveAIResponse(userId, aiResponse);

      // 5. 현재 상태 조회
      const state = this.contextManager.getState(userId);
      const progress = this.contextManager.getProgress(userId);

      // 6. IS가 제출되었고 AI가 칭찬했으면 다음 주제로 이동 가능
      let movedToNext = false;
      let nextTopicMessage = '';
      
      if (hasIS && aiResponse.includes('다음') && progress) {
        // 사용자가 "다음 주제" 같은 말을 하면 실제로 이동
        if (message.toLowerCase().includes('다음')) {
          movedToNext = this.contextManager.moveToNextTopic(userId);
          if (movedToNext) {
            const newProgress = this.contextManager.getProgress(userId);
            nextTopicMessage = `\n\n✨ ${newProgress.currentTopic} 주제로 넘어갑니다!`;
          }
        }
      }

      return {
        response: aiResponse + nextTopicMessage,
        hasIS: hasIS,
        tip: hasIS 
          ? (progress && progress.currentIndex < progress.totalTopics - 1
              ? '✅ 훌륭합니다! "다음 주제"라고 입력하면 다음으로 넘어갑니다.'
              : '✅ 모든 주제를 완료했습니다! 마크다운을 다운로드하세요.')
          : '💡 <IS>태그로 요약해야 다음 단계로 진행됩니다.',
        currentStep: state?.stepCount || 0,
        progress: progress || undefined
      };
    } catch (error) {
      throw new HttpException(
        error.message || '대화 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 마크다운 파일 다운로드
   */
  @Get('export/:userId')
  async exportMarkdown(@Param('userId') userId: string, @Res() res: Response) {
    try {
      const markdown = this.contextManager.generateMarkdown(userId);
      const state = this.contextManager.getState(userId);
      
      const filename = `rust-study-${state.currentTopic}-${Date.now()}.md`;
      
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(HttpStatus.OK).send(markdown);
    } catch (error) {
      throw new HttpException(
        error.message || '마크다운 생성 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR
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
      timestamp: new Date().toISOString()
    };
  }
}
```

#### 1.6 Module 파일들

**파일**: `backend/src/modules/context-manager/context-manager.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ContextManagerService } from './context-manager.service';

@Module({
  providers: [ContextManagerService],
  exports: [ContextManagerService]
})
export class ContextManagerModule {}
```

**파일**: `backend/src/modules/qwen/qwen.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { QwenService } from './qwen.service';

@Module({
  providers: [QwenService],
  exports: [QwenService]
})
export class QwenModule {}
```

**파일**: `backend/src/modules/rust-learn/rust-learn.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RustLearnController } from './rust-learn.controller';
import { ContextManagerModule } from '../context-manager/context-manager.module';
import { QwenModule } from '../qwen/qwen.module';

@Module({
  imports: [ContextManagerModule, QwenModule],
  controllers: [RustLearnController]
})
export class RustLearnModule {}
```

**파일**: `backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RustLearnModule } from './modules/rust-learn/rust-learn.module';

@Module({
  imports: [RustLearnModule],
})
export class AppModule {}
```

**파일**: `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS 활성화
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true
  });
  
  await app.listen(3001);
  console.log('🚀 Backend running on http://localhost:3001');
}
bootstrap();
```

---

### Phase 2: Frontend 구축

#### 2.1 Next.js 프로젝트 초기화

```bash
cd rustlearn-mem1
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install axios
```

#### 2.2 API 클라이언트

**파일**: `frontend/src/lib/api.ts`

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/rust-learn';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  hasIS: boolean;
  tip: string;
  currentStep: number;
}

export const api = {
  async startLearning(userId: string, topics: string | string[]) {
    const response = await axios.post(`${API_BASE}/start`, { userId, topics });
    return response.data;
  },

  async sendMessage(userId: string, message: string): Promise<ChatResponse> {
    const response = await axios.post(`${API_BASE}/chat`, { userId, message });
    return response.data;
  },

  getExportUrl(userId: string): string {
    return `${API_BASE}/export/${userId}`;
  },

  async checkHealth() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};
```

#### 2.3 로딩 스피너 컴포넌트

**파일**: `frontend/src/components/LoadingSpinner.tsx`

```typescript
'use client';

export default function LoadingSpinner({ message = '생성 중...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-600 font-medium animate-pulse">{message}</p>
    </div>
  );
}
```

#### 2.4 메시지 버블 컴포넌트

**파일**: `frontend/src/components/MessageBubble.tsx`

```typescript
'use client';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}
```

#### 2.5 입력 영역 컴포넌트

**파일**: `frontend/src/components/InputArea.tsx`

```typescript
'use client';

import { useState } from 'react';

interface InputAreaProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function InputArea({ onSend, disabled }: InputAreaProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertISTag = () => {
    setInput(prev => `${prev}<IS>\n\n</IS>`);
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex gap-2 mb-2">
        <button
          onClick={insertISTag}
          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
          disabled={disabled}
        >
          📝 &lt;IS&gt; 태그 삽입
        </button>
      </div>
      
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈)"
          className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          전송
        </button>
      </div>
    </div>
  );
}
```

#### 2.6 채팅 인터페이스 컴포넌트

**파일**: `frontend/src/components/ChatInterface.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import LoadingSpinner from './LoadingSpinner';
import { api, ChatMessage } from '@/lib/api';

export default function ChatInterface() {
  const [userId] = useState(() => `user-${Date.now()}`);
  const [topics, setTopics] = useState<string[]>(['']);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tip, setTip] = useState('');
  const [stepCount, setStepCount] = useState(0);
  const [progress, setProgress] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addTopic = () => {
    if (topics.length < 5) {  // 최대 5개
      setTopics([...topics, '']);
    }
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleStart = async () => {
    const validTopics = topics.filter(t => t.trim());
    if (validTopics.length === 0) return;
    
    setLoading(true);
    try {
      const topicsParam = validTopics.length === 1 ? validTopics[0] : validTopics;
      const result = await api.startLearning(userId, topicsParam);
      setStarted(true);
      setTip(result.instruction);
      
      if (result.isMultiObjective) {
        setProgress({
          currentTopic: validTopics[0],
          currentIndex: 0,
          totalTopics: validTopics.length,
          completedTopics: []
        });
      }
    } catch (error) {
      alert('학습 시작 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setLoading(true);
    setTip('');

    try {
      const response = await api.sendMessage(userId, message);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      setTip(response.tip);
      setStepCount(response.currentStep);
      
      // Progress 업데이트
      if (response.progress) {
        setProgress(response.progress);
      }
    } catch (error) {
      alert('메시지 전송 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    
    // 스피너를 보여주기 위해 약간의 지연
    setTimeout(() => {
      window.location.href = api.getExportUrl(userId);
      setTimeout(() => setExporting(false), 1000);
    }, 500);
  };

  if (exporting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="마크다운 파일을 생성하는 중입니다..." />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            🦀 RustLearn-MEM1
          </h1>
          <p className="text-gray-600 mb-6 text-center text-sm">
            MEM1 방식으로 Rust를 학습하세요
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  학습 주제를 입력하세요 {topics.length > 1 && `(Multi-Objective: ${topics.length}개)`}
                </label>
                {topics.length < 5 && (
                  <button
                    onClick={addTopic}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 주제 추가
                  </button>
                )}
              </div>
              
              {topics.map((topic, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <span className="flex items-center justify-center w-8 h-10 bg-gray-100 rounded text-gray-600 font-medium">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                    placeholder={index === 0 ? "예: Option 타입" : "예: Result 타입"}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={handleStart}
              disabled={topics.every(t => !t.trim()) || loading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition font-medium"
            >
              {loading ? '시작 중...' : '학습 시작'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              💡 <strong>학습 방법:</strong> AI의 설명을 듣고 <code>&lt;IS&gt;</code> 태그 안에 
              내용을 요약해야 다음 단계로 진행됩니다.
            </p>
            {topics.length > 1 && (
              <p className="text-sm text-yellow-800 mt-2">
                🎯 <strong>Multi-Objective 모드:</strong> {topics.length}개의 주제를 순차적으로 학습하며, 
                이전 주제와 연결지어 이해해야 합니다.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              🦀 Rust 학습{progress && progress.totalTopics > 1 ? ' (Multi-Objective)' : ''}
            </h1>
            {progress && progress.totalTopics > 1 ? (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">진행:</span>
                  {progress.completedTopics.map((topic: string) => (
                    <span key={topic} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      ✅ {topic}
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    🔄 {progress.currentTopic}
                  </span>
                  <span className="text-gray-400 text-xs">
                    ({progress.currentIndex + 1}/{progress.totalTopics})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                주제: {progress?.currentTopic || topics[0]} | 단계: {stepCount}
              </p>
            )}
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
          >
            <span>📥</span>
            마크다운 다운로드
          </button>
        </div>
      </div>

      {/* Tip Bar */}
      {tip && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <p className="text-sm text-blue-800">{tip}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} role={msg.role} content={msg.content} />
        ))}
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <LoadingSpinner message="AI가 응답하는 중..." />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputArea onSend={handleSendMessage} disabled={loading} />
    </div>
  );
}
```

#### 2.7 메인 페이지

**파일**: `frontend/src/app/page.tsx`

```typescript
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return <ChatInterface />;
}
```

**파일**: `frontend/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RustLearn-MEM1',
  description: 'MEM1 방식의 Rust 학습 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

---

## 🚀 실행 방법

### 1. Ollama 실행

```bash
# Qwen 모델이 설치되어 있는지 확인
ollama list

# Ollama 서버 실행 (보통 자동 실행됨)
ollama serve
```

### 2. Backend 실행

```bash
cd backend
npm install
npm run start:dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

---

## 🎯 사용 시나리오

1. **학습 시작**: "Option 타입" 입력 → 시작
2. **AI 설명 듣기**: AI가 Option에 대해 설명
3. **요약 작성**: 
   ```
   <IS>
   Option은 값이 있을 수도, 없을 수도 있는 상황을 안전하게 표현하는 타입이다.
   Some(T)와 None 두 가지 variant가 있다.
   </IS>
   ```
4. **피드백 받기**: AI가 요약을 평가
5. **반복**: 다음 주제로 진행
6. **다운로드**: 마크다운 파일로 학습 내용 저장

---

## 🎯 사용 시나리오

### 시나리오 1: Single-Objective 학습 (기본)

**상황**: Rust의 Option 타입을 처음 배우는 초급자

1. **학습 시작**: "Option 타입" 입력 → 시작
2. **AI 설명 듣기**: AI가 Option에 대해 설명
3. **요약 작성**: 
   ```
   <IS>
   Option은 값이 있을 수도, 없을 수도 있는 상황을 안전하게 표현하는 타입이다.
   Some(T)와 None 두 가지 variant가 있다.
   </IS>
   ```
4. **피드백 받기**: AI가 요약을 평가
5. **역할극 요청**: "실제로 어떻게 쓰는지 예시 보여줘"
6. **반복**: 다음 개념으로 진행
7. **다운로드**: 마크다운 파일로 학습 내용 저장

---

### 시나리오 2: Multi-Objective 학습 (연결된 개념)

**상황**: 에러 처리 관련 개념을 체계적으로 학습하고 싶은 중급자

**학습 주제 설정**:
1. Option 타입
2. Result 타입  
3. ? 연산자
4. 커스텀 에러 타입

**학습 흐름**:

```
📚 Step 1: Option 타입 학습
AI: "Option은 값이 있거나 없을 수 있는 상황을 표현합니다..."
학생: <IS>Option은 None과 Some으로 널 안전성을 보장한다</IS>
AI: "잘했어요! 이제 Result 타입으로 넘어가볼까요?"

학생: "다음 주제"

📚 Step 2: Result 타입 학습
AI: "아까 배운 Option은 값의 유무만 표현했죠. 
     Result는 성공(Ok)과 실패(Err)를 모두 표현할 수 있어요..."
학생: <IS>Result<T, E>는 성공 시 Ok(T), 실패 시 Err(E)를 반환한다. 
      Option보다 에러 정보를 담을 수 있다</IS>

학생: "다음 주제"

📚 Step 3: ? 연산자 학습
AI: "Option과 Result를 매번 match로 처리하면 코드가 길어지죠.
     ? 연산자를 사용하면..."
     
... (계속)
```

**핵심**: 이전 주제(Option, Result)의 이해를 바탕으로 ? 연산자를 학습하므로, AI가 자동으로 연결해서 설명합니다.

---

### 시나리오 3: 역할극 모드 활용

**상황**: 개념은 이해했는데 "실무에서 언제 쓰는지" 궁금한 학생

**사용자 입력**:
```
Option 타입에 대해서는 이해했어. 
그런데 실제 프로젝트에서 언제 쓰는지 모르겠어. 예시 보여줘.
```

**AI 응답 (역할극 모드)**:
```
🎬 **상황**: 스타트업에서 유저 프로필 API 개발 중

👤 **등장인물**:
- 준호 (백엔드 개발자, Rust 1개월 차): API 개발 담당
- 수진 (리드 개발자, Rust 3년 차): 코드 리뷰어

💬 **대화**:
준호: "수진님, 제가 만든 API 좀 봐주시겠어요?"

```rust
fn get_user_nickname(user_id: u32) -> String {
    let user = database.find_user(user_id);
    user.nickname  // ❌ 컴파일 에러!
}
```

수진: "아, 모든 유저가 닉네임을 설정한 건 아니잖아. 
      find_user가 Option<User>를 반환하지?"

준호: "아... 그럼 어떻게 해야 하죠?"

수진: "Option으로 처리해봐."

```rust
fn get_user_nickname(user_id: u32) -> Option<String> {
    let user = database.find_user(user_id)?;  // None이면 즉시 반환
    user.nickname  // Option<String> 반환
}

// 호출하는 쪽에서
match get_user_nickname(123) {
    Some(nick) => println!("닉네임: {}", nick),
    None => println!("닉네임 미설정 또는 유저 없음"),
}
```

준호: "오! 이렇게 하면 널 포인터 걱정이 없네요!"
수진: "맞아. 이게 Rust의 핵심이야."

🎯 **핵심**: Option은 "있을 수도, 없을 수도 있는 값"을 안전하게 처리하는 
Rust의 방법입니다. 데이터베이스 조회, 설정값 읽기, 사용자 입력 파싱 등 
실무에서 매우 자주 사용됩니다.
```

---

## 📊 MEM1 핵심 구현 포인트

### 메모리 관리 방식

```typescript
// ❌ 기존 방식 (메모리 무한 증가)
const prompt = [...allPreviousMessages, systemPrompt, newUserMessage];

// ✅ MEM1 방식 (일정 메모리 유지)
const prompt = [
  systemPrompt,  // 현재 IS 상태 + 이전 주제 요약 포함
  newUserMessage  // 현재 메시지만
];
// 과거 대화는 모두 제거!
```

### Multi-Objective Task Composition

**논문 구현 방식**:
```typescript
// 2-Objective 예시
topics = ["Option 타입", "Result 타입"]

// 각 주제마다 IS 생성
topic1_IS = "Option은 Some/None으로 값의 유무를 표현"
topic2_IS = "Result는 Ok/Err로 성공/실패를 표현"

// 프롬프트에 이전 주제 요약 주입
systemPrompt = `
현재 주제: Result 타입
이전 학습: Option 타입 - ${topic1_IS}

Result를 설명할 때 Option과의 차이점을 강조하세요.
`
```

**효과**:
- ✅ 연관 개념을 자연스럽게 연결
- ✅ 장기 기억 능력 향상 (여러 주제 기억)
- ✅ 메모리는 일정 (각 주제별 IS 1개만)

### 역할극 기반 학습

**trigger 패턴**:
- "어떻게 사용해?"
- "언제 쓰는지 모르겠어"
- "실제 예시 보여줘"
- "프로젝트에서 어떻게 활용하지?"

**AI 응답 구조**:
1. 🎬 실제 개발 상황 설정
2. 👤 등장인물 (주니어/시니어 개발자)
3. 💬 대화 형식으로 문제 제시
4. 💻 Before/After 코드 비교
5. 🎯 핵심 개념 정리

### 강제 학습 메커니즘

- `<IS>` 태그가 없으면 → AI가 진도를 나가지 않음
- `<IS>` 태그가 있으면 → 평가 후 다음 단계 진행
- Multi-Objective에서는 → 각 주제마다 IS 요구
- 모든 과정이 마크다운으로 자동 기록

---

## 🔍 테스트

```bash
# Backend health check
curl http://localhost:3001/api/rust-learn/health

# 학습 시작 테스트
curl -X POST http://localhost:3001/api/rust-learn/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "topic": "Option 타입"}'
```

---

## 📝 주의사항

1. **Ollama 필수**: Qwen 2.5 7B가 로컬에서 실행되어야 합니다
2. **포트 충돌**: 3000(Frontend), 3001(Backend), 11434(Ollama) 확인
3. **CORS**: 프로덕션 환경에서는 CORS 설정을 엄격하게 조정하세요

---

## 🎉 완성!

이제 Claude Code에서 이 가이드를 따라 구현하면 MEM1 방식의 Rust 학습 시스템이 완성됩니다!
