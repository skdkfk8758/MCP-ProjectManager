[English](README.md) | **한국어**

# MCP 프로젝트 매니저

Claude Code와 통합된 포괄적인 프로젝트 관리 및 워크플로우 추적 시스템입니다. Model Context Protocol(MCP)로 구동되며, Claude Code 세션, 도구 사용, 에이전트 호출 및 프로젝트 작업을 중앙 집중식 대시보드와 데이터베이스로 자동 캡처합니다.

[![npm version](https://img.shields.io/npm/v/create-mcp-pm.svg)](https://www.npmjs.com/package/create-mcp-pm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.7.0-blue.svg)](https://www.typescriptlang.org/)

## 목차

- [개요](#개요)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [기능](#기능)
- [개발](#개발)
- [프로젝트 구조](#프로젝트-구조)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

## 개요

MCP 프로젝트 매니저는 Claude Code 워크플로우를 실행 가능한 인텔리전스로 변환하는 3계층 시스템입니다. 자동으로 다음을 추적합니다:

- 세션 활동 및 타임라인
- 도구 사용 패턴 및 성능
- 에이전트 실행 및 스킬 호출
- 프로젝트 작업, 마일스톤 및 산출물
- 파일 변경 및 코드 메트릭
- 팀 분석 및 인사이트

시스템은 시각적 대시보드, REST API를 제공하며 MCP를 통해 Claude Desktop과 완벽하게 통합됩니다.

### 주요 기능

- **자동 이벤트 캡처**: 8개의 Claude Code 훅 핸들러가 사용자 개입 없이 세션, 도구, 에이전트 및 프롬프트 캡처
- **실시간 대시보드**: WebSocket을 통한 라이브 업데이트, Kanban 보드, 플로우 그래프 및 분석 차트
- **플로우 시각화**: 에이전트 실행, 도구 호출 및 의사 결정 흐름의 그래프 기반 뷰
- **스마트 분석**: 토큰 사용량, 에이전트 분포, 성공률 및 타임라인 인사이트
- **프로젝트 관리**: 프로젝트 생성, 작업 추적, 마일스톤 설정 및 산출물 관리
- **원클릭 설정**: `npx create-mcp-pm`으로 클로닝, 빌드, 구성 및 MCP 등록 처리

## 빠른 시작

### 설치

가장 빠른 시작 방법은:

```bash
npx create-mcp-pm
```

이 단일 명령어는 다음을 수행합니다:
1. 필수 의존성 확인 (Node.js 20+, Python 3.11+, git)
2. MCP ProjectManager 저장소 클론
3. pnpm을 통해 모든 의존성 설치
4. 모든 패키지 빌드 (MCP 서버, CLI, 대시보드, 백엔드)
5. 가상 환경으로 Python 백엔드 설정
6. Claude Desktop에 MCP 서버 등록
7. Claude Code 훅 핸들러 설치

### 수동 설정 (개발용)

로컬에서 개발하려면:

```bash
# 저장소 클론
git clone https://github.com/skdkfk8758/MCP-ProjectManager.git
cd MCP_ProjectManager

# 의존성 설치
pnpm install

# 모든 패키지 빌드
pnpm build

# Python 백엔드 설정
cd packages/backend
python3 -m venv .venv
source .venv/bin/activate  # Windows에서는 .venv\Scripts\activate
pip install -e .
cd ../..

# Claude Desktop에 등록하고 훅 설치
mcp-pm setup

# 서비스 시작
mcp-pm start
```

### 대시보드 접근

실행 후:

- **대시보드**: http://localhost:3000
- **백엔드 API**: http://localhost:48293
- **API 문서**: http://localhost:48293/docs

## 아키텍처

### 3계층 설계

```
┌─────────────────────────────────────────┐
│         Claude Desktop / Claude Code    │
│              (MCP Client)               │
└──────────────┬──────────────────────────┘
               │
               │ MCP Protocol
               ▼
┌─────────────────────────────────────────┐
│    MCP Server (TypeScript)              │
│  33 Tools + 8 Hook Handlers             │
│  • Flow Events & Sessions               │
│  • Project Management CRUD              │
│  • Analytics & Queries                  │
└──────────────┬──────────────────────────┘
               │
               │ REST API / WebSocket
               ▼
┌─────────────────────────────────────────┐
│   FastAPI Backend (Python 3.11+)        │
│   SQLAlchemy ORM + SQLite (WAL)         │
│   • 15 database tables                  │
│   • Real-time WebSocket updates         │
│   • Async/await execution               │
└──────────────┬──────────────────────────┘
               │
               │ WebSocket / HTTP
               ▼
┌─────────────────────────────────────────┐
│    Next.js Dashboard (React 19)         │
│   • Kanban board with drag-and-drop     │
│   • Flow graph visualization            │
│   • Analytics & timeline views          │
│   • Real-time project tracking          │
└─────────────────────────────────────────┘
```

### 패키지 개요

| 패키지 | 목적 | 기술 스택 | 위치 |
|--------|------|----------|------|
| **mcp-server** | 33개 도구 및 8개 훅 핸들러를 가진 MCP 프로토콜 서버 | TypeScript, @modelcontextprotocol/sdk, tsup | `packages/mcp-server` |
| **backend** | REST API, 데이터베이스, 실시간 WebSocket 업데이트 | Python 3.11, FastAPI, SQLAlchemy, aiosqlite | `packages/backend` |
| **dashboard** | 프로젝트, 작업, 세션, 분석용 웹 UI | Next.js 15, React 19, @xyflow/react, recharts, @dnd-kit | `packages/dashboard` |
| **cli** | 설정, 시작, 중지, 상태, 제거용 CLI 도구 | TypeScript, Commander | `packages/cli` |
| **create-mcp-pm** | 원클릭 부트스트랩 및 설정 스크립트 | TypeScript | `packages/create-mcp-pm` |

## 기능

### MCP 서버 (33개 도구)

#### 플로우 및 세션 추적 (6개 도구)
- `flow_trigger_agent` - 에이전트 생성 이벤트 기록
- `flow_update_agent` - 에이전트 상태 업데이트
- `flow_session_start` - 세션 초기화
- `flow_session_end` - 세션 종료 및 요약
- `flow_get_session` - 세션 데이터 조회
- `flow_list_sessions` - 모든 세션 쿼리

#### 프로젝트 관리 CRUD (15개 도구)
- **프로젝트**: `pm_create_project`, `pm_update_project`, `pm_delete_project`, `pm_list_projects`
- **작업**: `pm_create_task`, `pm_update_task`, `pm_delete_task`, `pm_list_tasks`
- **마일스톤**: `pm_create_milestone`, `pm_update_milestone`, `pm_delete_milestone`, `pm_list_milestones`
- **레이블**: `pm_create_label`, `pm_list_labels`
- **대량 작업**: `pm_batch_update_tasks`

#### 쿼리 및 분석 (6개 도구)
- `pm_search_tasks` - 전문 텍스트 작업 검색
- `pm_get_task_stats` - 작업 통계 및 번다운
- `pm_analyze_session` - 세션 메트릭 및 인사이트
- `pm_get_timeline` - 이벤트의 과거 뷰
- `pm_export_project` - JSON/CSV 형식으로 데이터 내보내기

#### 플로우 이벤트 (12개 도구)
- 도구 호출 이벤트: `flow_emit_tool_call`, `flow_update_tool_call`
- 에이전트 이벤트: `flow_emit_agent_event`
- 메타데이터가 포함된 사용자 정의 이벤트 추적

### Claude Code 훅 핸들러 (8개)

Claude Code 훅을 통한 자동 이벤트 캡처:

| 훅 | 이벤트 | 캡처 내용 |
|----|--------|----------|
| `session-start` | SessionStart | 새 세션 초기화 |
| `session-end` | SessionEnd | 세션 완료 및 요약 |
| `pre-tool-use` | PreToolUse | 도구 실행 전 |
| `post-tool-use` | PostToolUse | 도구 완료, 파일 변경 |
| `subagent-start` | SubagentStart | 에이전트 생성 |
| `subagent-stop` | SubagentStop | 에이전트 완료 |
| `user-prompt-submit` | UserPromptSubmit | 사용자 프롬프트 및 쿼리 |
| `stop` | Stop | 우아한 종료 |

### 대시보드 기능

#### 핵심 뷰
- **Kanban 보드**: 사용자 정의 열을 가진 드래그앤드롭 작업 관리
- **플로우 그래프**: 에이전트 실행 트리의 시각적 표현 (@xyflow/react)
- **타임라인**: 모든 이벤트 및 활동의 과거 뷰
- **분석 대시보드**: 차트, 에이전트 분포, 토큰 사용량, 성공률

#### 실시간 업데이트
- WebSocket 기반 라이브 업데이트 (폴링 없음)
- Kanban 보드의 낙관적 업데이트
- 라이브 세션 추적

### 데이터베이스 (SQLite WAL 모드)

포괄적인 데이터 모델을 가진 15개 테이블:
- 세션, 이벤트, 도구 호출, 파일 변경
- 프로젝트, 작업, 마일스톤, 레이블
- 에이전트 실행, 스킬, 플로우 노드
- 분석 스냅샷

## 개발

### 요구사항

- Node.js 20.0.0 이상
- Python 3.11 이상
- pnpm 9.0.0 이상 (패키지 관리자)
- git

### 빌드 명령어

```bash
# 의존성 순서로 모든 패키지 빌드
pnpm build

# 개별 패키지 빌드
pnpm build -F @mcp-pm/server
pnpm build -F @mcp-pm/backend
pnpm build -F @mcp-pm/dashboard
pnpm build -F @mcp-pm/cli

# 개발용 감시 모드
pnpm dev

# 린팅 실행
pnpm lint

# 테스트 실행 (구성된 경우)
pnpm test

# 모든 빌드 결과물 정리
pnpm clean
```

### 개발 워크플로우

#### 백엔드 시작

```bash
cd packages/backend
source .venv/bin/activate  # Windows에서는 .venv\Scripts\activate
python main.py
# 백엔드가 http://localhost:48293에서 실행됩니다
```

#### 대시보드 시작

```bash
cd packages/dashboard
pnpm dev
# 대시보드가 http://localhost:3000에서 실행됩니다
```

#### MCP 서버 시작 (로컬 테스트용)

```bash
cd packages/mcp-server
pnpm dev
```

### 주요 개발 참고사항

- **Async Python**: 백엔드는 SQLAlchemy async ORM을 사용합니다. 항상 데이터베이스 호출을 await합니다.
- **Greenlet 요구사항**: aiosqlite + SQLAlchemy async 호환성을 위해 필수입니다.
- **Next.js 15 라우트**: 동적 라우트 매개변수는 Promise입니다. `use()`를 사용하여 언래핑합니다.
- **훅 핸들러**: `packages/mcp-server/src/hooks/`에 위치합니다. Claude Code 차단을 방지하기 위해 fire-and-forget 패턴을 사용합니다.
- **TypeScript Strict**: TypeScript strict 모드를 사용합니다. `pnpm lint`로 확인합니다.

### 환경 변수

#### 백엔드 (packages/backend의 .env)
```bash
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=48293
FASTAPI_DEBUG=true
DATABASE_URL=sqlite://~/.mcp-pm/mcp_pm.db
```

#### 대시보드 (packages/dashboard의 .env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:48293
```

#### Claude Code 훅
```bash
FASTAPI_BASE_URL=http://localhost:48293
CLAUDE_SESSION_ID=<optional-fallback>
```

## 프로젝트 구조

```
MCP_ProjectManager/
├── packages/
│   ├── mcp-server/              # 33개 도구 + 8개 훅을 가진 MCP 서버
│   │   ├── src/
│   │   │   ├── tools/           # 도구 구현
│   │   │   │   ├── flow-events.ts
│   │   │   │   ├── flow-session.ts
│   │   │   │   ├── flow-agent.ts
│   │   │   │   ├── flow-tracking.ts
│   │   │   │   ├── pm-project.ts
│   │   │   │   ├── pm-task.ts
│   │   │   │   ├── pm-milestone.ts
│   │   │   │   ├── pm-actions.ts
│   │   │   │   ├── pm-query.ts
│   │   │   │   └── pm-analysis.ts
│   │   │   ├── hooks/           # Claude Code 훅 핸들러
│   │   │   │   ├── session-start.ts
│   │   │   │   ├── session-end.ts
│   │   │   │   ├── pre-tool-use.ts
│   │   │   │   ├── post-tool-use.ts
│   │   │   │   ├── subagent-start.ts
│   │   │   │   ├── subagent-stop.ts
│   │   │   │   ├── user-prompt-submit.ts
│   │   │   │   ├── stop.ts
│   │   │   │   └── hook-utils.ts
│   │   │   ├── server.ts        # MCP 서버 진입점
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── backend/                 # FastAPI Python 백엔드
│   │   ├── app/
│   │   │   ├── models/          # SQLAlchemy ORM 모델
│   │   │   ├── api/             # 라우트 핸들러
│   │   │   ├── config.py        # 설정
│   │   │   ├── main.py          # FastAPI 앱
│   │   │   └── cli.py           # CLI 진입점
│   │   ├── main.py              # 진입점 (uvicorn)
│   │   ├── pyproject.toml       # Python 의존성
│   │   └── .venv/               # 가상 환경
│   │
│   ├── dashboard/               # Next.js 15 React 대시보드
│   │   ├── src/
│   │   │   ├── app/             # App Router 페이지
│   │   │   ├── components/      # React 컴포넌트
│   │   │   ├── hooks/           # React 커스텀 훅
│   │   │   ├── lib/             # 유틸리티, API 클라이언트
│   │   │   └── styles/          # Tailwind CSS
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # TypeScript CLI 도구
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts      # 설정 명령어
│   │   │   │   ├── service.ts   # 시작/중지/상태
│   │   │   │   └── teardown.ts  # MCP + 훅 제거
│   │   │   └── index.ts         # CLI 진입점
│   │   └── package.json
│   │
│   └── create-mcp-pm/           # npx용 부트스트랩 스크립트
│       ├── src/
│       │   └── index.ts         # 원클릭 설정
│       └── package.json
│
├── turbo.json                   # Turborepo 설정
├── pnpm-workspace.yaml          # pnpm 워크스페이스
├── package.json                 # 루트 패키지
└── LICENSE                      # MIT 라이선스
```

## 데이터베이스 스키마

백엔드는 더 나은 동시성을 위해 WAL 모드를 가진 SQLite를 사용합니다. 15개 핵심 테이블:

- **sessions** - Claude Code 세션 추적
- **events** - 일반 이벤트 로그
- **tool_calls** - 도구 실행 기록
- **file_changes** - 파일 수정 추적
- **agent_executions** - 에이전트 생성 및 완료
- **projects** - 프로젝트 정의
- **tasks** - 프로젝트 내 개별 작업
- **milestones** - 프로젝트 마일스톤
- **labels** - 작업 레이블/태그
- **skills** - 에이전트 스킬 및 능력
- **flow_nodes** - 플로우 그래프 노드
- **flow_edges** - 플로우 그래프 에지
- **analytics_snapshots** - 과거 분석 데이터
- **session_summaries** - 세션 메타데이터 및 요약
- **token_metrics** - 토큰 사용량 추적

## CLI 명령어

`mcp-pm` CLI는 프로젝트 관리를 제공합니다:

```bash
# 전체 설정: 환경 확인, 빌드, 서비스 시작, MCP 등록
mcp-pm setup

# 서비스 시작 (백엔드 + 대시보드)
mcp-pm start [service]     # service: backend, dashboard, 또는 all (기본값)

# 모든 실행 중인 서비스 중지
mcp-pm stop

# 서비스 상태, 빌드, 훅, 데이터베이스 확인
mcp-pm status

# 이 프로젝트의 Claude Desktop에서 MCP 서버 및 훅 제거
mcp-pm teardown
```

## 구성

### Claude Desktop 통합

MCP 서버는 `~/.claude/settings.local.json`에 등록됩니다:

```json
{
  "mcpServers": {
    "mcp-project-manager": {
      "command": "npx",
      "args": ["@mcp-pm/server"]
    }
  },
  "hooks": {
    "SessionStart": [
      { "command": "npx @mcp-pm/server hooks/session-start.ts" }
    ],
    "PostToolUse": [
      { "command": "npx @mcp-pm/server hooks/post-tool-use.ts" }
    ]
    // ... 기타 훅
  }
}
```

훅 핸들러는 설정 중에 자동으로 설치됩니다.

## 기여하기

기여를 환영합니다! 다음 지침을 따르세요:

1. **저장소 포크**하고 feature 브랜치 생성
2. **TypeScript 규칙 준수** - strict 모드 사용, 타입 작성
3. **변경사항 테스트** - `pnpm build`와 `pnpm lint` 실행
4. **커밋은 원자적으로** - 커밋당 하나의 기능
5. **명확한 커밋 메시지** - conventional commits 따르기
6. **기능 추가시 문서 업데이트**

### 개발 팁

- 병렬 개발을 위해 루트에서 `pnpm dev` 사용
- 훅 아키텍처는 `packages/mcp-server/src/hooks/README.md` 확인
- 데이터베이스 스키마는 `packages/backend/app/models/`의 백엔드 모델 검토
- 대시보드 컴포넌트는 Tailwind CSS 및 shadcn 스타일 유틸리티 사용

## 문제 해결

### 서비스가 시작되지 않음

```bash
# 상태 확인 및 상세 오류 표시
mcp-pm status

# 환경 확인
node --version  # 20 이상이어야 함
python3 --version  # 3.11 이상이어야 함
pnpm --version  # 9 이상이어야 함
```

### 백엔드가 연결되지 않음

```bash
# 포트 48293이 사용 중인지 확인
lsof -i :48293

# Python 가상 환경 확인
cd packages/backend
source .venv/bin/activate
pip list | grep fastapi
```

### 대시보드가 비어 있거나 로드되지 않음

```bash
# 포트 3000이 사용 중인지 확인
lsof -i :3000

# 대시보드 재빌드
cd packages/dashboard
pnpm build
pnpm start
```

### 훅 핸들러가 실행되지 않음

```bash
# 훅이 설치되었는지 확인
grep -r "hooks" ~/.claude/settings.local.json

# 훅 파일 권한 확인
ls -la packages/mcp-server/src/hooks/
```

## 성능 참고사항

- **데이터베이스**: 동시 읽기/쓰기를 위한 SQLite WAL 모드
- **백엔드**: 논블로킹 I/O를 위한 aiosqlite를 통한 async/await
- **대시보드**: React Query 캐싱을 가진 낙관적 업데이트
- **훅**: Claude를 차단하지 않기 위해 3초 타임아웃을 가진 fire-and-forget
- **WebSocket**: 자동 재연결을 가진 실시간 업데이트

## 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

Copyright (c) 2025 MCP 프로젝트 매니저 기여자

## 감사의 말

다음과 함께 구축:
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [TypeScript](https://www.typescriptlang.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)

## 지원

문제 및 질문사항:
- GitHub Issues: https://github.com/skdkfk8758/MCP-ProjectManager/issues
- Discussions: https://github.com/skdkfk8758/MCP-ProjectManager/discussions

---

**시작할 준비가 되셨나요?** `npx create-mcp-pm`을 실행하고 Claude Code 워크플로우 추적을 시작하세요!
