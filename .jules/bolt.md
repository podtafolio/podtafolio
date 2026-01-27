## 2024-05-22 - Parallelizing Independent Async Operations in API Handlers

**Learning:**
In `server/api/search.get.ts`, the original implementation performed an external API call (iTunes) followed by a database query (local podcasts). These operations were sequential, meaning the total latency was `iTunes_latency + DB_latency`.

By splitting the database query into two parts ("search by term" and "search by known feed URLs") and running "search by term" in parallel with the iTunes request, we reduce the total latency to `max(iTunes_latency, DB_term_latency) + DB_feed_latency`. Since `DB_feed_latency` is a fast indexed lookup and `DB_term_latency` is usually faster than the external HTTP request, this effectively hides the cost of the initial database search.

**Action:**
When optimizing API endpoints that aggregate data from multiple sources (e.g., external APIs + local DB), always check if the operations are truly dependent. If they can be decoupled (even partially), use `Promise.all` to run them concurrently.

## 2024-05-24 - Parallelizing Top-Level useFetch in Nuxt Pages

**Learning:**
In `app/pages/index.vue`, sequential `await useFetch(...)` calls blocked the component setup, creating a request waterfall where the second request wouldn't start until the first one finished. This increased the Time to Interactive (TTI) and total page load time.

By wrapping independent `useFetch` calls in `Promise.all`, we can initiate both requests simultaneously. This is safe in Nuxt 3's `script setup` context and ensures that the component setup waits for both data sources to be available without unnecessary delay.

**Action:**
When fetching multiple independent data sources in a Vue component (especially in Nuxt `script setup`), always check if they can be parallelized using `Promise.all` to reduce total blocking time.
