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

We will create a structured way to define job handlers and their configuration.

**File Structure:**
```
server/
  jobs/
    index.ts          # The Registry (maps type -> { handler, concurrency })
    podcastImport.ts  # Handler for 'podcast_import'
    ...future jobs
```

**Registry (`server/jobs/index.ts`):**
```typescript
const jobRegistry = {
  'podcast_import': {
    handler: podcastImportHandler,
    concurrency: 3 // Max 3 concurrent imports
  },
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
1. **Check Capacity**: Query `jobs` table for count of active (`processing`) jobs per type.
   - Active jobs exclude "stuck" jobs (those processing > 5 minutes).
2. **Determine Allowed**: Compare active counts against `concurrency` limits in Registry.
3. **Poll & Claim**: Try to claim a `pending` job (or reclaim a stuck job) *only* for allowed types.
   - Use atomic transaction (`UPDATE ... RETURNING` or explicit transaction).
4. **Spawn**: If a job is claimed, spawn the handler asynchronously (do not block the loop).
   - The loop immediately continues to try filling other slots.
5. **Complete/Fail**: When the handler finishes, update the job status in the DB.

### 5. Concurrency Control
- Concurrency limits are defined per job type in the Registry.
- The worker respects these limits by checking the global state in the database before claiming new work.
- "Stuck" jobs (jobs marked processing for > 5 mins) are not counted against the limit, allowing them to be reclaimed/retried even if the limit appears full.

### 6. Integration Changes
- `server/api/podcasts/import.post.ts`: Uses `enqueueJob`.
- `server/utils/queue.ts`: Queue DB operations (enqueue, claim, complete, fail, getCounts).
- `server/jobs/`: Directory for handlers and configuration.
