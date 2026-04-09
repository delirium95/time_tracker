# Prompt Log

This file documents all prompts used to build the Time Tracker application via Claude Code (claude-sonnet-4-6). Included for reproducibility per task requirements.

---

## Session 1 — Scaffolding & Core

**Context:** The test task PDF was at `/home/ubuntu/Desktop/test-project/AI Developer Test Task.pdf`. Claude read it and began building the app in `/home/ubuntu/Desktop/time-tracker/`.

---

### Prompt 1
> go for Desktop, test-project, and check pdf file here

**What happened:**
- Claude read the PDF task description
- Ran `create-next-app` with TypeScript, Tailwind CSS, App Router, `src/` directory
- Installed `prisma`, `@prisma/client`, `date-fns`, `zustand`, `better-sqlite3`, `@prisma/adapter-better-sqlite3`
- Ran `npx prisma init --datasource-provider sqlite`
- Wrote `prisma/schema.prisma` with `Project` and `TimeEntry` models
- Ran `npx prisma migrate dev --name init` and `npx prisma generate`

**Key decision made:** Created project in `/home/ubuntu/Desktop/time-tracker/` (not inside `test-project/` which contained the PDF)

**Prisma 7 issue encountered and fixed:** Prisma 7 removed `url` from `datasource` in `schema.prisma` — moved to `prisma.config.ts`. Also required explicit driver adapter (`PrismaBetterSqlite3`) in `PrismaClient` constructor — found correct export name `PrismaBetterSqlite3` (not `PrismaLibSQL`).

---

### Prompt 2 *(continuation after context compaction)*
> *(session resumed automatically)*

**What happened — data layer:**
- Created `src/lib/prisma.ts` — Prisma singleton using `PrismaBetterSqlite3` adapter, resolves `DATABASE_URL` to absolute path
- Created `src/lib/types.ts` — shared `Project`, `TimeEntry`, `CreateTimeEntryInput`, `UpdateTimeEntryInput` interfaces

**What happened — API routes:**
- `src/app/api/projects/route.ts` — `GET` (list sorted by name), `POST` (create with 400/409 validation)
- `src/app/api/projects/[id]/route.ts` — `PUT` (update), `DELETE` (with 404 handling)
- `src/app/api/time-entries/route.ts` — `GET` with `?date` / `?from&to` filtering, `POST`
- `src/app/api/time-entries/[id]/route.ts` — `PUT` (stop timer / edit), `DELETE`
- `src/app/api/reports/route.ts` — `GET` with optional `?export=csv` for CSV download

**What happened — state & UI:**
- `src/store/timerStore.ts` — Zustand store with `isRunning`, `elapsed`, `taskName`, `selectedProjectId`, `activeEntryId`, `projects`, `todayEntries`
- `src/lib/formatDuration.ts` — `formatDuration(sec)` → `HH:MM:SS`, `formatHM(sec)` → `Xh Ym`
- `src/components/TimerBar.tsx` — task autocomplete, project dropdown, live elapsed display, Start/Stop buttons
- `src/components/TimeEntryList.tsx` — entries grouped by project, inline edit (task name, time, project), delete
- `src/app/page.tsx` — main page wiring TimerBar + TimeEntryList with data fetching
- `src/app/layout.tsx` — root layout with nav (Timer / Projects / Reports links)
- `src/app/projects/page.tsx` — project CRUD with preset color picker
- `src/app/reports/page.tsx` — day/week/month period selector, by-project summary, entry log, CSV export

Build passed. Dev server confirmed working via `curl /api/projects` and `POST /api/time-entries`.

---

## Session 2 — Tests, Logging, and Fancy Features

### Prompt 3
> також може додамо тести, логування, ще якісь прикольні такі "наворочені" штуки ?

*(Translation: "maybe we also add tests, logging, some cool fancy stuff?")*

**Plan agreed:**
- Vitest for unit + integration tests
- Pino structured logging
- Recharts daily bar chart on Reports
- Sonner toast notifications
- Keyboard shortcuts (Space / Esc)
- Browser tab title showing live timer
- Idle detection warning after 5 min

---

**Step 1 — Install dependencies:**
```bash
npm install pino pino-http pino-pretty sonner recharts
npm install --save-dev vitest @vitejs/plugin-react @vitest/coverage-v8 supertest @types/supertest
```

**Step 2 — Vitest config** (`vitest.config.ts`):
- `environment: "node"` — no jsdom needed for API route tests
- `globals: true` — no need to import `describe`/`it` everywhere
- path alias `@` → `src/`

**Step 3 — Tests:**

`src/tests/testDb.ts` — factory that:
1. Creates a temp file (`os.tmpdir()/test-<random>.db`)
2. Runs migration SQL directly via `better-sqlite3` (no CLI subprocess)
3. Closes the write handle, creates `PrismaClient` via `PrismaBetterSqlite3` pointing at same file
4. Returns `{ prisma, cleanup }` — cleanup deletes the temp file

**Why temp file instead of `:memory:`:** Prisma's adapter creates its own DB connection internally; a separate `Database(":memory:")` instance is a *different* database. Temp file lets both the migration step and Prisma use the same data.

`src/tests/lib/formatDuration.test.ts` — 11 unit tests for `formatDuration` and `formatHM` covering zero, sub-minute, hours+minutes, large values.

`src/tests/api/projects.test.ts` — 12 integration tests:
- `GET` empty + sorted list
- `POST` default color, custom color, 400 on empty name, 400 on whitespace, 409 on duplicate, trim
- `PUT` update name+color, 404 on ghost id
- `DELETE` success + 404

`src/tests/api/timeEntries.test.ts` — 11 integration tests:
- `POST` without endTime, with duration, without project, 400 on empty name, trim
- `GET` filter by date, by range, no filter
- `PUT` update + set endTime, 404
- `DELETE` success

**Mock strategy:** `vi.mock("@/lib/prisma", () => ({ get prisma() { return testPrisma } }))` — getter pattern ensures the mock returns the instance set in `beforeAll`, not a stale closure.

**Step 4 — Pino logging** (`src/lib/logger.ts`):
- `pino-pretty` transport in non-production for colored human-readable output
- Raw JSON in production for log aggregators
- Each API route logs operation name + relevant fields (id, count, ms)

**Step 5 — Fancy UI features:**

*Sonner toasts* — added `<Toaster position="bottom-right" richColors />` to root layout. Toasts fire on: timer stopped ("Logged HH:MM:SS"), entry updated, entry deleted, CSV export started, idle warning (persistent with "Stop timer" action button).

*Keyboard shortcuts* in `page.tsx`:
- `Space` — triggers `[data-start-btn]` click to start, or calls `handleStop` if running
- `Esc` — stops running timer
- Guard: skip if `event.target` is `INPUT`, `SELECT`, or `TEXTAREA`

*Browser tab title* — `useEffect` on `[isRunning, elapsed]` sets `document.title = "⏱ HH:MM:SS — TimeTracker"` while running, resets to `"TimeTracker"` on stop.

*Idle detection* — `useEffect` attaches `mousemove` + `keydown` listeners to reset `lastActivityRef`. A 30-second `setInterval` checks if `Date.now() - lastActivity > 5 minutes` and fires a persistent Sonner toast with a Stop action. The toast only fires once per idle period (`idleToastShownRef`).

*Recharts bar chart* in Reports — `BarChart` with `eachDayOfInterval` from `date-fns` to build one bar per day. Empty days render gray bars, active days render indigo. Progress bars per project with percentage calculation.

**Step 6 — Fix TypeScript error** in Recharts `Tooltip.formatter` — changed `(v: number)` to `(v)` since Recharts types `value` as `ValueType | undefined`.

**Final result:** `npm test` → 34/34 passed, `npm run build` → clean.

---

## Session 3 — README, Prompt Log, and Vercel Deployment

### Prompt 4
> Чіткий README з інструкціями / Опис архітектурних рішень / Усі зміни мають бути відтворювані: кандидат зобов'язаний вести лог промптів

**What happened:**
- Wrote `README.md` with quick start, scripts table, full project structure, architecture section, API reference
- Wrote `PROMPTS.md` (this file)

---

### Prompt 5
> now I have to push to https://github.com/delirium95/time_tracker.git but under nikita3grynov@gmail.com

**What happened:**
- Set `git config user.email "nikita3grynov@gmail.com"` locally in the repo
- Added `.db` files to `.gitignore`, ran `git rm --cached` to untrack them
- Committed all 31 files, added remote, pushed with provided GitHub PAT
- Cleared PAT from remote URL after push

---

### Prompt 6
> тепер допоможи з деплоєм у версель

**What happened — database migration:**
SQLite file-based DB doesn't work on Vercel (serverless, ephemeral filesystem). Switched to **Turso** (hosted SQLite, libsql protocol).

1. Installed Turso CLI via `curl -sSfL https://get.tur.so/install.sh`
2. User already had database: `libsql://time-tracker-delirium95.aws-us-west-2.turso.io`
3. Auth via `turso config set token` (headless flow for remote dev environment)
4. Created DB auth token: `turso db tokens create time-tracker`
5. Applied schema via `turso db shell` (Prisma migrate doesn't support `libsql://` URLs)

**Code changes:**
- Installed `@libsql/client @prisma/adapter-libsql`
- Updated `src/lib/prisma.ts` — replaced `PrismaBetterSqlite3` with `PrismaLibSql`, reads `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Updated `prisma.config.ts` — simplified to just pass URL (authToken not supported in config type)
- Tests unchanged — still use `better-sqlite3` via `createTestDb()` (correct: tests should be isolated from production DB)

**Issues encountered:**
- `PrismaLibSQL` → correct export name is `PrismaLibSql` (case sensitive)
- `PrismaLibSql` takes a Config object `{ url, authToken }`, not a pre-created Client instance
- Vercel build caught two additional TS errors in `reports/route.ts`: implicit `any` on map callbacks — fixed by adding explicit types

---

## Session 4 — README and Prompt Log Updates

### Prompt 7
> також не забудь оновити рідмі і логи промптів

**What happened:**
- Added Deployment section to README (live URL, env vars table, deploy-your-own instructions, local vs production DB routing note)
- Updated PROMPTS.md with sessions 3–4

---

## Session 3 — README and Prompt Log *(original heading — kept for history)*

### Prompt 4
> Чіткий README з інструкціями / Опис архітектурних рішень / Усі зміни мають бути відтворювані: кандидат зобов'язаний вести лог промптів

*(Translation: "Clear README with instructions / Description of architectural decisions / All changes must be reproducible: the candidate must maintain a prompt log")*

**What happened:**
- Wrote `README.md` with: quick start, scripts table, full project structure, architecture section (layer diagram, Zustand rationale, SQLite/Prisma 7 decisions, testing strategy, logging config, autocomplete approach), full API reference
- Wrote this `PROMPTS.md` file

---

## Reproducibility Notes

To reproduce this project from scratch on a clean machine:

```bash
# 1. Bootstrap
npx create-next-app@latest time-tracker \
  --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
cd time-tracker

# 2. Install runtime deps
npm install prisma @prisma/client better-sqlite3 \
  @prisma/adapter-better-sqlite3 date-fns zustand \
  pino pino-pretty sonner recharts

# 3. Install dev deps
npm install --save-dev @types/better-sqlite3 \
  vitest @vitejs/plugin-react @vitest/coverage-v8

# 4. Init Prisma with SQLite
npx prisma init --datasource-provider sqlite

# 5. Replace generated schema.prisma with the Project + TimeEntry models
# 6. Edit prisma.config.ts to keep datasource.url
# 7. Apply migration
npx prisma migrate dev --name init
npx prisma generate

# 8. Copy all src/ files from this repo
# 9. npm run dev → http://localhost:3000
# 10. npm test → 34/34 passed
```

All non-obvious decisions are explained in README.md § Architecture.
