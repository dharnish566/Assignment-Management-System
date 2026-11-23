# Joineazy — Student, Group & Assignment Management System

> Role-based academic collaboration and assignment-confirmation platform built with React, Express, and PostgreSQL.
>
> **Documentation status:** Implementation-aligned template. The precise routes, environment variable names, scripts, deployment URLs, and implemented behavior must be checked against the repository before submission. Do not present optional features as completed.

## 1. Project overview

Joineazy helps professors distribute assignments and monitor student/group progress while students form groups, access assignment requirements and external upload destinations, and record a two-step confirmation after submitting their work.

The system distinguishes **files uploaded to an external provider** (OneDrive or, if implemented, Dropbox) from **submission confirmations saved in PostgreSQL**. Opening a link does not prove an upload happened. Without a genuine authorized provider integration, Joineazy records a student declaration—not provider-verified upload evidence.

### Features

| Role | Capability |
| --- | --- |
| Student | Register and sign in; create or join a group; manage invitations; see eligible assignments; open external submission link; confirm in two steps; track personal/group progress. |
| Professor (Admin) | Sign in; create, edit and publish assignments; assign all students or selected groups; view assignment details; monitor individual acknowledgments and group-level declarations; review dashboard metrics. |

**Submission provider note:** The assignment specification calls for **OneDrive**. If the implementation additionally supports Dropbox, describe it as an extension, and retain OneDrive support for a specification-compliant demonstration.

## 2. Technical stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router | Responsive role-based interface |
| API | Node.js, Express | REST endpoints and business operations |
| Data | PostgreSQL, `pg` | Relational persistence and transactional consistency |
| Authentication | JWT, bcrypt | Authentication and role authorization |
| Validation | Zod or equivalent **[verify]** | Input validation |
| Charts | Recharts **[verify]** | Submission analytics |
| Local deployment | Docker, Docker Compose | Repeatable development environment |
| File submission | OneDrive File Request; optional Dropbox File Request | External file-upload destination |

## 3. Architecture overview

A **modular monolith** keeps deployment straightforward while separating authentication, groups, assignments, submissions, and analytics into maintainable modules.

```mermaid
flowchart TB
    subgraph Client[Client — React + Tailwind]
      Student[Student portal]
      Admin[Professor portal]
    end
    Student -->|HTTPS JSON + JWT| API
    Admin -->|HTTPS JSON + JWT| API
    subgraph Server[Node.js / Express API]
      API[Routes + middleware]
      Controllers[Controllers]
      Services[Business services]
      Repos[Repositories / parameterized SQL]
      API --> Controllers --> Services --> Repos
    end
    Repos <-->|Pool, SQL, transactions| DB[(PostgreSQL)]
    Student -.->|Open external upload link| Storage[OneDrive / Dropbox File Request]
    Admin -.->|Create upload request and paste URL| Storage
```

**Request lifecycle:** React calls a protected endpoint → JWT middleware authenticates the caller → authorization verifies role and resource ownership → request validation checks inputs → service enforces business rules → repository executes parameterized SQL → Express returns JSON → UI updates from the response.

**Architecture boundaries:** React does not access PostgreSQL directly. No uploaded assignment file is stored in PostgreSQL. File access and successful upload are managed externally; local status changes are persisted only after an authenticated confirmation.

### Example: group assignment submission flow

```mermaid
sequenceDiagram
    actor Professor
    participant UI as React
    participant API as Express
    participant DB as PostgreSQL
    actor Student
    participant Cloud as External file request
    Professor->>UI: Create assignment + link + target groups
    UI->>API: POST assignment (JWT)
    API->>DB: Transaction: assignment, targets, eligible members
    DB-->>API: Saved record and ID
    API-->>UI: Created assignment
    Student->>UI: Open eligible assignment details
    UI->>API: GET assignment details (JWT)
    API->>DB: Validate eligible target, fetch metadata
    DB-->>API: Assignment and submission URL
    API-->>UI: Assignment details
    Student->>Cloud: Open link and upload externally
    Student->>UI: Return and confirm twice
    UI->>API: POST confirmation (JWT)
    API->>DB: Verify eligibility + insert timestamp
    DB-->>API: Saved confirmation
    API-->>UI: Updated status
    Professor->>UI: Open submission tracker
    UI->>API: GET submission stats (JWT)
    API->>DB: Aggregate target and confirmation records
    DB-->>API: Counts and timestamps
    API-->>UI: Tracker results
```

## 4. Database schema and relationships

> The following is the **recommended logical model** discussed for this project. Check it against actual migrations before submitting; if table names differ, update the diagram and API documentation to match.

```mermaid
erDiagram
    USERS ||--o{ GROUPS : leads
    USERS ||--o{ GROUP_MEMBERS : joins
    GROUPS ||--o{ GROUP_MEMBERS : contains
    USERS ||--o{ GROUP_INVITATIONS : receives
    GROUPS ||--o{ GROUP_INVITATIONS : issues
    USERS ||--o{ ASSIGNMENTS : creates
    ASSIGNMENTS ||--o{ ASSIGNMENT_TARGETS : distributes
    GROUPS o|--o{ ASSIGNMENT_TARGETS : group_recipient
    USERS o|--o{ ASSIGNMENT_TARGETS : student_recipient
    ASSIGNMENT_TARGETS ||--o{ TARGET_STUDENTS : includes
    USERS ||--o{ TARGET_STUDENTS : eligible
    ASSIGNMENT_TARGETS ||--o| GROUP_SUBMISSIONS : declares
    TARGET_STUDENTS ||--o| SUBMISSION_CONFIRMATIONS : acknowledges

    USERS {
      uuid id PK
      varchar full_name
      varchar email UK
      varchar student_id UK
      text password_hash
      varchar role
      timestamptz created_at
    }
    GROUPS {
      uuid id PK
      varchar name
      uuid leader_id FK
      timestamptz created_at
    }
    GROUP_MEMBERS {
      uuid id PK
      uuid group_id FK
      uuid student_id FK
      varchar status
      timestamptz joined_at
    }
    GROUP_INVITATIONS {
      uuid id PK
      uuid group_id FK
      uuid invitee_id FK
      uuid invited_by FK
      varchar status
    }
    ASSIGNMENTS {
      uuid id PK
      uuid professor_id FK
      varchar title
      text description
      timestamptz due_at
      varchar status
      varchar audience_type
      text submission_url
    }
    ASSIGNMENT_TARGETS {
      uuid id PK
      uuid assignment_id FK
      varchar target_type
      uuid group_id FK
      uuid student_id FK
    }
    TARGET_STUDENTS {
      uuid id PK
      uuid target_id FK
      uuid student_id FK
    }
    GROUP_SUBMISSIONS {
      uuid id PK
      uuid target_id FK
      uuid submitted_by FK
      timestamptz submitted_at
    }
    SUBMISSION_CONFIRMATIONS {
      uuid id PK
      uuid target_student_id FK
      timestamptz confirmed_at
    }
```

| Table | Responsibility | Integrity controls |
| --- | --- | --- |
| `users` | Student/professor accounts | Unique email; role validation; hashed password |
| `groups` | Group identity and leader | FK to student leader, enforced in service |
| `group_members` | Group membership history | FK relations; no duplicate active membership |
| `group_invitations` | Pending/accepted/declined invitations | Valid invitee and group; no redundant pending invites |
| `assignments` | Content, deadline, provider link, status, creator | Valid owner and status; valid URL before publishing |
| `assignment_targets` | One student or one group recipient per row | Exclusive recipient check; unique assignment-target pair |
| `target_students` | Snapshot of students eligible for a target | Unique target/student pair |
| `group_submissions` | Leader's declaration of group submission | At most one declaration per group target |
| `submission_confirmations` | Individual student's acknowledgment | At most one confirmation per eligible target student |

**Key cardinalities:** Users–groups are many-to-many through `group_members`; professors–assignments are one-to-many; assignments–targets are one-to-many; targets–eligible students are one-to-many. Group submissions and individual confirmations remain distinct to avoid inflating completion metrics.

### Data consistency decisions

- Use UUID keys, foreign keys, unique indexes, and check constraints.
- Use `TIMESTAMPTZ` for creation, due, and confirmation timestamps; render in the local timezone.
- Use transactions when creating groups + leader membership, accepting invitations, and publishing assignments + recipients + eligibility snapshots.
- Do not trust role, group, or owner IDs supplied by the client without authorization checks.
- A group membership snapshot prevents later membership edits from rewriting historical assignment eligibility.
- Use server-generated timestamps to label late confirmations.
- For an assignment-level **all-students** audience, create student targets; for **selected groups**, create group targets.
- If the actual schema uses `onedrive_url` rather than `submission_url`, document that column instead. Dropbox support may use `submission_provider` + `submission_url` **only if implemented**.

## 5. API reference

> **Route contract to verify:** Endpoints below illustrate the intended REST API. Compare each method, URL, request, response, and permissions against the implemented Express router before publishing. Remove or correct any endpoint not present.

**Base path:** `/api` · **Authentication:** `Authorization: Bearer <access_token>` for protected endpoints.

### Authentication

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a student (never self-register admin) |
| POST | `/auth/login` | Public | Authenticate and issue JWT |
| GET | `/auth/me` | Authenticated | Retrieve signed-in account |

### Groups and invitations

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/groups` | Student | Create group, become leader |
| GET | `/groups/me` | Student | View own group |
| GET | `/groups/:id` | Authorized member/admin | View group details |
| POST | `/groups/:id/invitations` | Group leader | Invite registered student |
| GET | `/invitations/me` | Student | View invitations |
| PATCH | `/invitations/:id` | Invited student | Accept/decline invitation |
| DELETE | `/groups/:id/members/:studentId` | Group leader | Remove permitted group member |

### Assignments and submissions

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/assignments` | Professor | Create assignment/draft |
| GET | `/assignments` | Authorized | List visible assignments |
| GET | `/assignments/:id` | Authorized | Assignment details and external link |
| PATCH | `/assignments/:id` | Owning professor | Update allowed fields |
| POST | `/assignments/:id/publish` | Owning professor | Publish and assign recipients **[verify separate route]** |
| POST | `/assignments/:id/confirmations` | Eligible student | Record individual confirmation |
| POST | `/assignment-targets/:targetId/group-submission` | Eligible group leader | Declare group upload complete |
| GET | `/admin/assignments/:id/submissions` | Authorized professor | Track group/student confirmations |
| GET | `/student/progress` | Student | Retrieve eligible assignment progress |
| GET | `/admin/dashboard` | Professor | Summary metrics |
| GET | `/admin/analytics` | Professor | Aggregated submission statistics |

### Example request/response — assignment creation

```http
POST /api/assignments
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "title": "Library Management System",
  "description": "Build a full-stack library application and provide the deliverables.",
  "due_at": "2026-11-26T18:29:00Z",
  "audience_type": "SELECTED_GROUPS",
  "group_ids": ["<existing-group-uuid>"],
  "submission_provider": "ONEDRIVE",
  "submission_url": "<real-file-request-url>"
}
```

The concrete request field names must match the implementation. If the backend still uses `onedrive_url`, use that instead of the generic submission fields. Never claim an illustrative URL is a working upload destination.

**Suggested HTTP conventions:** `200` success, `201` created, `400` bad request, `401` unauthenticated, `403` forbidden, `404` nonexistent/unavailable resource, `409` duplicate/conflict, `422` invalid inputs (if used), `500` internal error. Use one consistent JSON error envelope and ensure frontend handling matches.

## 6. Local development setup

### Prerequisites

- Node.js and npm (use versions supported by `package.json`; list exact tested versions before submission)
- PostgreSQL installed locally, or Docker Desktop for container-based setup
- Git
- A valid OneDrive File Request URL for a complete external-upload demonstration

### Step A — Clone and install

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
cd backend
npm install
cd ../frontend
npm install
```

### Step B — Create PostgreSQL database (local mode)

In pgAdmin, create a database named `joineazy_db`, or execute `CREATE DATABASE joineazy_db;` from an existing database session.

### Step C — Configure environment files

Create `backend/.env` based on the committed `backend/.env.example`:

```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/joineazy_db
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_VALUE
FRONTEND_URL=http://localhost:5173
# Optional, only if your seed implementation reads it:
DEMO_SEED_PASSWORD=REPLACE_WITH_LOCAL_DEMO_PASSWORD
```

Create `frontend/.env` based on `frontend/.env.example`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

**Security:** These are example values, not credentials. Use unique secrets; URL-encode reserved characters in database URL passwords. Never commit `.env` or upload secrets in screenshots or demo videos. The frontend variable name must match the actual Axios/fetch configuration.

### Step D — Migrate and seed

Run the **scripts present in your repository**. For example, if defined in `backend/package.json`:

```bash
cd backend
npm run db:migrate
npm run db:seed:demo
```

Do not assume these scripts exist. If your backend uses alternate commands, replace the examples. Migration scripts create the tables; the seed populates development sample data. Do not run destructive demo seeds against production.

### Step E — Start both applications

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open the frontend URL printed by Vite (typically `http://localhost:5173`). The API typically runs on port `5000` if configured as above.

### Step F — Docker Compose (if configured)

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

When PostgreSQL runs as a Compose service named `postgres`, the backend container uses `postgres` as the database host, not `localhost`. Document any migration/seed commands needed in containers. Confirm the actual services and ports in `docker-compose.yml`.

## 7. Demo walkthrough

1. Sign in as a seeded professor account.
2. Create an assignment with a title, deadline, audience, and real File Request link.
3. Publish the assignment and open its professor detail page.
4. Verify the configured submission destination and assigned recipients appear.
5. Sign in as a student eligible for the assignment.
6. Open assignment details and launch the external file-request page.
7. Upload a harmless sample file through the provider; return to Joineazy.
8. Check the acknowledgment box and complete the final confirmation dialog.
9. Verify the confirmed status persists after a page refresh.
10. Return to the professor portal to inspect updated student/group tracking and dashboard metrics.

**Group policy:** Where implemented, the group leader's group-level submission declaration and individual member acknowledgments are tracked separately.

### Demo login credentials

Use the following **development-only seeded accounts** to explore both portals:

| Role | Email | Password |
| --- | --- | --- |
| Professor (Admin) | `rajesh@joineazy.test` | `change-me-demo-seed` |
| Student | `kavin@joineazy.test` | `change-me-demo-seed` |

These credentials are intended **only for demonstration and local testing**. They must match the password configured when running the demo seed (for example, `DEMO_SEED_PASSWORD=change-me-demo-seed` in the local `backend/.env`). If the database was seeded with a different password, update/reseed the demo accounts using the existing safe seed process. **Never reuse this password for real accounts, and remove or disable demo accounts on a public production deployment.**

## 8. Design and implementation decisions

| Decision | Reason / trade-off |
| --- | --- |
| Modular monolith instead of microservices | Clear module boundaries, lower deployment and debugging overhead for current scope |
| PostgreSQL relational schema | Enforces group membership and assignment-recipient relationships with FK and unique constraints |
| JWT + backend role/ownership checks | UI visibility alone does not provide authorization |
| External file-request links | Keeps file storage out of application infrastructure and aligns with assignment scope |
| Two-step confirmation | Prevents accidental self-declaration; explicitly **does not** verify provider upload |
| Group eligibility snapshot | Historical assignments stay consistent when groups change |
| Separate group submission and individual acknowledgment | Accurate group and student analytics |
| Transactional multi-table operations | Avoids partial group creation or assignment publication |
| Docker Compose for local setup | Reproducible services and developer onboarding |
| Flat neutral UI, accessible components | Keeps academic workflows legible and reduces interface confusion |

### Limitations and future improvements

- **Provider upload verification:** Without an authenticated and supported OneDrive/Dropbox integration, status means **student confirmed**, not **file upload verified**.
- **External permissions:** Professors must create and test the File Request; the application cannot guarantee a saved URL remains active.
- **Production operations:** Add monitoring, backups, secret management, migration rollout procedures, and audit logging for wider institutional adoption.
- **Optional enhancements:** Email invitations, deadline reminders, richer activity auditing, and integration with institutional SSO.

## 9. Deployment

| Component | Example platform | Required configuration |
| --- | --- | --- |
| Frontend | Vercel | Frontend build/output settings, API base URL |
| Backend | Node-capable hosting provider | App start command, JWT secret, CORS origin, database URL |
| Database | Managed PostgreSQL | Private/secured access, migrations, backups, TLS as required |

**Deployment sequence:** Provision database → run migrations → configure backend environment → deploy backend and verify health/API endpoints → deploy frontend with correct API URL → configure CORS → perform role-based smoke tests.

A local PostgreSQL connection string using `localhost` **cannot** connect a remotely hosted backend to the database running on your own computer. Use a hosted PostgreSQL connection string for the deployed API.

**Live links (fill after deployment):**

- **GitHub repository:** `<GITHUB_URL>`
- **Live application:** `<DEPLOYED_FRONTEND_URL>`
- **Demo video:** `<DEMO_VIDEO_URL>`

## 10. Verification checklist

- [ ] All documented paths and commands match actual project files.
- [ ] Migrations and seed scripts execute successfully.
- [ ] Student and professor logins work.
- [ ] Role/ownership checks reject unauthorized requests.
- [ ] Group creation and invitation flow work.
- [ ] Assignment creation and detail routes work without false 404 errors.
- [ ] Every assignment displays its own correct external submission URL.
- [ ] Opening an external URL does not auto-confirm completion.
- [ ] Two-step confirmation persists to PostgreSQL.
- [ ] Professor submission tracker and student progress show consistent records.
- [ ] Frontend production build succeeds.
- [ ] Docker Compose workflow runs, if supplied.
- [ ] ER and architecture diagrams accurately reflect the implementation.
- [ ] Live app and demo links are public/accessible to reviewers.

---

**Submission:** Prepare the required PDF containing the repository, working demo video, and deployed platform links; use the assignment's `FullName-Task1.pdf` naming convention.

**License:** Add a license only if you intend to grant public reuse permissions. Otherwise leave this section unspecified.
