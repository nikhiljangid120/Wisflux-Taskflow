# TaskFlow — Architecture

## Overview

TaskFlow is a collaborative task management platform built with NestJS, PostgreSQL, Redis, BullMQ, and Socket.IO. It runs fully in Docker Compose and deploys via GitHub Actions CI/CD.

---

## System architecture

┌─────────────────────────────────────────────────────────────────────┐
│ Client (browser / mobile) │
│ │
│ HTTP REST ────────────┐ WebSocket (Socket.IO) ──────┐ │
└────────────────────────┬┼───────────────────────────────────────┼┬─┘
││ ││
┌────▼▼─────────────────────────────────────▼▼───┐
│ NestJS Application │
│ │
│ Controllers → Guards → Services → Repositories │
│ BullMQ Producers BullMQ Processors │
│ @Cron scheduler Socket.IO Gateway │
└──────────┬──────────────────────┬───────────────┘
│ │
┌───────────────▼──────┐ ┌──────────▼──────────────┐
│ PostgreSQL 16 │ │ Redis 7 │
│ │ │ │
│ users │ │ BullMQ job queues │
│ workspaces │ │ bull:notifications:* │
│ workspace_members │ │ │
│ projects │ └─────────────────────────┘
│ tasks │
│ comments │
│ activities │
│ notifications │
│ refresh_tokens │
└──────────────────────┘


---

## Key architectural decisions

### Multi-tenancy: workspace-level scoping

Every domain resource (project, task, comment, notification) belongs to a workspace either directly (via `workspaceId` column) or transitively (task → project → workspace). Authorization is "is the caller a member of this workspace?", enforced by a reusable `WorkspaceMemberGuard` on every workspace-scoped controller. Service methods additionally include `workspaceId` in every WHERE clause — two independent layers of scoping.

### Authentication: JWT access + refresh token rotation

Short-lived (15 min) JWTs for stateless request authentication. Long-lived refresh tokens stored as SHA-256 hashes in `refresh_tokens` table — if the DB leaks, an attacker gets hashes, not usable tokens. Token rotation on every refresh: the old refresh token is revoked and a new pair is issued. The same "Invalid credentials" error for both wrong-email and wrong-password cases (user enumeration prevention).

### Nested subtasks: adjacency list + recursive CTE

Tasks have a nullable `parentTaskId` self-referencing FK. Subtree retrieval uses a PostgreSQL recursive CTE that traverses all levels in one query. Depth is limited to 5 levels (checked at write time, not read time). Cycle prevention: before changing a parent, a CTE walks the task's descendants and rejects any move to a node already in the subtree.

### Job queues: BullMQ + Redis

All notification side-effects (task assigned, status changed, comment mention, due reminder) go through a BullMQ queue rather than synchronous function calls. This decouples the HTTP response time from notification delivery, enables retry with exponential backoff, and makes the system resilient to Redis downtime (jobs buffer and process when Redis recovers). Default retry: 5 attempts, 2s/4s/8s/16s/32s exponential backoff.

### Due-reminder cron scanner

A `@Cron`-decorated method runs every 5 minutes and queries tasks where `dueAt BETWEEN now AND now + 1 hour` using the `IDX_tasks_dueAt` B-tree index. Reminders are deduplicated via BullMQ job IDs (`due_reminder:{taskId}:{hourWindow}`) — a job with the same ID already in the queue is silently skipped.

### Real-time push: Socket.IO rooms

Each authenticated WebSocket connection joins a personal room `user:{userId}`. The `NotificationsProcessor` calls `gateway.emitToUser(userId, 'notification', notification)` after persisting to the DB. If the user has no open connections, the emit is a no-op. JWT verification happens in `handleConnection` — unauthenticated connections are immediately disconnected.

### Docker: multi-stage image

Stage 1 (builder): installs all deps, compiles TypeScript → dist/. Stage 2 (production): starts fresh, installs only production deps, copies dist/ from Stage 1. Result: ~200 MB image vs ~700 MB for a naive single-stage build.

### Database migrations

Every schema change uses TypeORM migrations — never `synchronize: true`. Generated migrations are never hand-edited after running. Hand-written migrations (for constructs TypeORM decorators can't express, like IF NOT EXISTS guards) use `migration:create` and always include `IF NOT EXISTS` / `IF EXISTS` in every statement to make them safely re-runnable.

---

## Module dependency graph

AppModule
├── AuthModule
│   └── UsersModule
├── WorkspacesModule
├── ProjectsModule
│   └── WorkspacesModule (for guard)
├── TasksModule
│   ├── ProjectsModule (for guard)
│   └── QueuesModule
├── CommentsModule
│   ├── TasksModule (for guard)
│   └── QueuesModule
├── ActivitiesModule
├── NotificationsModule
│   ├── QueuesModule
│   └── GatewayModule
├── SchedulerModule
│   └── QueuesModule
└── GatewayModule
    └── AuthModule (JwtModule)


---

## Performance characteristics

| Query | Index used | Expected latency |
|---|---|---|
| Tasks by project + status | `IDX_tasks_project_status` (composite) | < 1 ms at 100K rows |
| Tasks by assignee + status | `IDX_tasks_assigneeId_status` (composite) | < 1 ms |
| Tasks by due date | `IDX_tasks_dueAt` | < 1 ms |
| Activities by workspace | `IDX_activities_workspaceId_createdAt` | < 1 ms |
| Notifications by user | `IDX_notifications_userId_createdAt` | < 1 ms |
| Full text task title search | No index → Seq Scan | Slow at scale; add `tsvector` GIN index for production |

---

## Scaling notes

**Horizontal app scaling:** The NestJS app is stateless at the HTTP layer. Multiple instances behind a load balancer work without coordination. Socket.IO is not stateless — two clients on different instances won't be in each other's rooms. Solution: `@socket.io/redis-adapter` to share room state via Redis. Not implemented in the bootcamp (one instance is sufficient for the assignment).

**Queue scaling:** BullMQ workers scale horizontally. Adding more app instances means more workers consuming from the same queue — BullMQ handles concurrent job processing safely.

**Read scaling:** Add read replicas; route read-only queries there. TypeORM supports multiple connections in one data source config.
