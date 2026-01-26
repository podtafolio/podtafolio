## 2024-05-22 - Parallelizing Independent Async Operations in API Handlers

**Learning:**
In `server/api/search.get.ts`, the original implementation performed an external API call (iTunes) followed by a database query (local podcasts). These operations were sequential, meaning the total latency was `iTunes_latency + DB_latency`.

By splitting the database query into two parts ("search by term" and "search by known feed URLs") and running "search by term" in parallel with the iTunes request, we reduce the total latency to `max(iTunes_latency, DB_term_latency) + DB_feed_latency`. Since `DB_feed_latency` is a fast indexed lookup and `DB_term_latency` is usually faster than the external HTTP request, this effectively hides the cost of the initial database search.

**Action:**
When optimizing API endpoints that aggregate data from multiple sources (e.g., external APIs + local DB), always check if the operations are truly dependent. If they can be decoupled (even partially), use `Promise.all` to run them concurrently.

## 2025-05-23 - Testing Nuxt/Drizzle Auto-Imports in Vitest

**Learning:**
When unit testing Nuxt server handlers that use auto-imported modules (like `server/utils/db`), Vitest will fail with `ReferenceError` because it doesn't process auto-imports. Explicitly importing the module in the source code fixes it but defeats the purpose of auto-imports.

**Action:**
Use `vi.stubGlobal('variableName', mockImplementation)` in the test setup to mock auto-imported globals. For Drizzle query chains, ensure the mock implements a fluent interface (`mockReturnThis()`) for all intermediate methods (`select`, `from`, `where`) and returns a Promise (or `mockResolvedValue`) for the terminator methods (`limit`, `orderBy`, `all`, `execute`).
