## 2024-05-22 - Parallelizing Independent Async Operations in API Handlers

**Learning:**
In `server/api/search.get.ts`, the original implementation performed an external API call (iTunes) followed by a database query (local podcasts). These operations were sequential, meaning the total latency was `iTunes_latency + DB_latency`.

By splitting the database query into two parts ("search by term" and "search by known feed URLs") and running "search by term" in parallel with the iTunes request, we reduce the total latency to `max(iTunes_latency, DB_term_latency) + DB_feed_latency`. Since `DB_feed_latency` is a fast indexed lookup and `DB_term_latency` is usually faster than the external HTTP request, this effectively hides the cost of the initial database search.

**Action:**
When optimizing API endpoints that aggregate data from multiple sources (e.g., external APIs + local DB), always check if the operations are truly dependent. If they can be decoupled (even partially), use `Promise.all` to run them concurrently.

## 2024-05-22 - Selective Column Fetching with Drizzle

**Learning:**
Drizzle ORM's `db.select().from(table)` fetches all columns by default. For tables with large text fields (like `description` or `transcripts`), this can significantly increase payload size and database I/O, especially in list endpoints.

**Action:**
In list endpoints, explicitly define the columns needed by the frontend using `db.select({ id: table.id, ... })`. This reduces data transfer and improves performance, but requires careful verification of frontend requirements to avoid missing fields.
