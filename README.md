# NOVA — Team Productivity Platform

**Plan. Collaborate. Deliver.**

A full-stack project management application: teams create projects, plan work on a
drag-and-drop board, assign tasks to members with real roles and permissions, discuss
work in comments, and track progress on a dashboard.

```
React + Vite (client)  ──HTTP/JWT──▶  Express + Prisma (API)  ──SQL──▶  PostgreSQL
```

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Permissions](#permissions)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design decisions](#design-decisions)
- [What I would build next](#what-i-would-build-next)

---

## Features

**Authentication**
- Email + password sign-up and sign-in, passwords hashed with bcrypt (cost 12)
- Stateless JWT sessions, restored on page load via `GET /api/auth/me`
- Profile editing, avatar colour, and password change

**Projects**
- Create, edit, archive and delete projects; colour, key, description, start and target dates
- Auto-generated project key (`NOVA`) used for human-readable task codes (`NOVA-14`)
- Project list with status filters and instant search
- Live progress: completed / total tasks and a percentage bar on every card

**Tasks**
- Five-stage Kanban board (Backlog → To do → In progress → In review → Done)
- Drag and drop across and within columns, with optimistic UI and fractional ordering
- Table view of the same data, and filters for assignee, priority, text and overdue
- Priority, due dates, assignee, description; overdue tasks are called out everywhere
- Per-project task numbering, comments, and automatic `completedAt` stamping

**Collaboration**
- Add teammates by email; people without an account get an invitation link that is
  redeemed automatically when they sign up
- Four roles — owner, admin, member, viewer — enforced on the server for every write
- Comments on tasks, deletable by their author or a project admin
- Project activity feed recording task, member and project events

**Reporting**
- Dashboard with headline metrics, a 14-day completion trend, work due this week,
  your open tasks, and cross-project activity
- Per-project overview: distribution by stage, by priority, and open work per person

**Craft**
- Responsive from 375 px up, with a drawer navigation on small screens
- Loading skeletons, empty states, error states with retry, and toast feedback
- Keyboard-accessible dialogs and board (dnd-kit ships keyboard sensors)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev server, typed end to end |
| Styling | Tailwind CSS 3 | Consistent spacing/colour without a component library to fight |
| Server state | TanStack Query 5 | Caching, invalidation and optimistic updates for the board |
| Routing | React Router 6 | Nested routes for the project tabs |
| Drag & drop | dnd-kit | Accessible (keyboard sensors) and small |
| Charts | Recharts + hand-rolled bars | Recharts for the time series; plain CSS bars where a chart library would be overkill |
| API | Node + Express 4 + TypeScript | Explicit, easy to read, easy to deploy anywhere |
| Validation | Zod | One schema per endpoint, 422s with field-level messages |
| ORM | Prisma 6 | Typed queries, migrations, and a readable schema file |
| Database | PostgreSQL | Relational data — projects, memberships, tasks — with real foreign keys |
| Auth | jsonwebtoken + bcryptjs | Stateless sessions, no server-side session store to run |

---

## Project structure

```
nova/
├── server/                     # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma       # Data model and enums
│   │   └── seed.ts             # Demo workspace: 5 users, 3 projects, 18 tasks
│   ├── scripts/smoke.mjs       # End-to-end API test (40 assertions)
│   └── src/
│       ├── app.ts              # Express app: middleware, CORS, route mounting
│       ├── index.ts            # HTTP server and graceful shutdown
│       ├── lib/                # env, prisma client, jwt, errors, activity log
│       ├── middleware/         # requireAuth, requireProjectRole, error handler
│       └── routes/             # auth, projects, members, tasks, dashboard, users
│
└── client/                     # React single-page app
    └── src/
        ├── components/
        │   ├── charts/         # Completion trend, distribution bars
        │   ├── layout/         # App shell, auth shell
        │   ├── members/        # Member and invitation management
        │   ├── projects/       # Project card, create/edit dialog
        │   ├── tasks/          # Board, list, filters, task dialogs
        │   └── ui/             # Button, Modal, Avatar, feedback states
        ├── context/AuthContext.tsx
        ├── hooks/              # TanStack Query hooks per resource
        ├── lib/                # fetch wrapper, types, constants, formatting
        └── pages/              # Login, Register, Dashboard, Projects, Project, My tasks, Settings
```

---

## Running it locally

**Prerequisites:** Node 18+ and a PostgreSQL database (local, Docker, or a free
[Neon](https://neon.tech) instance).

```bash
# 1. Install dependencies for the root, server and client
npm run install:all

# 2. Create the database (skip if you are using a hosted one)
createdb nova          # or: psql -U postgres -c "CREATE DATABASE nova;"

# 3. Configure the server
cp server/.env.example server/.env
#    then edit server/.env and set DATABASE_URL and JWT_SECRET

# 4. Create the tables and load demo data
npm run db:migrate     # applies server/prisma/migrations (checked into the repo)
npm run db:seed

# 5. Start the API (:4000) and the client (:5173) together
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the API, so no CORS setup is
needed in development.

Useful extras:

```bash
npm run db:studio      # Prisma Studio, a GUI over the database
npm run smoke          # End-to-end API test against a running server
npm run build          # Type-check and build both halves for production
```

---

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string the app queries through (pooled in production) |
| `DIRECT_URL` | yes | Direct (unpooled) connection used only by `prisma migrate`. Same value as `DATABASE_URL` locally |
| `JWT_SECRET` | yes | Secret used to sign session tokens |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `PORT` | no | API port, default `4000` |
| `NODE_ENV` | no | `development` or `production` |
| `CLIENT_ORIGIN` | no | Comma-separated allowed browser origins for CORS |

`client/.env` (only needed when the API is on another domain):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Absolute API base, e.g. `https://nova-api.onrender.com/api` |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Demo accounts

After `npm run db:seed`, every seeded account uses the password `password123`:

| Email | Role in the demo data |
|---|---|
| `jagrat@nova.dev` | Owner of NOVA Web Platform, member elsewhere |
| `priya@nova.dev` | Admin on the main project, owner of the mobile app |
| `rahul@nova.dev` | Member — most engineering tasks |
| `neha@nova.dev` | Designer, owns the marketing project |
| `arjun@nova.dev` | Viewer on the main project — good for testing read-only access |

Signing in as `arjun@nova.dev` is the quickest way to see permissions working: the
board is read-only and the write actions are gone.

---

## Data model

```
User ──< ProjectMember >── Project ──< Task ──< Comment
                              │         │
                              ├──< Activity
                              └──< Invitation
```

| Model | Notes |
|---|---|
| `User` | Unique email, bcrypt hash, display colour |
| `Project` | Owner, key, colour, status, dates |
| `ProjectMember` | Join table carrying the role; unique on `(projectId, userId)` |
| `Task` | Per-project `number`, `status`, `priority`, fractional `position` for board ordering, `completedAt` |
| `Comment` | Task discussion, cascades with the task |
| `Activity` | Append-only project event log with a JSON `meta` payload |
| `Invitation` | Email + token + expiry, redeemed on sign-up |

Two details worth calling out:

- **Fractional positions.** Dropping a card writes one row: the new position is the
  midpoint between its neighbours (`(prev + next) / 2`), so reordering never has to
  renumber a column.
- **Per-project task numbers.** `@@unique([projectId, number])` plus a transaction on
  create gives every task a stable, human-readable code like `NOVA-14`.

---

## API reference

All routes are prefixed with `/api`. Everything except `/health`, `/auth/register`
and `/auth/login` requires `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account (optional `inviteToken`), returns a token |
| `POST` | `/auth/login` | Exchange credentials for a token |
| `GET` | `/auth/me` | Current user |
| `PATCH` | `/auth/me` | Update name, title, avatar colour |
| `POST` | `/auth/change-password` | Change password |

### Projects
| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | Projects you belong to (`?status=`, `?q=`) |
| `POST` | `/projects` | Create a project — you become its owner |
| `GET` | `/projects/:id` | One project with members and progress |
| `PATCH` | `/projects/:id` | Update settings (admin+) |
| `DELETE` | `/projects/:id` | Delete the project (owner) |
| `GET` | `/projects/:id/activity` | Recent events (`?limit=`) |
| `GET` | `/projects/:id/stats` | Counts by status/priority, workload, overdue |

### Members
| Method | Path | Description |
|---|---|---|
| `GET` | `/projects/:id/members` | Members and pending invitations |
| `POST` | `/projects/:id/members` | Add by email, or create an invitation (admin+) |
| `PATCH` | `/projects/:id/members/:userId` | Change a role (admin+) |
| `DELETE` | `/projects/:id/members/:userId` | Remove a member, or leave yourself |
| `DELETE` | `/projects/:id/members/invitations/:invitationId` | Revoke an invite (admin+) |

### Tasks
| Method | Path | Description |
|---|---|---|
| `GET` | `/projects/:id/tasks` | Board/list data (`?status=&priority=&assigneeId=&q=&overdue=`) |
| `POST` | `/projects/:id/tasks` | Create a task (member+) |
| `GET` | `/tasks` | Across all your projects (`?assignee=me&open=true`) |
| `GET` | `/tasks/:taskId` | Task detail with comments |
| `PATCH` | `/tasks/:taskId` | Update fields, or move it on the board (member+) |
| `DELETE` | `/tasks/:taskId` | Delete a task (member+) |
| `GET` | `/tasks/:taskId/comments` | Comments |
| `POST` | `/tasks/:taskId/comments` | Add a comment (member+) |
| `DELETE` | `/tasks/:taskId/comments/:commentId` | Delete (author or admin) |

### Other
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness plus a database round-trip |
| `GET` | `/dashboard` | Metrics, trend, my tasks, upcoming, activity (`?days=`) |
| `GET` | `/users/search?q=` | User typeahead for adding members |

**Error shape.** Failures return `{ "error": "message" }`; validation failures add
`details: [{ path, message }]` with a `422`.

---

## Permissions

| Action | Owner | Admin | Member | Viewer |
|---|:--:|:--:|:--:|:--:|
| View project, tasks, comments | ● | ● | ● | ● |
| Create / edit / move / delete tasks | ● | ● | ● | — |
| Comment | ● | ● | ● | — |
| Add, remove and re-role members | ● | ● | — | — |
| Edit project settings | ● | ● | — | — |
| Delete the project | ● | — | — | — |
| Leave the project | — | ● | ● | ● |

Enforced by `requireProjectRole(minimum)` on the server; the client hides the same
actions with a mirrored `can()` helper, so the UI never offers a button that would 403.
Projects you are not a member of return **404, not 403**, so the API does not leak
which project ids exist.

---

## Testing

`server/scripts/smoke.mjs` is an end-to-end test of the running API — it registers
throwaway users and asserts on the real HTTP responses, including the negative cases
(wrong password, viewer writes, non-member reads, the owner's role being locked).

```bash
npm run dev        # in one terminal
npm run smoke      # in another
```

It cleans up after itself by deleting the project it created, and exits non-zero on
the first failure, so it works as a CI step. Current result:

```
40 passed, 0 failed
```

Covered: registration and duplicate-email conflict, password-length validation, wrong
password, token-less access, project creation and ownership, non-member reads,
member management and role changes, the owner's role being locked, task numbering,
assignee validation, `completedAt` on both transitions, status/text filters, comments
and their validation, activity logging, stats, dashboard shape, and delete permissions.

---

## Deployment

The client and API deploy independently. Deploy the **API first** — the client needs its
URL at build time — then come back and tell the API about the client's origin.

**0. Push the repo to GitHub.** Both Render and Vercel deploy from a repository.

**1. Database — Neon**
1. Create a project at [neon.tech](https://neon.tech). The default database is called
   `neondb` — use it, there is no need to create one named `nova`.
2. From the **Connect** panel copy two strings, both ending in `?sslmode=require`:
   - **pooled** (host contains `-pooler`) → becomes `DATABASE_URL`
   - **direct** (same host without `-pooler`) → becomes `DIRECT_URL`

Migrations need the direct one: Neon's pooler is PgBouncer in transaction mode and
cannot hold the advisory locks `prisma migrate` takes. `schema.prisma` wires this up
with `directUrl`, so the app pools its queries while migrations bypass the pooler.

**2. API — Render** (`render.yaml` is included as a blueprint)

New → Blueprint, point it at the repo, or create a Web Service by hand with:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm ci --include=dev && npm run build && npx prisma migrate deploy` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon **pooled** string (host has `-pooler`) |
| `DIRECT_URL` | the Neon **direct** string (same host, no `-pooler`) |
| `JWT_SECRET` | any long random string (the blueprint generates one) |
| `CLIENT_ORIGIN` | `http://localhost:5173` for now — updated in step 4 |
| `NODE_ENV` | `production` |

`--include=dev` matters: with `NODE_ENV=production` set, plain `npm ci` skips
`typescript`, `tsx` and the Prisma CLI, and the build fails. The build command also
runs `prisma migrate deploy`, so the Neon database gets its tables on first deploy.

Check it came up: `https://<your-api>.onrender.com/api/health` should return
`{"status":"ok","database":"up"}`.

**3. Client — Vercel** (`client/vercel.json` is included)

| Setting | Value |
|---|---|
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env var | `VITE_API_URL` = `https://<your-api>.onrender.com/api` |

`VITE_API_URL` is read at build time, so changing it later needs a redeploy. The
rewrite in `vercel.json` sends every path to `index.html` so client-side routes survive
a refresh.

**4. Close the CORS loop.** Back in Render, set `CLIENT_ORIGIN` to your Vercel URL
(`https://<your-app>.vercel.app`, no trailing slash) and redeploy. Until this is done
the browser blocks every API call.

**5. Seed the hosted database** if you want the demo data:

```bash
DATABASE_URL="<neon pooled url>" DIRECT_URL="<neon direct url>" npm --prefix server run seed
```

**Free-tier behaviour.** Render's free web services sleep after ~15 minutes idle, so
the first request after a pause takes 30–60 seconds; Neon suspends idle compute the
same way. Worth mentioning to anyone reviewing the deployed link.

---

## Design decisions

**JWT in `localStorage`, not an httpOnly cookie.** The client and API sit on different
domains in the deployed setup; a bearer token avoids third-party cookie and CSRF
handling for a two-week project. The trade-off is XSS exposure — with more time this
becomes an httpOnly refresh cookie plus a short-lived access token, which is the note
left in the seeded backlog.

**Roles on the join table.** Putting `role` on `ProjectMember` rather than on `User`
means the same person can be an admin on one project and a viewer on another, which is
how real teams work.

**Optimistic board moves.** A drag writes to the cache first and rolls back on error.
Waiting for a round-trip before the card lands makes a board feel broken.

**Fractional ordering over an integer index.** Moving one card writes one row instead
of renumbering a column.

**404 instead of 403 for projects you cannot see.** Returning 403 would confirm that a
project id exists.

**Activity logging never fails a request.** `logActivity` swallows its own errors — an
audit line is not worth failing a task creation over.

**Charts.** The completion trend is a bar chart, not a smoothed area: daily counts are
discrete, and a line between them would draw values that never existed. The status,
priority and workload panels are plain labelled bars, so colour reinforces identity
rather than carrying it, and the palette was checked for colour-vision separation.

---

## What I would build next

- Real-time board updates over WebSockets so two people dragging cards see each other
- Refresh-token rotation in an httpOnly cookie
- Email delivery for invitations (currently a copyable invite link)
- File attachments on tasks
- Saved filter views and per-user board preferences
- Component and integration tests with Vitest and Testing Library alongside the smoke test
