from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.project import Project, Milestone, Label, TaskLabel
from app.models.task import Task, TaskDependency
from app.models.event import Session, Event, AgentExecution, SkillInvocation, ToolCall, FileChange, Error
from app.models.analytics import DailyStats, AgentUsageStats
import uuid
import random
from datetime import date, datetime, timedelta

router = APIRouter()


@router.post("/demo")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """Seed database with demo data for testing and demonstration."""

    # Labels
    labels_data = [
        {"name": "bug", "color": "#ef4444"},
        {"name": "feature", "color": "#22c55e"},
        {"name": "docs", "color": "#3b82f6"},
        {"name": "refactor", "color": "#f97316"},
        {"name": "urgent", "color": "#dc2626"},
        {"name": "frontend", "color": "#8b5cf6"},
        {"name": "backend", "color": "#06b6d4"},
        {"name": "devops", "color": "#eab308"},
    ]

    labels = []
    for label_data in labels_data:
        label = Label(**label_data)
        db.add(label)
        labels.append(label)

    await db.flush()

    # Projects
    projects_data = [
        {
            "name": "MCP 프로젝트 매니저",
            "description": "Claude Code를 위한 프로젝트 관리 시스템",
            "status": "active",
            "path": "/projects/mcp-pm"
        },
        {
            "name": "광고 시뮬레이터",
            "description": "AI 기반 광고 효과 시뮬레이션 플랫폼",
            "status": "completed",
            "path": "/projects/ad-simulator"
        },
        {
            "name": "이커머스 플랫폼",
            "description": "차세대 이커머스 백엔드 서비스",
            "status": "active",
            "path": "/projects/ecommerce"
        },
    ]

    projects = []
    for project_data in projects_data:
        project = Project(**project_data)
        db.add(project)
        projects.append(project)

    await db.flush()

    # Milestones
    milestones_data = [
        {
            "project_id": projects[0].id,
            "title": "MVP 출시",
            "description": "핵심 기능을 포함한 최소 기능 제품",
            "status": "in_progress",
            "due_date": datetime.now() + timedelta(days=30)
        },
        {
            "project_id": projects[0].id,
            "title": "베타 테스트",
            "description": "내부 베타 테스터와 함께 테스트",
            "status": "pending",
            "due_date": datetime.now() + timedelta(days=60)
        },
        {
            "project_id": projects[1].id,
            "title": "v1.0 출시",
            "description": "첫 공식 릴리스",
            "status": "completed",
            "due_date": datetime.now() - timedelta(days=10)
        },
        {
            "project_id": projects[2].id,
            "title": "결제 시스템 통합",
            "description": "다양한 결제 게이트웨이 연동",
            "status": "in_progress",
            "due_date": datetime.now() + timedelta(days=45)
        },
        {
            "project_id": projects[2].id,
            "title": "재고 관리 모듈",
            "description": "실시간 재고 추적 시스템",
            "status": "pending",
            "due_date": datetime.now() + timedelta(days=90)
        },
    ]

    milestones = []
    for milestone_data in milestones_data:
        milestone = Milestone(**milestone_data)
        db.add(milestone)
        milestones.append(milestone)

    await db.flush()

    # Tasks
    tasks_data = [
        # MCP 프로젝트 매니저
        {"project_id": projects[0].id, "milestone_id": milestones[0].id, "title": "API 엔드포인트 설계", "description": "RESTful API 구조 설계 및 문서화", "status": "done", "priority": "high"},
        {"project_id": projects[0].id, "milestone_id": milestones[0].id, "title": "데이터베이스 스키마 구현", "description": "SQLAlchemy 모델 정의 및 마이그레이션", "status": "done", "priority": "critical"},
        {"project_id": projects[0].id, "milestone_id": milestones[0].id, "title": "대시보드 UI 개발", "description": "Next.js 기반 관리자 대시보드 구축", "status": "in_progress", "priority": "high"},
        {"project_id": projects[0].id, "milestone_id": milestones[0].id, "title": "WebSocket 실시간 업데이트", "description": "실시간 데이터 동기화 구현", "status": "todo", "priority": "medium"},
        {"project_id": projects[0].id, "milestone_id": milestones[0].id, "title": "MCP 서버 훅 구현", "description": "Claude Code 훅 핸들러 개발", "status": "in_progress", "priority": "critical"},
        {"project_id": projects[0].id, "milestone_id": milestones[1].id, "title": "단위 테스트 작성", "description": "백엔드 API 테스트 커버리지 80% 달성", "status": "todo", "priority": "medium"},
        {"project_id": projects[0].id, "milestone_id": milestones[1].id, "title": "성능 최적화", "description": "API 응답 시간 개선", "status": "todo", "priority": "low"},
        {"project_id": projects[0].id, "title": "문서화 작업", "description": "사용자 가이드 및 API 문서 작성", "status": "todo", "priority": "medium"},

        # 광고 시뮬레이터
        {"project_id": projects[1].id, "milestone_id": milestones[2].id, "title": "머신러닝 모델 훈련", "description": "광고 효과 예측 모델 개발", "status": "done", "priority": "critical"},
        {"project_id": projects[1].id, "milestone_id": milestones[2].id, "title": "시뮬레이션 엔진 구현", "description": "다양한 시나리오 시뮬레이션", "status": "done", "priority": "high"},
        {"project_id": projects[1].id, "milestone_id": milestones[2].id, "title": "리포팅 대시보드", "description": "시각화 및 리포트 생성 기능", "status": "done", "priority": "high"},
        {"project_id": projects[1].id, "title": "배포 자동화", "description": "CI/CD 파이프라인 구축", "status": "archived", "priority": "medium"},
        {"project_id": projects[1].id, "title": "모니터링 시스템", "description": "성능 및 에러 모니터링", "status": "done", "priority": "medium"},

        # 이커머스 플랫폼
        {"project_id": projects[2].id, "milestone_id": milestones[3].id, "title": "사용자 인증 구현", "description": "JWT 기반 인증 시스템", "status": "done", "priority": "critical"},
        {"project_id": projects[2].id, "milestone_id": milestones[3].id, "title": "상품 관리 API", "description": "CRUD 엔드포인트 개발", "status": "done", "priority": "high"},
        {"project_id": projects[2].id, "milestone_id": milestones[3].id, "title": "장바구니 기능", "description": "세션 기반 장바구니 구현", "status": "in_progress", "priority": "high"},
        {"project_id": projects[2].id, "milestone_id": milestones[3].id, "title": "결제 게이트웨이 연동", "description": "PG사 API 통합", "status": "in_progress", "priority": "critical"},
        {"project_id": projects[2].id, "milestone_id": milestones[4].id, "title": "재고 추적 시스템", "description": "실시간 재고 업데이트", "status": "todo", "priority": "high"},
        {"project_id": projects[2].id, "milestone_id": milestones[4].id, "title": "주문 처리 로직", "description": "주문 상태 관리 워크플로우", "status": "in_progress", "priority": "critical"},
        {"project_id": projects[2].id, "title": "이메일 알림", "description": "주문 확인 이메일 발송", "status": "todo", "priority": "medium"},
        {"project_id": projects[2].id, "title": "검색 기능 최적화", "description": "Elasticsearch 통합", "status": "todo", "priority": "low"},
        {"project_id": projects[2].id, "title": "관리자 패널", "description": "상품 및 주문 관리 UI", "status": "todo", "priority": "medium"},
        {"project_id": projects[2].id, "title": "에러 핸들링 개선", "description": "예외 처리 및 로깅 강화", "status": "in_progress", "priority": "high"},
        {"project_id": projects[2].id, "title": "보안 강화", "description": "SQL 인젝션 및 XSS 방어", "status": "todo", "priority": "critical"},
        {"project_id": projects[2].id, "title": "캐싱 전략", "description": "Redis 기반 캐싱 레이어", "status": "todo", "priority": "medium"},
        {"project_id": projects[2].id, "title": "API 문서화", "description": "OpenAPI 스펙 작성", "status": "todo", "priority": "low"},
    ]

    tasks = []
    for i, task_data in enumerate(tasks_data):
        task_data["sort_order"] = float(i * 1000)
        task = Task(**task_data)
        db.add(task)
        tasks.append(task)

    await db.flush()

    # Assign random labels to tasks
    for task in tasks:
        num_labels = random.randint(1, 3)
        selected_labels = random.sample(labels, num_labels)
        for label in selected_labels:
            task_label = TaskLabel(task_id=task.id, label_id=label.id)
            db.add(task_label)

    # Sessions
    sessions_data = []
    for project in projects:
        session_id = str(uuid.uuid4())
        sessions_data.append({
            "id": session_id,
            "project_id": project.id,
            "start_time": datetime.now() - timedelta(hours=random.randint(1, 72)),
            "end_time": datetime.now() - timedelta(hours=random.randint(0, 1)),
            "token_usage": {
                "input_tokens": random.randint(5000, 20000),
                "output_tokens": random.randint(2000, 10000)
            },
            "summary": f"{project.name} 개발 세션"
        })

    sessions = []
    for session_data in sessions_data:
        session = Session(**session_data)
        db.add(session)
        sessions.append(session)

    await db.flush()

    # Events
    event_types = [
        "session_start", "session_end", "task_start", "task_end",
        "skill_call", "error", "tool_call", "subagent_start", "subagent_stop",
        "file_change", "commit", "user_prompt"
    ]

    for session in sessions:
        num_events = random.randint(10, 15)
        base_time = session.start_time

        for i in range(num_events):
            event_type = random.choice(event_types)
            timestamp = base_time + timedelta(minutes=i * random.randint(1, 5))

            payload = {}
            if event_type == "tool_call":
                payload = {"tool_name": random.choice(["Read", "Write", "Edit", "Bash", "Grep"])}
            elif event_type == "subagent_start":
                payload = {"agent_type": random.choice(["executor", "architect", "explorer"])}
            elif event_type == "file_change":
                payload = {"file_path": f"src/{random.choice(['api', 'components', 'utils'])}/file.ts"}

            event = Event(
                session_id=session.id,
                event_type=event_type,
                timestamp=timestamp,
                payload=payload
            )
            db.add(event)

    # DailyStats (30 days)
    today = date.today()
    for i in range(30):
        current_date = today - timedelta(days=i)

        for project in projects:
            stats = DailyStats(
                project_id=project.id,
                date=current_date,
                tasks_completed=random.randint(1, 5),
                tokens_used=random.randint(5000, 30000),
                session_count=random.randint(1, 5),
                agent_calls=random.randint(5, 20)
            )
            db.add(stats)

    # AgentUsageStats (30 days)
    agent_configs = [
        ("executor", "claude-sonnet-4-5-20250929"),
        ("executor", "claude-haiku-4-5-20251001"),
        ("architect", "claude-opus-4-6"),
        ("architect", "claude-sonnet-4-5-20250929"),
        ("explorer", "claude-haiku-4-5-20251001"),
        ("researcher", "claude-sonnet-4-5-20250929"),
        ("designer", "claude-sonnet-4-5-20250929"),
    ]

    for i in range(30):
        current_date = today - timedelta(days=i)

        for agent_type, model in agent_configs:
            stats = AgentUsageStats(
                agent_type=agent_type,
                model=model,
                date=current_date,
                total_calls=random.randint(10, 50),
                avg_duration_ms=random.randint(800, 3000),
                success_count=random.randint(8, 45),
                failure_count=random.randint(0, 5)
            )
            db.add(stats)

    await db.commit()

    return {
        "status": "success",
        "message": "Demo data seeded successfully",
        "counts": {
            "labels": len(labels),
            "projects": len(projects),
            "milestones": len(milestones),
            "tasks": len(tasks),
            "sessions": len(sessions),
            "daily_stats": 30 * len(projects),
            "agent_usage_stats": 30 * len(agent_configs)
        }
    }


@router.post("/reset")
async def reset_all_data(db: AsyncSession = Depends(get_db)):
    """Delete all data from the database."""

    # Delete in correct order to respect foreign key constraints
    await db.execute(delete(Event))
    await db.execute(delete(ToolCall))
    await db.execute(delete(FileChange))
    await db.execute(delete(Error))
    await db.execute(delete(SkillInvocation))
    await db.execute(delete(AgentExecution))
    await db.execute(delete(Session))
    await db.execute(delete(TaskDependency))
    await db.execute(delete(TaskLabel))
    await db.execute(delete(Task))
    await db.execute(delete(Milestone))
    await db.execute(delete(AgentUsageStats))
    await db.execute(delete(DailyStats))
    await db.execute(delete(Label))
    await db.execute(delete(Project))

    await db.commit()

    return {
        "status": "success",
        "message": "All data has been reset"
    }
