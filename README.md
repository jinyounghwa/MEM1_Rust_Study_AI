# RustLearn-MEM1: MEM1 기반 AI 러스트 학습 시스템

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MLX](https://img.shields.io/badge/MLX-Apple%20Silicon-FF6B35?style=flat-square)](https://ml-explore.github.io/mlx/build/html/index.html)

MEM1(Memory-Efficient Mechanism) 논문의 원리를 기반으로 개발된, AI가 지원하는 혁신적인 Rust 학습 플랫폼입니다. 데이터베이스 지속성으로 학습 내용을 영구 보존하고, 일정한 메모리 사용량을 유지하면서도 효율적인 학습을 제공합니다.

---

## 핵심 특징

### MEM1 메모리 효율화
- `<IS>` 태그로 학습 내용을 자동 압축
- 대화 길이와 무관하게 메모리 사용량 일정 유지
- 효율적인 컨텍스트 관리로 응답 속도 최적화
- **프롬프트 토큰 70-81% 감소** (최적화된 시스템 프롬프트)

### 실시간 스트리밍 응답 (NEW)
- **Server-Sent Events (SSE)** 기반 실시간 토큰 스트리밍
- **TTFT (Time To First Token) 최적화**: 첫 토큰 ~0.6초 내 표시
- 학습 시작, 채팅, 다음 주제 이동 모두 스트리밍 지원
- 사용자 체감 응답 속도 대폭 향상

### MLX 자동 웜업 (NEW)
- 백엔드 시작 시 MLX 모델 자동 사전 로딩
- Cold start 지연 제거 (17초 → 7초)
- 비동기 웜업으로 서버 시작 블로킹 없음

### PostgreSQL 데이터베이스 지속성
- 모든 세션, 메시지, 학습 내용을 PostgreSQL에 저장
- 브라우저 종료 후에도 완벽한 복원
- 멀티 유저 지원 가능
- 데이터베이스 인덱싱으로 빠른 조회

### 다중 목표 기반 점진적 학습
- 여러 관련 주제를 순차적으로 학습 (예: Option → Result → ? 연산자)
- 이전 주제의 학습 내용이 다음 주제에 자동 반영
- 개념 간의 연결성을 강화한 깊이 있는 학습

### 역할극 기반 실전 예제
- "어떻게 사용해?", "실제로 언제 쓰는지 예시 보여줘" 등의 질문에 즉시 대응
- 실제 개발 상황을 주니어/시니어 개발자 대화로 시뮬레이션
- 생생한 코드 예제로 개념 이해 극대화

---

## 빠른 시작 가이드

### 사전 요구사항

- **Apple Silicon Mac** (MLX는 Apple Silicon 전용)
- **Python 3.10+** (MLX 실행용)
- **PostgreSQL 12+** 설치 및 실행 중
- **Node.js 18+** 설치

### 1단계: PostgreSQL 데이터베이스 설정

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 데이터베이스 생성
psql -U postgres -c "CREATE DATABASE rustlearn_mem1;"
```

### 2단계: MLX 환경 설정

```bash
# Python 가상환경 생성
python3 -m venv mlx_env
source mlx_env/bin/activate

# MLX 및 MLX-LM 설치
pip install mlx mlx-lm
```

### 3단계: Backend 환경 설정

```bash
cd backend

# .env 파일 생성
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=rustlearn_mem1
DB_SYNCHRONIZE=true

MLX_SERVER_URL=http://localhost:8080/v1
MLX_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit
MLX_TIMEOUT=60000

NODE_ENV=development
PORT=3001
EOF

# 의존성 설치
npm install
```

### 4단계: 서버 실행 (3개 터미널)

**터미널 1: MLX 서버**
```bash
source mlx_env/bin/activate
python3 -m mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --host 127.0.0.1 --port 8080
```

**터미널 2: Backend**
```bash
cd backend
npm run start:dev

# 출력 확인:
# 🚀 RustLearn Backend running on http://localhost:3001
# 🔥 MLX 모델 웜업 시작...
# ✅ MLX 웜업 완료 (7.5초) - 첫 응답 속도가 빨라집니다
```

**터미널 3: Frontend**
```bash
cd frontend
npm install
npm run dev
```

### 5단계: 접속

브라우저에서 http://localhost:3000 접속

### Health Check

```bash
# MLX Server
curl http://localhost:8080/v1/models

# Backend (MLX 연결 포함)
curl http://localhost:3001/api/rust-learn/health
# {"status":"ok","mlx":"connected","timestamp":"..."}

# PostgreSQL
psql -U postgres -d rustlearn_mem1 -c "\dt"
```

---

## 사용 방법

### 시나리오 1: 단일 주제 학습

```
1. 주제 입력: "Option 타입"
2. Enter 키 또는 "🚀 학습 시작" 클릭
3. AI 설명이 실시간으로 스트리밍됨 (타이핑 효과)
4. <IS>Option은 Some/None으로 값의 유무를 표현한다</IS> 형식으로 요약
5. AI 피드백 확인
6. "📥 다운로드"로 마크다운 파일 저장
```

### 시나리오 2: 다중 주제 학습

```
1. "+ 주제 추가" 클릭하여 여러 주제 입력
   예: Option 타입 → Result 타입 → ? 연산자
2. 첫 번째 주제 학습 후 <IS> 태그로 요약
3. "➡️ 다음 주제" 클릭
   → 이전 주제의 IS가 자동으로 새 주제에 주입됨
4. 모든 주제 완료 후 마크다운 다운로드
```

### 시나리오 3: 역할극 모드

```
1. "🎭 역할극 OFF" → "🎭 역할극 ON" 변경
2. "Option 타입을 실제 프로젝트에서 어떻게 사용해?" 질문
3. AI가 실전 시나리오 생성:
   - 등장인물: 주니어/시니어 개발자
   - 대화: 실제 개발 상황
   - 코드: Before/After 예제
```

---

## API 엔드포인트

### 학습 세션 (Non-streaming)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `POST` | `/api/rust-learn/start` | 학습 시작 |
| `POST` | `/api/rust-learn/chat` | 메시지 전송 |
| `POST` | `/api/rust-learn/next-topic` | 다음 주제로 이동 |
| `POST` | `/api/rust-learn/toggle-roleplay` | 역할극 모드 토글 |
| `GET` | `/api/rust-learn/export/:userId` | 마크다운 다운로드 |
| `GET` | `/api/rust-learn/health` | 헬스 체크 |

### 스트리밍 API (NEW)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `POST` | `/api/rust-learn/start/stream` | 학습 시작 (스트리밍) |
| `POST` | `/api/rust-learn/chat/stream` | 메시지 전송 (스트리밍) |
| `POST` | `/api/rust-learn/next-topic/stream` | 다음 주제 (스트리밍) |

### 세션 관리

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `GET` | `/api/rust-learn/sessions` | 모든 세션 목록 |
| `GET` | `/api/rust-learn/session/:userId` | 특정 세션 로드 |
| `DELETE` | `/api/rust-learn/session/:userId` | 세션 삭제 |

### 스트리밍 응답 형식 (SSE)

```
data: {"type":"token","content":"Option"}

data: {"type":"token","content":"은"}

data: {"type":"done","tip":"...","progress":{...}}
```

---

## 프로젝트 구조

```
MEM1_Rust_Study_AI/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── database/             # PostgreSQL + TypeORM
│   │   │   │   ├── entities/         # Session, Message, TopicISHistory
│   │   │   │   └── repositories/     # 데이터 액세스 계층
│   │   │   ├── context-manager/      # MEM1 컨텍스트 관리
│   │   │   │   ├── context-manager.service.ts
│   │   │   │   └── types/conversation.types.ts
│   │   │   ├── qwen/                 # MLX LLM 연동
│   │   │   │   ├── qwen.service.ts   # 스트리밍 + 캐싱
│   │   │   │   └── response-cleaner.ts
│   │   │   └── rust-learn/           # API 컨트롤러
│   │   │       ├── rust-learn.controller.ts
│   │   │       └── rust-learn.service.ts
│   │   ├── common/interceptors/      # 성능 모니터링
│   │   └── main.ts                   # 웜업 기능 포함
│   └── package.json
│
├── frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx     # 스트리밍 UI
│   │   │   ├── Sidebar.tsx           # 세션 목록
│   │   │   └── ...
│   │   └── lib/
│   │       └── api.ts                # 스트리밍 API 클라이언트
│   └── package.json
│
├── mlx_server.py                     # MLX 서버 시작 스크립트
├── mlx_dashboard.sh                  # 실시간 모니터링
└── README.md
```

---

## 기술 스택

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 12+ with TypeORM
- **LLM**: MLX Server (OpenAI Compatible API)
- **Streaming**: Server-Sent Events (SSE)
- **Port**: 3001

### Frontend
- **Framework**: Next.js 15+ (React 18+)
- **Styling**: Tailwind CSS
- **Streaming**: Fetch API + ReadableStream
- **Port**: 3000

### LLM
- **Model**: Qwen 2.5 7B Instruct (4-bit Quantized)
- **Runtime**: MLX (Apple Silicon)
- **Features**: 스트리밍, 캐싱, 자동 웜업
- **Port**: 8080

---

## 성능 최적화

### 응답 속도 개선

| 항목 | 이전 | 이후 |
|------|------|------|
| 학습 시작 | 전체 응답 대기 (5-15초) | 첫 토큰 ~0.6초 |
| Cold start | ~17초 | ~7초 (웜업 적용) |
| 채팅 응답 | 전체 대기 | 실시간 스트리밍 |

### MEM1 메모리 효율화

```
Turn 1: [System(IS=''), User1] = 2개 메시지
Turn 2: [System(IS='요약1'), User2] = 2개 메시지 ✅
...
Turn N: 항상 2개 메시지 (일정 유지)
```

---

## 문제 해결

### MLX 서버 연결 실패
```bash
# MLX 서버 상태 확인
curl http://localhost:8080/v1/models

# 서버 재시작
source mlx_env/bin/activate
python3 -m mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --host 127.0.0.1 --port 8080
```

### PostgreSQL 연결 실패
```bash
# 서비스 상태 확인
brew services list | grep postgresql

# 데이터베이스 존재 확인
psql -U postgres -l | grep rustlearn_mem1
```

### 포트 충돌
```bash
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :8080  # MLX Server
lsof -i :5432  # PostgreSQL

# 프로세스 종료
kill -9 <PID>
```

---


---

## 최근 업데이트 (Dec 2025)

### v2.0 - 스트리밍 & 성능 최적화

- [x] SSE 기반 실시간 스트리밍 응답
- [x] MLX 자동 웜업 (Cold start 최적화)
- [x] TTFT 개선 (첫 토큰 응답 시간)
- [x] 스트리밍 학습 시작/다음 주제 API
- [x] Frontend 스트리밍 UI

### v1.0 - 기반 기능

- [x] MEM1 메모리 효율화
- [x] Multi-Objective 학습
- [x] 역할극 기반 실전 예제
- [x] PostgreSQL 데이터베이스 지속성
- [x] 세션 관리 및 복원
- [x] 응답 캐싱 시스템

---

## 라이센스

MIT License

---

<div align="center">

### RustLearn-MEM1과 함께 효율적으로 Rust를 학습하세요!

**Happy Learning!**

</div>
