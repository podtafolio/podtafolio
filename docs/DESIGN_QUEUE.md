# Design: Simple Database-Backed Job Queue

## Problem
The current podcast import process in `server/api/podcasts/import.post.ts` uses an unawaited Promise. This is unreliable because:
1. If the server restarts or crashes, the job is lost.
2. There is no retry mechanism for failures.
3. No concurrency control.
4. No visibility into job status.

## Solution: `jobs` Table + Job Registry

We will implement a persistent job queue using the existing Turso (SQLite) database and a code abstraction to easily register new job types.

### 1. Schema (`jobs` table)

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `text` (PK) | ULID |
| `type` | `text` | e.g., `'podcast_import'`, `'transcription'`, `'analytics'` |
| `payload` | `json` | Arguments for the job (e.g., `{ podcastId: '...' }`) |
| `status` | `text` | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| `created_at` | `timestamp` | When the job was queued |
| `started_at` | `timestamp` | When a worker picked it up |
| `completed_at` | `timestamp` | When it finished |
| `error` | `text` | Error message if failed |
| `retries` | `integer` | Count of retry attempts (default 0) |

### 2. Abstraction: Job Registry

We will create a structured way to define job handlers.

**File Structure:**
```
server/
  jobs/
    index.ts          # The Registry (maps type -> handler)
    podcastImport.ts  # Handler for 'podcast_import'
    ...future jobs
```

**Interface:**
```typescript
interface JobHandler<T> {
  handle: (payload: T) => Promise<void>;
}
```

**Registry (`server/jobs/index.ts`):**
```typescript
const jobRegistry = {
  'podcast_import': podcastImportHandler,
  // 'other_job': otherJobHandler
};
```

### 3. Producer (API)
Instead of calling logic directly:
```typescript
await enqueueJob('podcast_import', { podcastId: '...' });
```

### 4. Consumer (Worker Plugin)
A Nitro server plugin (`server/plugins/worker.ts`) starts a polling loop.

#### Algorithm:
1. **Poll**: Query `jobs` where `status = 'pending'`.
2. **Claim**: Transactionally lock the job (`status = 'processing'`).
3. **Dispatch**: Look up `job.type` in `jobRegistry`.
   - If found: `await handler(job.payload)`
   - If not found: Mark as failed (unknown job type).
4. **Complete/Fail**: Update `jobs` table based on result.

### 5. Concurrency Control
- Single worker loop initially (processing one job at a time).
- Can be scaled by adding more worker loops or processes, provided the "Claim" step is atomic.

### 6. Integration Changes
- `server/api/podcasts/import.post.ts`: Uses `enqueueJob`.
- `server/utils/queue.ts`: Queue DB operations.
- `server/jobs/`: New directory for handlers.
