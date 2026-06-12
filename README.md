# TaskFlow
A collaborative task management platform built with NestJS, PostgreSQL, Redis, BullMQ, and Socket.IO. Built as part of a full-stack bootcamp across three parts.

[![CI/CD](https://github.com/nikhiljangid120/Wisflux-Taskflow/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/nikhiljangid120/Wisflux-Taskflow/actions/workflows/ci-cd.yml)

---

## Features
- **Auth**: JWT access + refresh token rotation, bcrypt password hashing
- **Workspaces**: Multi-tenant containers with OWNER / ADMIN / MEMBER roles
- **Projects**: Scoped to workspaces
- **Tasks**: Status, priority, assignment, due dates
- **Nested subtasks**: Recursive CTE, depth limit 5, cycle prevention
- **Comments**: Per-task, one-level threading
- **Activity log**: Polymorphic JSONB event store
- **Notifications**: Queue-backed (BullMQ), persisted to DB, real-time via Socket.IO
- **Due reminders**: Cron scanner with deduplication and exponential-backoff retry
- **Docker**: Multi-stage image, single `docker-compose up`
- **CI/CD**: GitHub Actions — lint, test, build, push to GHCR

---

## Quick start (Docker Compose)

```bash
# 1. Clone
git clone https://github.com/nikhiljangid120/Wisflux-Taskflow.git
cd Wisflux-Taskflow/taskflow

# 2. Configure
cp .env.example .env.docker
# Edit .env.docker and set real JWT secrets

# 3. Start
docker-compose up --build

# 4. Test
curl http://localhost:3000/health
# → {"status":"ok"}
```
Swagger UI: http://localhost:3000/api/docs

## Local development (no Docker for the app)
*Prerequisites: Node 20+, Docker (for Postgres and Redis)*

```bash
# Start Postgres and Redis
docker run -d --name taskflow-postgres -p 5432:5432 \
  -e POSTGRES_USER=taskflow -e POSTGRES_PASSWORD=taskflow \
  -e POSTGRES_DB=taskflow_db postgres:16-alpine

docker run -d --name taskflow-redis -p 6379:6379 redis:7-alpine

# Install and configure
npm install
cp .env.example .env
# Edit .env with your local values

# Migrate and start
npm run migration:run
npm run start:dev
```

## Running tests
```bash
npm test              # all unit tests
npm test -- --watch   # watch mode
npm test -- --coverage
```

## API overview
All endpoints are documented in Swagger at `/api/docs`.

| Group | Base path | Auth required |
|---|---|---|
| Auth | `/auth` | No (register, login); Yes (refresh, logout) |
| Users | `/users` | Yes |
| Workspaces | `/workspaces` | Yes |
| Projects | `/workspaces/:wsId/projects` | Yes + workspace member |
| Tasks | `/workspaces/:wsId/projects/:projId/tasks` | Yes + workspace member |
| Comments | `/workspaces/:wsId/projects/:projId/tasks/:taskId/comments` | Yes + workspace member |
| Notifications | `/notifications` | Yes |

## WebSocket events
Connect to `ws://localhost:3000` using the `socket.io-client` library:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: '<your JWT access token>' },
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

Events emitted by the server:

| Event | Payload | When |
|---|---|---|
| `notification` | Notification object | Whenever a notification is created for the connected user |

## Architecture
See `ARCHITECTURE.md` for the full architecture document.
See `docs/er-diagram.md` for the ER diagram.

## Project structure
```
src/
  auth/           JWT auth, refresh tokens, guards, decorators
  users/          User entity, UsersService
  workspaces/     Workspace entity, membership, WorkspaceMemberGuard
  projects/       Project entity, workspace-scoped
  tasks/          Task entity, subtask CTE, status/priority
  comments/       Comment entity, mention detection
  activities/     Activity log (polymorphic JSONB)
  notifications/  Notification entity, service, controller, BullMQ processor
  queues/         Queue constants, job payload types, QueuesModule
  scheduler/      @Cron scanner for due-soon tasks
  gateway/        Socket.IO gateway (JWT auth, room-based emit)
  migrations/     All TypeORM migrations (never auto-generated after run)
  test-utils/     Shared mock factories for unit tests
```

## Environment variables
See `.env.example` for all required variables.

| Variable | Description |
|---|---|
| `POSTGRES_HOST` | Postgres host (localhost / postgres in Docker) |
| `POSTGRES_PORT` | Postgres port (default: 5432) |
| `POSTGRES_USER` | Postgres user |
| `POSTGRES_PASSWORD` | Postgres password |
| `POSTGRES_DB` | Database name |
| `JWT_ACCESS_SECRET` | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 32 chars) |
| `REDIS_HOST` | Redis host (localhost / redis in Docker) |
| `REDIS_PORT` | Redis port (default: 6379) |
| `PORT` | HTTP server port (default: 3000) |
