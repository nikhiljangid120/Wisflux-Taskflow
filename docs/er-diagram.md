# TaskFlow — Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password
        enum role "ADMIN | MEMBER"
        timestamptz createdAt
        timestamptz updatedAt
    }

    refresh_tokens {
        uuid id PK
        uuid userId FK
        varchar tokenHash UK
        timestamptz expiresAt
        boolean revoked
        timestamptz createdAt
    }

    workspaces {
        uuid id PK
        varchar name
        text description
        uuid ownerId FK
        timestamptz createdAt
        timestamptz updatedAt
    }

    workspace_members {
        uuid id PK
        uuid workspaceId FK
        uuid userId FK
        enum role "OWNER | ADMIN | MEMBER"
        timestamptz joinedAt
    }

    projects {
        uuid id PK
        uuid workspaceId FK
        varchar name
        text description
        timestamptz createdAt
        timestamptz updatedAt
    }

    tasks {
        uuid id PK
        uuid projectId FK
        uuid workspaceId FK
        varchar title
        text description
        enum status "TODO | IN_PROGRESS | IN_REVIEW | DONE | CANCELLED"
        enum priority "LOW | MEDIUM | HIGH | URGENT"
        uuid assigneeId FK "nullable"
        uuid parentTaskId FK "nullable - self-ref"
        timestamptz dueAt "nullable"
        timestamptz completedAt "nullable"
        timestamptz createdAt
        timestamptz updatedAt
    }

    comments {
        uuid id PK
        uuid taskId FK
        uuid authorId FK
        text body
        uuid parentId FK "nullable - self-ref"
        timestamptz createdAt
        timestamptz updatedAt
    }

    activities {
        uuid id PK
        uuid workspaceId FK
        uuid actorId FK
        varchar type
        uuid entityId
        varchar entityType
        jsonb payload
        timestamptz createdAt
    }

    notifications {
        uuid id PK
        uuid userId FK
        varchar type
        jsonb payload
        boolean read
        timestamptz createdAt
    }

    users ||--o{ refresh_tokens : "has"
    users ||--o{ workspace_members : "joins via"
    users ||--o{ workspaces : "owns"
    workspaces ||--o{ workspace_members : "has"
    workspaces ||--o{ projects : "contains"
    workspaces ||--o{ activities : "logs"
    projects ||--o{ tasks : "contains"
    tasks ||--o{ tasks : "subtasks (self-ref)"
    tasks ||--o{ comments : "has"
    comments ||--o{ comments : "replies (self-ref)"
    users ||--o{ notifications : "receives"
    users ||--o{ activities : "performs"
```

## Index summary

| Table | Index name | Columns | Purpose |
|---|---|---|---|
| tasks | IDX_tasks_project_status | (projectId, status) | Task list by project + filter by status |
| tasks | IDX_tasks_assigneeId_status | (assigneeId, status) | My tasks view |
| tasks | IDX_tasks_dueAt | (dueAt) | Cron scanner range query |
| workspace_members | IDX_ws_members_workspaceId | (workspaceId) | Membership lookup |
| workspace_members | IDX_ws_members_userId | (userId) | User's workspaces list |
| activities | IDX_activities_workspaceId_createdAt | (workspaceId, createdAt) | Activity feed |
| notifications | IDX_notifications_userId_createdAt | (userId, createdAt DESC) | Notifications inbox |
