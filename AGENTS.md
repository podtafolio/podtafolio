# AGENTS.md

## ⚠️ Mandatory Verification Rules

**Before creating any commit or Pull Request, you MUST perform the following checks:**

1.  **Run Tests**: Execute `npm run test` and ensure all tests pass.
2.  **Build**: Execute `npm run build` to ensure the application builds without errors.

**Do not submit any code that fails these checks.**

## Project Overview

**Podtafolio** is a podcast discovery platform utilizing AI for deep audio insights.

### Architecture & Status

- **Status**: Active Development.
- **Backend**: Nuxt 4 Server (Nitro).
- **Database**: Turso (LibSQL) with Drizzle ORM.
- **Async Processing**: **BullMQ** (Redis) for robust background job processing.
- **AI**:
  - **Groq API** (Whisper Large v3) for high-fidelity transcriptions.
  - **Google Generative AI** (Gemini) for embeddings, summaries, and entity extraction.

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com)
- **UI Framework**: [Nuxt UI](https://ui.nuxt.com)
- **Database**: Drizzle ORM + Turso
- **Queue**: BullMQ + Redis
- **Testing**: Vitest + Happy DOM

## Developer Guidelines

### Database Workflow

This project uses **Drizzle ORM** with a strict migration workflow.

- **Do NOT use `db:push`**. It has been removed.
- **To modify the schema**:
  1. Edit `server/database/schema.ts`.
  2. Run `npm run db:generate` to create a new migration file.
  3. Run `npm run db:migrate` to apply the migration.

### Testing Guidelines (Vitest)

This project uses `vitest` with `happy-dom`. Special care must be taken when testing Nuxt/Nitro server code due to auto-imports.

#### Mocking H3 Composables

When testing utilities that use H3 composables (e.g., `createError`, `getQuery`), you must explicitly mock the `h3` module to ensure Vitest uses your mock instead of the auto-imported version.

```typescript
// Example: Testing a utility that uses createError
import { describe, it, expect, vi } from "vitest";
import { myUtility } from "./myUtility";

vi.mock("h3", () => ({
  createError: vi.fn((opts) => opts),
  getQuery: vi.fn(() => ({})),
}));

describe("myUtility", () => {
  // ... tests
});
```

#### Mocking Nitro Auto-Imports

For server handlers using Nitro features like `defineCachedEventHandler`, use `vi.stubGlobal`.

```typescript
// Example: Testing a cached event handler
import { describe, it, expect, vi } from "vitest";

vi.stubGlobal("defineCachedEventHandler", (handler) => handler);

// Import your handler AFTER stubbing
import handler from "./my-handler";
```

#### Mocking Local Utilities

When testing API handlers that import local utilities (e.g., `server/utils/cache.ts`), ensure the source code uses **explicit relative imports** (e.g., `import ... from '../../utils/cache'`) rather than auto-imports, or the mock might be ignored.

### Async Jobs & Background Workers

- **Engine**: **BullMQ** (backed by Redis).
- **Location**: `server/jobs/` contains job handlers.
- **Job Definitions**: `server/jobs/keys.ts` defines job names and types.
- **Dashboard**: A BullMQ dashboard is available at `/admin/queues` (requires admin auth in production).
- **Scheduled Tasks**: `server/tasks/` contains scheduled Nitro tasks (e.g., `sync-podcasts`).

## Directory Structure

- `app/`: Frontend (Nuxt UI, Pages, Components).
- `server/`: Backend.
  - `database/`: Schema & Migrations.
  - `jobs/`: Job handlers and configuration.
  - `tasks/`: Scheduled tasks.
  - `utils/`: Shared logic (AI, Redis, Queue, iTunes, Parsing).
- `tests/`: Vitest suite.

## Future Implementation Notes

- **AI Services**: Continue refining summaries and deep analysis services in `server/utils/ai.ts` and `server/utils/embeddings.ts`.
