[English](README.en.md) | **한국어**

# MCP Project Manager

Claude Code와 통합된 종합 프로젝트 관리 및 워크플로우 추적 시스템. Model Context Protocol(MCP)을 기반으로 Claude Code 세션, 도구 사용, 에이전트 실행, 프로젝트 작업을 자동으로 캡처하여 중앙 집중식 대시보드와 데이터베이스에 저장합니다.

[![GitHub stars](https://img.shields.io/github/stars/skdkfk8758/MCP-ProjectManager?style=social)](https://github.com/skdkfk8758/MCP-ProjectManager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-3.14-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.7.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

> **Fork 정보**: 이 프로젝트는 [croffasia/mcp-project-manager](https://github.com/croffasia/mcp-project-manager)를 포크하여 3-tier 아키텍처로 확장한 버전입니다.

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [아키텍처](#아키텍처)
- [빠른 시작](#빠른-시작)
- [설치](#설치)
- [MCP 클라이언트 설정](#mcp-클라이언트-설정)
- [개발](#개발)
- [기술 스택](#기술-스택)
- [라이선스](#라이선스)

## 개요

MCP Project Manager는 Claude Code 워크플로우를 실행 가능한 인사이트로 변환하는 3-tier 시스템입니다. 다음을 자동으로 추적합니다:

- 세션 활동 및 타임라인
- 도구 사용 패턴 및 성능
- 에이전트 실행 및 스킬 호출
- 프로젝트 작업, 마일스톤, 산출물
- 파일 변경 및 코드 메트릭
- 팀 분석 및 인사이트

시각적 대시보드, REST API를 제공하며 MCP를 통해 Claude Desktop과 원활하게 통합됩니다.

### 핵심 기능

- **자동 이벤트 캡처**: 8개의 Claude Code 훅 핸들러가 사용자 개입 없이 세션, 도구, 에이전트, 프롬프트를 자동 캡처
- **실시간 대시보드**: WebSocket을 통한 라이브 업데이트, 칸반 보드, 플로우 그래프, 분석 차트
- **플로우 시각화**: 에이전트 실행, 도구 호출, 의사결정 플로우의 그래프 기반 뷰
- **스마트 분석**: 토큰 사용량, 에이전트 분포, 성공률, 타임라인 인사이트
- **프로젝트 관리**: 프로젝트 생성, 작업 추적, 마일스톤 설정, 산출물 관리
- **원커맨드 설치**: `npx create-mcp-pm`이 클론, 빌드, 설정, MCP 등록을 자동 처리

## 주요 기능

### 33개의 MCP 도구

#### 플로우 및 세션 추적 (12개)
- `flow_session_start` / `flow_session_end` - 세션 생명주기 관리
- `flow_task_start` / `flow_task_end` - 작업 실행 추적
- `flow_skill_call` - 스킬 호출 기록
- `flow_error` - 오류 이벤트 로깅
- `flow_agent_spawn` / `flow_agent_complete` - 에이전트 생명주기
- `flow_tool_call` - 도구 실행 기록
- `flow_file_change` - 파일 변경 추적
- `flow_commit` - Git 커밋 기록
- `flow_prompt` - 사용자 프롬프트 로깅

#### 프로젝트 관리 CRUD (15개)
- **프로젝트**: `pm_project_create`, `pm_project_update`, `pm_project_delete`, `pm_project_list`, `pm_project_get`
- **작업**: `pm_task_create`, `pm_task_update`, `pm_task_delete`, `pm_task_list`, `pm_task_get`
- **마일스톤**: `pm_milestone_create`, `pm_milestone_update`, `pm_milestone_list`
- **작업 관리**: `pm_task_move`, `pm_task_assign_priority`

#### 쿼리 및 분석 (6개)
- `pm_dashboard_summary` - KPI 요약 및 프로젝트 통계
- `pm_timeline` - 이벤트 타임라인 조회
- `pm_flow_graph` - 플로우 그래프 데이터
- `pm_analyze_bottleneck` - 병목 현상 분석
- `pm_suggest_next_task` - 다음 작업 제안
- `pm_report_generate` - 프로젝트 리포트 생성

#### 자체 업데이트 (1개)
- `pm_self_update` - 설치된 MCP 서버를 최신 버전으로 자동 업데이트

### 8개의 Claude Code 훅 핸들러

Claude Code 훅을 통한 자동 이벤트 캡처:

| 훅 | 이벤트 | 캡처 내용 |
|------|-------|----------|
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
- **개요 페이지** (`/`): KPI 카드, 프로젝트 통계, 트렌드 차트 (recharts)
- **프로젝트 페이지** (`/projects`): 프로젝트 목록 및 진행 상황
- **프로젝트 상세** (`/projects/[id]`):
  - 7단계 칸반 보드 (할 일/설계/구현/리뷰/테스트/완료/보관)
  - 드래그 앤 드롭 작업 관리 (@dnd-kit)
  - 작업 카드 액션: 편집, 삭제, 실행 시작/중지
  - 작업 실행 추적 (WebSocket 실시간 업데이트)
- **타임라인** (`/projects/[id]/timeline`): 이벤트 시간순 조회
- **플로우 그래프** (`/projects/[id]/flow`): 에이전트 실행 트리 시각화 (@xyflow/react v12)
- **활동 페이지** (`/activities`): 이벤트 목록 및 필터링
- **분석 페이지** (`/analytics`): 작업 완료율, 토큰 사용량, 에이전트 분포, 세션 활동
- **설정 페이지** (`/settings`): 서비스 상태, 데이터베이스 정보

#### 실시간 업데이트
- WebSocket 기반 라이브 업데이트 (폴링 없음)
- 칸반 보드의 낙관적 업데이트
- 실시간 세션 추적

### 세션 및 작업 실행

- 세션 생성 및 관리
- 작업 실행 시작/중지
- 작업 단계 추적 (설계/구현/리뷰/테스트)
- 실행 상태 실시간 모니터링

## 아키텍처

### 3-Tier 설계

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
│   FastAPI Backend (Python 3.14)         │
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

### 패키지 구조

```
packages/
├── mcp-server/    # TypeScript MCP Server (tsup build)
│   └── src/tools/ # 33 MCP tools
│       ├── flow-events.ts, flow-session.ts, flow-agent.ts, flow-tracking.ts
│       ├── pm-project.ts, pm-task.ts, pm-milestone.ts, pm-actions.ts
│       ├── pm-query.ts, pm-analysis.ts, pm-session.ts, pm-update.ts
│       └── index.ts
├── backend/       # FastAPI (Python 3.14) REST API + WebSocket
│   └── app/routes/ # projects, tasks, sessions, milestones, events, analytics, ws, seed, ai, labels
├── dashboard/     # Next.js 15 (App Router) Web Dashboard
│   └── src/app/   # pages: /, activities, analytics, projects, projects/[id] (kanban/timeline/flow), settings
├── cli/           # CLI tools
└── create-mcp-pm/ # Project scaffolding
```

**데이터베이스**: SQLite (WAL mode) at `~/.mcp-pm/mcp_pm.db`, 15 tables
**포트**: Backend 48293, Dashboard 48294

## 빠른 시작

### 설치

가장 빠른 시작 방법:

```bash
# 옵션 1: GitHub에서 직접 설치 (npm 계정 불필요)
curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP-ProjectManager/main/scripts/install.sh | bash

# 옵션 2: npx (npm publish 후 사용 가능)
npx create-mcp-pm
```

이 단일 명령이 다음을 수행합니다:
1. 필수 의존성 확인 (Node.js 20+, Python 3.14+, git)
2. MCP ProjectManager 저장소 클론
3. pnpm을 통한 모든 의존성 설치
4. 모든 패키지 빌드 (MCP Server, CLI, Dashboard, Backend)
5. Python 백엔드 가상 환경 설정
6. Claude Desktop에 MCP 서버 등록
7. Claude Code 훅 핸들러 설치

### 수동 설정 (개발용)

로컬 개발 시:

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
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
cd ../..

# Claude Desktop 등록 및 훅 설치
mcp-pm setup

# 서비스 시작
mcp-pm start
```

### 대시보드 접속

실행 후:

- **대시보드**: http://localhost:48294
- **백엔드 API**: http://localhost:48293
- **API 문서**: http://localhost:48293/docs

### 데모 데이터

데모 데이터를 시드하여 모든 대시보드 기능을 즉시 확인:

```bash
# 데모 데이터 시드 (3 프로젝트, 26 작업, 분석 데이터, 에이전트 통계)
bash scripts/seed-demo.sh

# 모든 데이터 초기화
bash scripts/seed-demo.sh reset

# 또는 API 직접 호출
curl -X POST http://localhost:48293/api/seed/demo
curl -X POST http://localhost:48293/api/seed/reset
```

## MCP 클라이언트 설정

### Claude Desktop

`~/.claude/settings.local.json`에 다음 추가:

```json
{
  "mcpServers": {
    "mcp-project-manager": {
      "command": "node",
      "args": ["/Users/carpdm/Documents/mcp_servers/MCP_ProjectManager/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Code

훅 핸들러는 `mcp-pm setup` 실행 시 자동 등록됩니다.

### Cursor / VS Code

MCP 확장 프로그램 설치 후 위와 동일한 설정 사용.

## 개발

### 요구사항

- Node.js 20.0.0 이상
- Python 3.14 이상
- pnpm 9.0.0 이상
- git

### 빌드 명령어

```bash
# 모든 패키지 빌드
pnpm turbo build

# 개별 패키지 빌드
pnpm build -F @mcp-pm/server
pnpm build -F @mcp-pm/backend
pnpm build -F @mcp-pm/dashboard
pnpm build -F @mcp-pm/cli

# 개발 모드 (watch)
pnpm dev

# 린팅
pnpm lint

# 빌드 아티팩트 정리
pnpm clean
```

### 개발 워크플로우

#### 백엔드 시작

```bash
cd packages/backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python main.py
# http://localhost:48293에서 실행
```

#### 대시보드 시작

```bash
cd packages/dashboard
pnpm dev
# http://localhost:48294에서 실행
```

#### MCP 서버 (로컬 테스트용)

```bash
cd packages/mcp-server
pnpm dev
```

### 주요 개발 노트

- **비동기 Python**: 백엔드는 SQLAlchemy 비동기 ORM 사용. 데이터베이스 호출 시 항상 await
- **Greenlet 요구사항**: aiosqlite + SQLAlchemy 비동기 호환성을 위해 필수
- **Next.js 15 라우트**: 동적 라우트 params는 Promise. `use()`로 언래핑 필요
- **훅 핸들러**: `packages/mcp-server/src/hooks/`에 위치. Claude Code 차단 방지를 위한 fire-and-forget 패턴
- **TypeScript Strict**: TypeScript strict 모드 사용. `pnpm lint`로 확인

## 기술 스택

| 레이어 | 기술 |
|-------|------|
| MCP Server | TypeScript, @modelcontextprotocol/sdk, tsup |
| Backend | Python 3.14, FastAPI, SQLAlchemy (async), aiosqlite, greenlet |
| Dashboard | Next.js 15 (App Router), React 19, TanStack Query, @dnd-kit, @xyflow/react, recharts, Tailwind CSS, date-fns |
| Build | pnpm workspaces, Turborepo |
| DB | SQLite (WAL mode) |

## CLI 명령어

`mcp-pm` CLI를 통한 프로젝트 관리:

```bash
# 전체 설정: 환경 확인, 빌드, 서비스 시작, MCP 등록
mcp-pm setup

# 서비스 시작 (백엔드 + 대시보드)
mcp-pm start [service]     # service: backend, dashboard, 또는 all (기본값)

# 모든 실행 중인 서비스 중지
mcp-pm stop

# 서비스 상태, 빌드, 훅, 데이터베이스 확인
mcp-pm status

# 이 프로젝트의 MCP 서버 및 훅을 Claude Desktop에서 제거
mcp-pm teardown
```

## 문서

- [도구 레퍼런스](docs/tools.md) - 33개 MCP 도구 상세 설명
- [프롬프트 가이드](docs/prompts.md) - Claude와 함께 사용하기 위한 프롬프트 예제
- [아키텍처 문서](docs/README.md) - 시스템 설계 및 데이터 플로우

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

Copyright (c) 2025 MCP Project Manager Contributors

## 감사의 글

다음 기술로 구축되었습니다:
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [TypeScript](https://www.typescriptlang.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)

## 지원

이슈 및 질문:
- GitHub Issues: https://github.com/skdkfk8758/MCP-ProjectManager/issues
- Discussions: https://github.com/skdkfk8758/MCP-ProjectManager/discussions

---

**시작할 준비가 되셨나요?** `npx create-mcp-pm`을 실행하여 Claude Code 워크플로우 추적을 시작하세요!
