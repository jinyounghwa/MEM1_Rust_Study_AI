# 🦀 RustLearn-MEM1: MEM1 기반 AI 러스트 학습 시스템

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Qwen](https://img.shields.io/badge/Qwen%202.5-FF6B35?style=flat-square)](https://ollama.ai/)

MEM1(Memory-Efficient Mechanism) 논문의 원리를 기반으로 개발된, AI가 지원하는 혁신적인 Rust 학습 플랫폼입니다. 일정한 메모리 사용량을 유지하면서도 효율적인 학습을 제공합니다.

## 🎯 핵심 특징

### 💾 **MEM1 메모리 효율화**
- `<IS>` 태그로 학습 내용을 자동 압축
- 대화 길이와 무관하게 메모리 사용량 일정 유지
- 효율적인 컨텍스트 관리로 응답 속도 최적화

### 🔗 **다중 목표 기반 점진적 학습**
- 여러 관련 주제를 순차적으로 학습 (예: Option → Result → ? 연산자)
- 이전 주제의 학습 내용이 다음 주제에 자동 반영
- 개념 간의 연결성을 강화한 깊이 있는 학습

### 🎭 **역할극 기반 실전 예제**
- "어떻게 사용해?", "실제로 언제 쓰는지 예시 보여줘" 등의 질문에 즉시 대응
- 실제 개발 상황을 주니어/시니어 개발자 대화로 시뮬레이션
- 생생한 코드 예제로 개념 이해 극대화

### 📝 **세션 관리 & 자동 저장**
- 이전 학습 세션 목록 (햄버거 메뉴)
- 세션 복원으로 마지막 상태에서 재개
- localStorage에 모든 데이터 영구 저장

### 📥 **학습 기록 자동 생성**
- 마크다운 파일로 전체 학습 과정 저장
- Multi-Objective 학습은 주제별로 자동 정렬
- 진행 상황 시각화 (✅ 완료, 🔄 진행중, ⏳ 대기)

### ⌨️ **빠른 시작 & 세션 관리**
- **Enter 키**로 주제 입력 후 즉시 학습 시작
- **☰ 햄버거 메뉴**로 이전 채팅 목록 조회
- **이전 세션 클릭**하면 모든 내용 완벽 복원

---

## 🚀 빠른 시작 가이드

### 📋 사전 요구사항

- **Ollama** 설치 및 실행 중
- **Qwen 2.5 7B** 모델 설치 완료
- **Node.js 18+** 설치

### ✅ Qwen 모델 확인

```bash
# 설치된 모델 확인
ollama list

# qwen2.5:7b이 없다면 설치
ollama pull qwen2.5:7b
```

### 🏃 프로젝트 실행 (3단계)

#### 1️⃣ Backend 실행
```bash
cd backend
npm install
npm run dev
# ✅ http://localhost:3001에서 실행됨
```

#### 2️⃣ Frontend 실행 (새 터미널)
```bash
cd frontend
npm install
npm run dev
# ✅ http://localhost:3000 (또는 3002) 에서 실행됨
```

#### 3️⃣ 브라우저에서 접속
```
http://localhost:3000
```

### ✨ Health Check
```bash
# Backend 상태 확인
curl http://localhost:3001/api/rust-learn/health
```

---

## 📖 사용 방법

### 시나리오 1️⃣: Single-Objective (단일 주제)

**완벽한 한 가지 주제 깊이 있는 학습**

```
1. 주제 입력: "Option 타입"
   ↓
2. Enter 키 누르거나 "🚀 학습 시작" 클릭
   ↓
3. 📌 AI 설명 자동 생성 및 표시
   ↓
4. <IS>...</IS> 형식으로 요약 작성
   💡 예: <IS>Option은 Some/None으로 값의 유무를 표현한다</IS>
   ↓
5. 🤖 AI 피드백 확인
   ↓
6. "📥 다운로드"로 마크다운 파일 저장
```

### 시나리오 2️⃣: Multi-Objective (다중 주제)

**관련된 여러 주제를 연결지어 학습**

```
1. "+ 주제 추가" 클릭하여 여러 주제 입력
   예: Option 타입 → Result 타입 → ? 연산자
   ↓
2. 첫 번째 주제 (Option 타입) 학습
   ↓
3. <IS> 태그로 요약 제출
   ↓
4. "➡️ 다음 주제" 클릭
   ⭐ 이전 주제의 IS가 자동으로 새 주제에 주입됨!

   시스템: "이전에 배운 Option 타입에서는...
            이제 배울 Result 타입은..."
   ↓
5. 모든 주제 완료 후 마크다운 다운로드
```

### 시나리오 3️⃣: 역할극 모드 (🎭)

**실제 개발 상황 기반 학습**

```
1. "🎭 역할극 OFF" 버튼 클릭 → "🎭 역할극 ON"으로 변경
   ↓
2. 질문 입력:
   "Option 타입을 실제 프로젝트에서 어떻게 사용해?"

   또는

   "Option 타입이 왜 필요해?"
   ↓
3. 🎬 AI가 자동으로 실전 시나리오 생성

   👤 등장인물: 주니어/시니어 개발자
   💬 대화: 실제 개발 상황
   💻 코드: Before/After 예제
   🎯 핵심: 개념 설명
   ↓
4. 생생한 예제로 깊이 있는 이해 달성!
```

### 시나리오 4️⃣: 이전 학습 재개

**중단된 학습 완벽히 복원**

```
1. ☰ 햄버거 메뉴 클릭
   ↓
2. 이전 채팅 목록에서 원하는 세션 선택
   예: "Option 타입 외 2개"  (3:45 PM)
   ↓
3. ✨ 모든 상태 자동 복원:
   - 이전 메시지들
   - 진행 상황 (2/3)
   - 역할극 모드 설정
   - 팁과 지시사항
   ↓
4. 마지막 상태에서 계속 학습!
```

---

## 🎯 MEM1 구현 원리

### 메모리 효율화 메커니즘

**기존 AI 챗봇** (메모리 증가):
```
Turn 1: [System, User1, AI1] = 3개 메시지
Turn 2: [System, User1, AI1, User2, AI2] = 5개 메시지
Turn 3: [System, User1, AI1, User2, AI2, User3, AI3] = 7개 메시지
        ...
Turn N: 2N+1개 메시지 (계속 증가 ❌)
```

**MEM1 방식** (메모리 일정):
```
Turn 1: [System(IS=''), User1] = 2개 메시지
Turn 2: [System(IS='요약1'), User2] = 2개 메시지 ✅
Turn 3: [System(IS='요약2'), User3] = 2개 메시지 ✅
        ...
Turn N: 항상 2개 메시지 (일정! ✅)

IS = Internal State (사용자의 현재 이해 상태)
```

### Multi-Objective 자동 연결

**두 번째 주제 학습 시 시스템 프롬프트**:
```
현재 주제: Result 타입
진행 상황: 2/3 (Option 타입 완료)

📌 이전에 배운 내용:
- Option 타입: Some/None으로 값의 유무를 표현한다

🔗 연결고리:
- Option은 값의 유무만 표현
- Result는 성공/실패와 에러 정보를 모두 표현
- Option보다 더 상세한 에러 처리가 필요할 때 사용

⭐ 따라서 Result를 설명할 때 Option과의
   차이점을 강조하고 연결지어 설명하겠습니다.
```

---

## 📁 프로젝트 구조

```
MEM1_Rust_Study_AI/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── context-manager/      # 세션 및 컨텍스트 관리
│   │   │   │   ├── context-manager.service.ts
│   │   │   │   └── types/
│   │   │   │       └── conversation.types.ts
│   │   │   ├── qwen/                 # Ollama Qwen 연동
│   │   │   │   └── qwen.service.ts
│   │   │   └── rust-learn/           # 러스트 학습 API
│   │   │       ├── rust-learn.controller.ts
│   │   │       └── rust-learn.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
└── frontend/                         # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             # 메인 페이지
    │   │   └── layout.tsx
    │   ├── components/
    │   │   ├── ChatInterface.tsx    # 메인 UI (세션 관리)
    │   │   ├── Sidebar.tsx          # 햄버거 메뉴
    │   │   ├── MessageBubble.tsx    # 메시지 버블
    │   │   ├── InputArea.tsx        # 입력 영역
    │   │   └── LoadingSpinner.tsx   # 로딩 표시
    │   └── lib/
    │       └── api.ts              # API 클라이언트
    └── package.json
```

---

## 🔌 기술 스택

### Backend
- **Framework**: NestJS (TypeScript)
- **HTTP Client**: Axios
- **LLM Integration**: Ollama REST API
- **Port**: 3001

### Frontend
- **Framework**: Next.js 15+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Storage**: Browser localStorage
- **Port**: 3000 (또는 3002)

### LLM
- **Model**: Qwen 2.5 7B
- **Runtime**: Ollama
- **Context Window**: 32K tokens
- **Temperature**: 0.7 (최적화)

---

## 📊 API 엔드포인트

### 학습 세션 관리

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `POST` | `/api/rust-learn/start` | 학습 시작 (주제 입력) |
| `POST` | `/api/rust-learn/chat` | 메시지 전송 (IS 감지) |
| `POST` | `/api/rust-learn/next-topic` | 다음 주제로 이동 |
| `POST` | `/api/rust-learn/toggle-roleplay` | 역할극 모드 토글 |
| `GET` | `/api/rust-learn/export/:userId` | 마크다운 다운로드 |
| `GET` | `/api/rust-learn/health` | 헬스 체크 |

### 요청/응답 예시

**학습 시작**:
```bash
curl -X POST http://localhost:3001/api/rust-learn/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-12345",
    "topics": ["Option 타입", "Result 타입"]
  }'
```

**메시지 전송**:
```bash
curl -X POST http://localhost:3001/api/rust-learn/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-12345",
    "message": "<IS>Option은 Some/None으로 값의 유무를 표현</IS>"
  }'
```

---

## 💾 데이터 저장 구조

### localStorage (클라이언트)
```javascript
// 1. 세션 목록
localStorage.rust_learn_sessions = [
  {
    id: "session-1234567890",
    topics: ["Option 타입", "Result 타입"],
    startTime: 1735293600000,
    title: "Option 타입 외 1개"
  }
]

// 2. 세션 상세 데이터
localStorage.rust_learn_session_data = {
  "session-1234567890": {
    userId: "user-1234567890",
    topics: ["Option 타입", "Result 타입"],
    started: true,
    messages: [ /* 모든 메시지 */ ],
    tip: "학습 팁...",
    stepCount: 2,
    progress: { /* 진행 상황 */ },
    rolePlayMode: false,
    title: "Option 타입 외 1개",
    startTime: 1735293600000
  }
}

// 3. 현재 활성 세션
localStorage.rust_learn_current_session = "session-1234567890"
```

### 백엔드 세션 (메모리)
```typescript
sessions: Map<userId, ConversationState> = {
  "user-1234567890": {
    currentIS: "Option은 Some/None...",
    currentTopic: "Result 타입",
    allTopics: ["Option 타입", "Result 타입"],
    topicISHistory: {
      "Option 타입": "Option은 Some/None...",
    },
    conversationHistory: [ /* 전체 대화 기록 */ ],
    rolePlayMode: false,
    stepCount: 2,
    // ... 기타 상태
  }
}
```

---

## ⌨️ 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| **Enter** (주제 입력 중) | 학습 시작 |
| **Shift+Enter** (메시지 입력 중) | 줄바꿈 |

---

## 🛠️ 개발 및 유지보수

### 개발 서버 실행

```bash
# Backend 개발 모드 (auto-reload)
cd backend && npm run dev

# Frontend 개발 모드 (hot-reload)
cd frontend && npm run dev
```

### 프로덕션 빌드

```bash
# Backend 빌드
cd backend && npm run build && npm run start

# Frontend 빌드
cd frontend && npm run build && npm start
```

### 테스트

```bash
# Backend 테스트
cd backend && npm run test

# Frontend 테스트 (설정 필요)
cd frontend && npm run test
```

---

## 🐛 문제 해결

### Issue: Port 이미 사용 중
```bash
# 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :3001

# 프로세스 강제 종료
kill -9 <PID>
```

### Issue: Ollama 연결 실패
```bash
# Ollama 상태 확인
curl http://localhost:11434/api/tags

# Ollama 재시작
ollama serve
```

### Issue: Qwen 모델 로드 실패
```bash
# 모델 목록 확인
ollama list

# 모델 다시 설치
ollama pull qwen2.5:7b
```

### Issue: localStorage 초기화
```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('rust_learn_sessions');
localStorage.removeItem('rust_learn_session_data');
localStorage.removeItem('rust_learn_current_session');
// 페이지 새로고침
```

---

## 📈 성능 최적화

### 메모리 관리
- ✅ MEM1 방식으로 메모리 사용량 일정 유지
- ✅ Qwen 타임아웃: 60초 (충분한 시간)
- ✅ localStorage는 100KB 이상 저장 가능

### 응답 속도
- ✅ Qwen 파라미터 최적화:
  - temperature: 0.7
  - top_p: 0.9
  - num_predict: 1200
- ✅ 프론트엔드 렌더링 최적화
- ✅ 자동 저장으로 데이터 손실 방지

---

## 🤝 기여 가이드

버그 리포트나 기능 제안은 GitHub Issues를 이용해주세요.

### 코드 스타일
- TypeScript strict mode
- Prettier로 포매팅
- ESLint 규칙 준수

---

## 📄 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🙏 감사의 말

- MEM1 논문 저자들의 혁신적인 아이디어
- Ollama 커뮤니티의 지원
- Qwen 모델 개발팀

---

## 📞 문의 및 피드백

- 🐛 **버그 리포트**: GitHub Issues
- 💡 **기능 제안**: GitHub Discussions
- 📧 **이메일**: 프로젝트 관리자

---

<div align="center">

### 🚀 RustLearn-MEM1과 함께 효율적으로 Rust를 학습하세요!

**Happy Learning! 🦀✨**

</div>
