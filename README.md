# 🦀 RustLearn-MEM1: MEM1 기반 AI 러스트 학습 시스템

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MLX](https://img.shields.io/badge/MLX-Apple%20Silicon-FF6B35?style=flat-square)](https://ml-explore.github.io/mlx/build/html/index.html)

MEM1(Memory-Efficient Mechanism) 논문의 원리를 기반으로 개발된, AI가 지원하는 혁신적인 Rust 학습 플랫폼입니다. 데이터베이스 지속성으로 학습 내용을 영구 보존하고, 일정한 메모리 사용량을 유지하면서도 효율적인 학습을 제공합니다.

## 🎯 핵심 특징

### 💾 **MEM1 메모리 효율화**
- `<IS>` 태그로 학습 내용을 자동 압축
- 대화 길이와 무관하게 메모리 사용량 일정 유지
- 효율적인 컨텍스트 관리로 응답 속도 최적화
- **프롬프트 토큰 70-81% 감소** (최적화된 시스템 프롬프트)

### 🗄️ **PostgreSQL 데이터베이스 지속성** ⭐ NEW
- 모든 세션, 메시지, 학습 내용을 PostgreSQL에 저장
- 브라우저 종료 후에도 완벽한 복원
- 멀티 유저 지원 가능
- 데이터베이스 인덱싱으로 빠른 조회

### 🔗 **다중 목표 기반 점진적 학습**
- 여러 관련 주제를 순차적으로 학습 (예: Option → Result → ? 연산자)
- 이전 주제의 학습 내용이 다음 주제에 자동 반영
- 개념 간의 연결성을 강화한 깊이 있는 학습

### 🎭 **역할극 기반 실전 예제**
- "어떻게 사용해?", "실제로 언제 쓰는지 예시 보여줘" 등의 질문에 즉시 대응
- 실제 개발 상황을 주니어/시니어 개발자 대화로 시뮬레이션
- 생생한 코드 예제로 개념 이해 극대화

### 📋 **세션 관리 & 자동 저장** ⭐ IMPROVED
- **Sidebar 세션 목록**: 이전 학습 세션 모두 표시
- **세션 선택**: 목록에서 클릭하면 모든 내용 자동 복원
- **세션 삭제**: 원치 않는 세션 완전 삭제
- **데이터 지속성**: 장시간 후에도 완벽 복원

### 📥 **학습 기록 자동 생성** ⭐ IMPROVED
- 마크다운 파일로 전체 학습 과정 저장
- **한글 파일명 지원** (파일명 자동 변환)
- Multi-Objective 학습은 주제별로 자동 정렬
- 진행 상황 시각화 (✅ 완료, 🔄 진행중, ⏳ 대기)

### ⚡ **성능 모니터링** ⭐ NEW
- 전역 성능 인터셉터로 모든 API 응답 시간 측정
- 느린 요청 자동 감지 및 경고
- 실시간 성능 로깅 (⚡ < 100ms, ✅ < 1s, ⚠️ < 5s, 🐌 > 5s)

### 💾 **응답 캐싱 시스템** ⭐ NEW
- 동일한 프롬프트에 대한 응답 자동 캐싱 (1시간 TTL)
- 메모리 크기 제한 (최대 100개 응답)
- 반복되는 질문에 즉시 응답

### ⌨️ **빠른 시작 & 세션 관리**
- **Enter 키**로 주제 입력 후 즉시 학습 시작
- **☰ 햄버거 메뉴**로 모든 이전 세션 조회
- **세션 클릭**하면 모든 내용 완벽 복원
- **세션 삭제** 버튼으로 불필요한 세션 정리

---

## 🚀 빠른 시작 가이드

### 📋 사전 요구사항

- **Apple Silicon Mac** (MLX는 Apple Silicon 전용)
- **MLX & MLX-LM** 설치 완료
- **Qwen 2.5 7B (MLX 양자화)** 모델 자동 다운로드됨
- **PostgreSQL 12+** 설치 및 실행 중
- **Node.js 18+** 설치

### ✅ 필수 서비스 확인 및 설치

#### 1️⃣ PostgreSQL 설치 및 실행

**macOS (Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
psql -U postgres  # 접속 확인
```

**Windows**:
- PostgreSQL 공식 인스톨러 다운로드: https://www.postgresql.org/download/windows/
- 설치 중 비밀번호 설정 (기본값 권장: postgres)
- PostgreSQL 서비스가 자동 시작됨

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres psql  # 접속 확인
```

#### 2️⃣ MLX & MLX-LM 설치

```bash
# Python 가상환경 생성
python3 -m venv mlx_env
source mlx_env/bin/activate

# MLX 및 MLX-LM 설치
pip install mlx mlx-lm
```
#### 3️⃣ 버전 확인

```bash
# PostgreSQL 버전
psql --version

# Node.js 버전
node --version
```

### 🔧 환경 설정

```bash
# Backend .env 설정 (backend/.env)
cd backend

# PostgreSQL 연결 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=rustlearn_mem1
DB_SYNCHRONIZE=true

# MLX Server 설정 (OpenAI 호환 API)
MLX_SERVER_URL=http://localhost:8080/v1
MLX_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit
MLX_TIMEOUT=60000

# 애플리케이션 설정
NODE_ENV=development
PORT=3001
```

**⚠️ 중요**:
- `DB_USERNAME`: PostgreSQL 유저명 (기본: postgres)
- `DB_PASSWORD`: PostgreSQL 비밀번호 (초기 설정 필요)
- `DB_DATABASE`: 생성할 데이터베이스명 (이름은 자동 생성됨)

### 🏃 프로젝트 실행 (5단계)

#### 1️⃣ PostgreSQL 데이터베이스 생성
```bash
# PostgreSQL에 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE rustlearn_mem1;

# 생성 확인
\l

# 종료
\q
```

**✅ 자동 스키마 생성**: Backend가 처음 실행될 때, TypeORM이 자동으로 테이블을 생성합니다 (`DB_SYNCHRONIZE=true`)

#### 2️⃣ Backend 설치 및 실행
```bash
cd backend

# 의존성 설치
npm install

# TypeORM 설정 확인 (자동 마이그레이션은 환경변수로 처리)
npm run start:dev

# ✅ 다음 메시지가 보일 때까지 대기:
# [TypeOrmModule] Database connection established
# 🚀 RustLearn Backend running on http://localhost:3001
```

**⚠️ 주의**: Backend 시작 시 다음이 자동으로 발생합니다:
- PostgreSQL 연결 시도
- 데이터베이스 스키마 자동 생성 (필요시)
- 테이블 및 인덱스 자동 생성

#### 3️⃣ Frontend 실행 (새 터미널)
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# ✅ http://localhost:3000에서 실행됨
```

#### 4️⃣ MLX 서버 실행 (또 다른 터미널)
```bash
# MLX 가상환경 활성화
source mlx_env/bin/activate

# MLX 서버 시작 (자동으로 Qwen 2.5 7B 모델 로드)
python3 -m mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --host 127.0.0.1 --port 8080

# 또는 python3 mlx_server.py 사용
# ✅ 다음 메시지가 보일 때까지 대기:
# 🚀 Starting MLX LLM Server...
# ✨ Server running at http://localhost:8080/v1
```

**💾 첫 실행 시 주의**:
- Qwen 2.5 7B 모델 다운로드 (최초 1회, 약 5-15분)
- 다음부터는 캐시된 모델 사용으로 빠르게 시작됨
- 실시간 진행 상황 확인: `./mlx_dashboard.sh`

#### 5️⃣ 브라우저에서 접속
```
http://localhost:3000
```

### ✨ Health Check

**모든 서비스 정상 작동 확인**:
```bash
# 1️⃣ MLX Server
curl http://localhost:8080/v1/models
# 응답: {"object":"list","data":[{"id":"mlx-community/Qwen2.5-7B-Instruct-4bit","object":"model"}]}

# 2️⃣ Backend API
curl http://localhost:3001/api/rust-learn/health
# 응답: {"status":"ok","mlx":"connected","timestamp":"..."}

# 3️⃣ PostgreSQL 연결 및 테이블 확인
psql -U postgres -d rustlearn_mem1 -c "\dt"

# 응답 예시:
#           List of relations
#  Schema |      Name       | Type  | Owner
# --------+-----------------+-------+----------
#  public | messages        | table | postgres
#  public | sessions        | table | postgres
#  public | topic_is_history| table | postgres

# 4️⃣ Frontend
# 브라우저에서 http://localhost:3000 접속 확인
```

**🐛 문제 해결**:
```bash
# MLX 다운로드 진행 상황 확인
./monitor_mlx.sh

# Backend 빌드 및 시작 오류
cd backend && npm run build

# PostgreSQL 연결 오류
psql -U postgres -h localhost -d rustlearn_mem1

# 포트 충돌 확인
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :8080  # MLX Server

# 실시간 모니터링 대시보드
./mlx_dashboard.sh
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
   ✅ 한글 파일명도 자동으로 변환됨!
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
   💾 PostgreSQL에 자동 저장됨!
```

### 시나리오 3️⃣: 역할극 모드 (🎭)

**실제 개발 상황 기반 학습**

```
1. "🎭 역할극 OFF" 버튼 클릭 → "🎭 역할극 ON"으로 변경
   ↓
2. 질문 입력:
   "Option 타입을 실제 프로젝트에서 어떻게 사용해?"
   ↓
3. 🎬 AI가 자동으로 실전 시나리오 생성

   👤 등장인물: 주니어/시니어 개발자
   💬 대화: 실제 개발 상황
   💻 코드: Before/After 예제
   🎯 핵심: 개념 설명
   ↓
4. 생생한 예제로 깊이 있는 이해 달성!
```

### 시나리오 4️⃣: 이전 학습 재개 ⭐ IMPROVED

**중단된 학습 완벽히 복원 (데이터베이스에서)**

```
1. ☰ 햄버거 메뉴 클릭
   ↓
2. 이전 채팅 목록에서 원하는 세션 선택
   예: "Option 타입 외 2개"  (3:45 PM)

   ✨ 이제 모든 세션이 PostgreSQL에서 로드됨!
   ↓
3. ✨ 모든 상태 자동 복원:
   - 이전 메시지들
   - 진행 상황 (2/3)
   - 역할극 모드 설정
   - 팁과 지시사항
   - 마지막 IS 요약
   ↓
4. 마지막 상태에서 계속 학습!

5. 세션 삭제: 🗑️ 버튼으로 불필요한 세션 제거
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

### 다중 목표 자동 연결

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
│   │   │   ├── database/             # 데이터베이스 (NEW)
│   │   │   │   ├── database.module.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── session.entity.ts
│   │   │   │   │   ├── message.entity.ts
│   │   │   │   │   └── topic-is-history.entity.ts
│   │   │   │   └── repositories/
│   │   │   │       ├── session.repository.ts
│   │   │   │       └── message.repository.ts
│   │   │   ├── context-manager/      # 세션 및 컨텍스트 관리
│   │   │   │   ├── context-manager.service.ts
│   │   │   │   └── types/
│   │   │   │       └── conversation.types.ts
│   │   │   ├── qwen/                 # Ollama Qwen 연동
│   │   │   │   ├── qwen.service.ts
│   │   │   │   └── response-cleaner.ts (중국어 필터링)
│   │   │   └── rust-learn/           # 러스트 학습 API
│   │   │       ├── rust-learn.controller.ts
│   │   │       └── rust-learn.service.ts
│   │   ├── common/
│   │   │   └── interceptors/
│   │   │       └── performance.interceptor.ts (NEW)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                         # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             # 메인 페이지
    │   │   └── layout.tsx
    │   ├── components/
    │   │   ├── ChatInterface.tsx    # 메인 UI (세션 관리)
    │   │   ├── Sidebar.tsx          # 햄버거 메뉴 (세션 목록)
    │   │   ├── MessageBubble.tsx    # 메시지 버블
    │   │   ├── InputArea.tsx        # 입력 영역
    │   │   └── LoadingSpinner.tsx   # 로딩 표시
    │   └── lib/
    │       └── api.ts              # API 클라이언트 (에러 로깅 추가)
    ├── package.json
    └── tsconfig.json
```

---

## 🔌 기술 스택

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 12+ with TypeORM
- **HTTP Client**: Axios
- **LLM Integration**: MLX Server (OpenAI Compatible API)
- **Port**: 3001

### Frontend
- **Framework**: Next.js 15+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Storage**: Browser localStorage + PostgreSQL
- **Port**: 3000

### Database (PostgreSQL)
- **ORM**: TypeORM
- **Tables**:
  - `sessions`: 세션 메타데이터 및 현재 상태
  - `messages`: 전체 대화 히스토리
  - `topic_is_history`: 주제별 IS 요약
- **Indexes**: 빠른 조회를 위한 6개 인덱스

### LLM
- **Model**: Qwen 2.5 7B Instruct (4-bit Quantized)
- **Runtime**: MLX (Apple Silicon)
- **Server**: mlx-lm.server (OpenAI Compatible)
- **Temperature**: 0.6 (안정성 강화)
- **Response Caching**: 1시간 TTL, 최대 100개
- **Response Cleaning**: 자동 중국어 제거 및 재시도

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

### 세션 관리 (NEW)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `GET` | `/api/rust-learn/sessions` | 모든 세션 목록 조회 |
| `GET` | `/api/rust-learn/session/:userId` | 특정 세션 로드 |
| `DELETE` | `/api/rust-learn/session/:userId` | 세션 삭제 |

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

**세션 조회**:
```bash
curl http://localhost:3001/api/rust-learn/sessions
```

**세션 로드**:
```bash
curl http://localhost:3001/api/rust-learn/session/user-12345
```

**세션 삭제**:
```bash
curl -X DELETE http://localhost:3001/api/rust-learn/session/user-12345
```

---

## 💾 데이터 저장 구조

### PostgreSQL (서버 영구 저장) ⭐ NEW

**✅ 자동 생성**: Backend 시작 시 TypeORM이 다음 스키마를 자동으로 생성합니다.

#### 1️⃣ `sessions` 테이블 - 세션 메타데이터
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,              -- userId (세션 고유 ID)
  title VARCHAR(500) NOT NULL,              -- 세션 제목 (예: "Option 타입")
  all_topics TEXT[] NOT NULL,               -- 모든 학습 주제 (PostgreSQL 배열)
  current_topic VARCHAR(255) NOT NULL,      -- 현재 학습 중인 주제
  current_topic_index INTEGER DEFAULT 0,    -- 현재 주제의 인덱스 (0부터 시작)
  current_is TEXT DEFAULT '',               -- 학생의 현재 이해 상태 <IS>...</IS>
  last_ai_response TEXT DEFAULT '',         -- 마지막 AI 응답 (캐싱용)
  step_count INTEGER DEFAULT 0,             -- 총 학습 단계 수
  role_play_mode BOOLEAN DEFAULT FALSE,     -- 역할극 모드 활성화 여부
  created_at TIMESTAMP DEFAULT NOW(),       -- 생성 시간
  updated_at TIMESTAMP DEFAULT NOW()        -- 마지막 수정 시간
);

-- 인덱스
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
```

**활용**:
- 학생이 새로운 학습을 시작하면 새 `sessions` 행 생성
- 메시지 전송 시마다 `current_is`, `step_count`, `updated_at` 업데이트
- 세션 목록 조회 시 `created_at`, `title`, `current_topic` 사용

#### 2️⃣ `messages` 테이블 - 대화 히스토리
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,                -- 'user' 또는 'assistant'
  content TEXT NOT NULL,                    -- 메시지 내용
  created_at TIMESTAMP DEFAULT NOW()        -- 생성 시간
);

-- 인덱스 (빠른 조회)
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX idx_messages_role ON messages(role);
```

**활용**:
- MEM1 원칙: 프롬프트에는 최신 IS만 전달 (대화 히스토리 X)
- 마크다운 생성: 세션의 모든 메시지 조회하여 학습 기록 자동 생성
- 세션 복원: 사용자가 이전 세션 선택 시 모든 메시지 로드

#### 3️⃣ `topic_is_history` 테이블 - 주제별 IS 요약
```sql
CREATE TABLE topic_is_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic VARCHAR(255) NOT NULL,              -- 주제 이름
  is_summary TEXT NOT NULL,                 -- 해당 주제의 IS 요약
  completed_at TIMESTAMP DEFAULT NOW()      -- 주제 완료 시간
);

-- 인덱스
CREATE UNIQUE INDEX idx_topic_is_history_session_topic
  ON topic_is_history(session_id, topic);
```

**활용**:
- Multi-Objective 학습: 각 주제별 IS 요약 저장
- 다음 주제 학습 시: 이전 주제의 IS를 시스템 프롬프트에 자동 주입
- 학습 연결성: 개념 간의 관계 강화

### PostgreSQL와 MEM1 원칙의 관계 🔗

**MEM1 (Memory-Efficient Mechanism)의 핵심**:
```
💾 데이터베이스: 모든 대화 기록 저장
  ├─ messages: 완전한 히스토리 (마크다운 생성용)
  └─ sessions: 현재 IS 상태 (프롬프트에만 전달)

🧠 AI 프롬프트: IS 요약만 전달 (대화 히스토리 X)
  ├─ System: "현재 IS = '...'"
  ├─ User: "사용자 입력"
  └─ 메모리: 항상 2개 메시지 유지 ✅

📊 결과: 대화 길이 ∞ → 메모리 사용량 일정 ✅
```

**구체적 예시**:
```
Turn 1:
  - DB에 저장: User1 + AI1 (messages 테이블)
  - 프롬프트: [System: IS=''] + [User1] (2개)
  - 메모리: 일정

Turn 2:
  - DB에 저장: User2 + AI2 추가 (messages 테이블)
  - 프롬프트: [System: IS='User1의 요약'] + [User2] (2개)
  - 메모리: 여전히 일정 ✅

Turn 100:
  - DB에 저장: User1~User100 + AI1~AI100 (완전한 기록)
  - 프롬프트: [System: IS='User99의 요약'] + [User100] (2개)
  - 메모리: 여전히 일정 ✅✅✅
```

**PostgreSQL의 역할**:
1. **대화 히스토리 저장** (messages 테이블)
   - 마크다운 내보내기: 모든 메시지 조회
   - 세션 복원: 이전 학습 완전히 재개

2. **IS 상태 저장** (sessions 테이블)
   - 프롬프트에는 현재 IS만 전달
   - 메모리 사용량 일정 유지

3. **주제별 IS 저장** (topic_is_history 테이블)
   - Multi-Objective 학습: 개념 간 연결성 강화
   - 다음 주제 학습 시 이전 IS 자동 주입

### localStorage (클라이언트 캐시)
```javascript
// 1. 세션 목록
localStorage.rust_learn_sessions = [
  {
    id: "user-1234567890",
    topics: ["Option 타입", "Result 타입"],
    startTime: 1735293600000,
    title: "Option 타입 외 1개"
  }
]

// 2. 현재 활성 세션
localStorage.rust_learn_current_session = "user-1234567890"
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

### 데이터베이스 마이그레이션

```bash
# TypeORM 마이그레이션 실행
cd backend && npx typeorm migration:run
```

---

## 🐛 문제 해결

### Issue: Port 이미 사용 중
```bash
# 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :3001
lsof -i :5432

# 프로세스 강제 종료
kill -9 <PID>
```

### Issue: PostgreSQL 연결 실패

**증상**:
- Backend 시작 시: `Error: connect ECONNREFUSED 127.0.0.1:5432`
- Backend 로그: `PostgreSQL connection failed`

**해결 방법**:

```bash
# 1️⃣ PostgreSQL 실행 확인
psql -U postgres -c "SELECT version();"

# 응답이 없거나 에러가 나면 PostgreSQL이 실행되지 않은 것

# 2️⃣ PostgreSQL 시작
# macOS (Homebrew)
brew services start postgresql@15

# macOS (DMG)
sudo /Library/PostgreSQL/15/bin/pg_ctl -D /Library/PostgreSQL/15/data start

# Linux (systemd)
sudo systemctl start postgresql

# Windows
# Services > PostgreSQL 찾아서 시작

# 3️⃣ 데이터베이스 생성 확인
psql -U postgres -l | grep rustlearn_mem1

# 4️⃣ 데이터베이스가 없으면 생성
psql -U postgres -c "CREATE DATABASE rustlearn_mem1;"

# 5️⃣ 연결 테스트
psql -U postgres -d rustlearn_mem1 -c "SELECT 1;"
```

**환경변수 오류**:
```bash
# 에러: "role 'postgres' does not exist"
# → 다른 username 사용

# .env 파일 수정:
DB_USERNAME=your_username
DB_PASSWORD=your_password

# 사용자 확인
psql -U postgres -c "\du"

# macOS에서 기본 사용자로 접속
psql postgres
```

**권한 오류**:
```bash
# 에러: "permission denied for database"
# → 데이터베이스 소유권 확인

psql -U postgres
ALTER DATABASE rustlearn_mem1 OWNER TO postgres;
\q
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

### Issue: 404 API 오류
```javascript
// 브라우저 DevTools > Console 확인
// API 호출 오류 메시지 확인:
// "API Error (startLearning): Request failed with status code 404"
// "API Error (getSessions): ..."

// Backend 로그 확인:
tail -f /tmp/backend.log
```

### Issue: 세션 데이터 초기화
```bash
# PostgreSQL에서 모든 세션 삭제
psql -U postgres -d rustlearn_mem1
DELETE FROM messages;
DELETE FROM topic_is_history;
DELETE FROM sessions;
\q

# 또는 브라우저 localStorage 초기화
# DevTools > Application > Storage > Local Storage > Clear All
```

---

## 📈 성능 최적화

### 메모리 관리
- ✅ **MEM1 방식**: 메모리 사용량 대화 길이와 무관하게 일정
- ✅ **프롬프트 최적화**: 70-81% 토큰 감소 (buildInitialTopicPrompt, buildPrompt)
- ✅ **응답 캐싱**: 동일 프롬프트에 대한 응답 1시간 저장
- ✅ **Qwen 타임아웃**: 90초 (충분한 생성 시간)

### 응답 속도
- ✅ **Qwen 파라미터 최적화**:
  - temperature: 0.6 (안정성)
  - top_p: 0.85 (정확도)
  - num_predict: 1000 (적절한 길이)
- ✅ **성능 모니터링**: 전역 인터셉터로 모든 요청 응답 시간 측정
- ✅ **캐싱 시스템**: 빈번한 요청에 즉시 응답
- ✅ **데이터베이스 인덱싱**: 6개 인덱스로 빠른 조회

### 기준 성능
- **Operation 1** (Start Learning): ~27-35초 (초기 Qwen 로드)
- **Operation 2** (Chat): ~10-15초 (첫 호출), ~10ms (캐시 히트)
- **Operation 3** (API): ~10-20ms (DB 조회)

---

## 🤝 기여 가이드

버그 리포트나 기능 제안은 GitHub Issues를 이용해주세요.

### 코드 스타일
- TypeScript strict mode
- Prettier로 포매팅
- ESLint 규칙 준수

### 커밋 메시지 컨벤션
```
<type>: <subject>

<body>

<footer>
```

타입: `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `chore`

---

## 📄 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🙏 감사의 말

- MEM1 논문 저자들의 혁신적인 아이디어
- Ollama 커뮤니티의 지원
- Qwen 모델 개발팀
- PostgreSQL 커뮤니티

---

## 📊 최근 업데이트 (Dec 2025)

### ✅ 완료된 기능들

#### Backend 최적화
- [x] PostgreSQL 데이터베이스 지속성
- [x] TypeORM 데이터베이스 계층
- [x] 세션 관리 API (GET /sessions, GET /session/:userId, DELETE /session/:userId)
- [x] 프롬프트 토큰 최적화 (70-81% 감소)
- [x] 응답 캐싱 시스템 (1시간 TTL)
- [x] 성능 모니터링 인터셉터
- [x] 중국어 응답 필터링 (ResponseCleaner)
- [x] 마크다운 다운로드 (한글 파일명 지원)

#### Frontend 개선
- [x] 세션 목록 로드 및 선택
- [x] Sidebar 세션 네비게이션
- [x] 세션 삭제 기능
- [x] 데이터베이스 기반 세션 복원
- [x] localStorage 폴백
- [x] API 에러 로깅

### 🎯 구현된 주요 기능
- MEM1 메모리 효율화
- Multi-Objective 학습
- 역할극 기반 실전 예제
- PostgreSQL 데이터베이스 지속성
- 세션 관리 및 복원
- 성능 모니터링
- 응답 캐싱

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
