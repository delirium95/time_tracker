# Time Tracker

A full-stack time tracking application built with Next.js 16, Prisma 7, and SQLite. Track time across projects, view daily summaries, generate reports with charts, and export to CSV.

## Features

- **Timer** — Start/stop timer with task autocomplete and project assignment
- **Today's log** — Entries grouped by project with inline edit and delete
- **Projects** — Create and manage projects with a color picker
- **Reports** — Daily, weekly, and monthly views with bar charts and CSV export
- **Keyboard shortcuts** — `Space` to start/stop, `Esc` to cancel (shown in navbar)
- **Idle detection** — Toast warning after 5 minutes of inactivity while timer runs
- **Tab title** — Live timer displayed in browser tab (`⏱ 00:42:15 — TimeTracker`)
- **Structured logging** — Pino JSON logs with pretty-print in development

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations (creates prisma/dev.db)
npx prisma migrate dev

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

The only required environment variable is `DATABASE_URL`, which defaults to `file:./prisma/dev.db`.

```bash
# .env (already present after npx prisma init)
DATABASE_URL="file:./prisma/dev.db"
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Serve production build |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npx prisma studio` | Open visual database browser |
| `npx prisma migrate dev` | Apply pending migrations |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout: nav + Sonner toaster
│   ├── page.tsx                # Timer page (keyboard shortcuts, idle detection, tab title)
│   ├── projects/page.tsx       # Project management page
│   ├── reports/page.tsx        # Reports with Recharts bar chart + CSV export
│   └── api/
│       ├── projects/
│       │   ├── route.ts        # GET (list), POST (create)
│       │   └── [id]/route.ts   # PUT (update), DELETE
│       ├── time-entries/
│       │   ├── route.ts        # GET (list + filter by date/range), POST (start)
│       │   └── [id]/route.ts   # PUT (stop/edit), DELETE
│       └── reports/
│           └── route.ts        # GET with optional ?export=csv
├── components/
│   ├── TimerBar.tsx            # Top bar: task input + autocomplete, project select, timer display
│   └── TimeEntryList.tsx       # Today's entries grouped by project with inline editing
├── lib/
│   ├── prisma.ts               # Prisma client singleton (better-sqlite3 driver adapter)
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── formatDuration.ts       # HH:MM:SS and Xh Ym formatting utilities
│   └── logger.ts               # Pino logger + withRequestLog helper
├── store/
│   └── timerStore.ts           # Zustand store: timer state, projects, today's entries
└── tests/
    ├── setup.ts                # Vitest global setup
    ├── testDb.ts               # Isolated SQLite test DB factory (temp file + migrations)
    ├── lib/
    │   └── formatDuration.test.ts   # 11 unit tests
    └── api/
        ├── projects.test.ts         # 12 integration tests
        └── timeEntries.test.ts      # 11 integration tests
prisma/
├── schema.prisma               # Project + TimeEntry models
└── migrations/                 # SQL migration history
```

---

## Architecture

### Layer separation

The application follows a clean 3-layer separation inside Next.js App Router:

```
UI Components (React)
      │  reads from / dispatches to
Zustand Store (client state)
      │  calls
API Routes (Next.js Route Handlers)
      │  calls
Prisma Client (data layer)
      │  talks to
SQLite (via better-sqlite3 driver)
```

Each layer has a single responsibility:

- **UI components** render state and dispatch user actions — no business logic, no direct fetch calls outside `page.tsx`
- **`page.tsx`** orchestrates: owns all `fetch()` calls, wires together store + components, handles side effects (keyboard shortcuts, idle detection, tab title)
- **API routes** validate input and map to/from Prisma — no business logic beyond "is this field present"
- **Prisma client** is a singleton in `lib/prisma.ts` — injected via module mock in tests, never instantiated in components

### Why Zustand over Context / useState

Timer state (`isRunning`, `elapsed`, `activeEntryId`) is shared between `TimerBar` and `page.tsx` without prop drilling. Zustand was chosen over React Context because:

- Selectors prevent unnecessary re-renders on unrelated state changes
- The store is accessible outside React (potential future use in service workers)
- Simpler than `useReducer` + Context for this shape of state

### Why SQLite + better-sqlite3

SQLite fits a single-user time tracker perfectly — no server process, no connection pool, zero configuration. `better-sqlite3` is chosen over the `libsql` adapter because it's synchronous, battle-tested, and ships native binaries for all major platforms.

**Prisma 7 note:** Prisma 7 removed the `url` field from `datasource` in `schema.prisma`, moving connection config to `prisma.config.ts`. The `PrismaClient` now requires an explicit driver adapter (`PrismaBetterSqlite3`) rather than resolving the URL itself.

### Testing strategy

Tests use an isolated temp-file SQLite database per test suite, created in `tests/testDb.ts`:

1. `createTestDb()` creates a new temp `.db` file
2. Runs all migrations via `better-sqlite3` directly (fast, no Prisma CLI subprocess)
3. Returns a `PrismaClient` bound to that file
4. `vi.mock("@/lib/prisma")` swaps the singleton for the test client via a getter

This means integration tests hit a **real SQLite database** with the **real schema** — no mocks on the data layer. Each test suite gets its own file so suites can run in parallel without interference.

```
Unit tests     — formatDuration.ts (pure functions, no I/O)
Integration    — API route handlers (real DB, real Prisma queries)
No E2E         — outside scope; would use Playwright against npm start
```

### Logging

Pino is configured in `lib/logger.ts`:

- **Development:** `pino-pretty` transport — human-readable colored output with timestamps
- **Production:** raw JSON lines — structured, parseable by any log aggregator (Datadog, Loki, etc.)

Every API route logs at the operation level (`timeEntries.start`, `projects.create.duplicate`, etc.) with relevant fields (`id`, `count`, `ms`). No PII is logged.

### Task autocomplete

`TimerBar` fetches today's entries and extracts unique task names client-side on each keystroke (debounced by the 2-character threshold). This avoids a dedicated autocomplete endpoint while remaining fast for typical daily entry counts (<100).

---

## API Reference

### Projects

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List all projects sorted by name |
| POST | `/api/projects` | Create project `{ name, color? }` |
| PUT | `/api/projects/:id` | Update project `{ name, color }` |
| DELETE | `/api/projects/:id` | Delete project (entries kept, projectId set to null) |

### Time Entries

| Method | Path | Description |
|---|---|---|
| GET | `/api/time-entries` | List entries; filter with `?date=YYYY-MM-DD` or `?from=…&to=…` |
| POST | `/api/time-entries` | Create entry `{ taskName, projectId?, startTime, endTime?, durationSec? }` |
| PUT | `/api/time-entries/:id` | Update entry (used to stop timer: set `endTime` + `durationSec`) |
| DELETE | `/api/time-entries/:id` | Delete entry |

### Reports

| Method | Path | Description |
|---|---|---|
| GET | `/api/reports?from=…&to=…` | List completed entries in range |
| GET | `/api/reports?from=…&to=…&export=csv` | Download CSV file |
