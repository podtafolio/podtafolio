# AI Prompt: Search & Explore Experience for Podtafolio

**Role:** You are a Senior Frontend Architect and Nuxt.js Expert specializing in AI-driven interfaces.

**Goal:** Create a conceptual prototype (Vue/Nuxt code) for a new "Search & Explore" experience for a podcasting application called **Podtafolio**.

## 1. Project Context

### Tech Stack
- **Framework:** Nuxt 4 (Vue 3, Composition API, `<script setup lang="ts">`)
- **UI Library:** `@nuxt/ui` v4 (built on Tailwind CSS)
- **Database/ORM:** Drizzle ORM with SQLite (Turso)
- **Icons:** Heroicons (via Nuxt UI)

### Data Model (Drizzle Schema)
The application has a rich schema linking Podcasts, Episodes, AI-generated content (Transcripts, Summaries), and Knowledge Graph elements (Entities, Topics).

```typescript
// Key Schema Elements
// Podcasts: id, title, description, imageUrl, author
// Episodes: id, podcastId, title, audioUrl, duration, publishedAt
// Transcripts: episodeId, content, segments (JSON), language
// Summaries: episodeId, content
// Entities: id, name, type (Person, Location, etc.), embedding (Vector)
// Topics: id, name
// Junction Tables: episodes_entities, episodes_topics
```

## 2. The Task

I need you to design and write the code for 3 core views that work together to create an immersive exploration experience.

### A. Unified Search & Explore (`/search`)
**Requirement:** A single, powerful entry point for discovery.
- **Unified Search Bar:** Accepts a query and returns mixed results:
  - Matching **Podcasts** (e.g., "The Daily")
  - Specific **Episodes** (e.g., "Interview with Obama")
  - **Entities/Topics** (e.g., "Artificial Intelligence", "Elon Musk")
- **Explore Section:** When not searching, display:
  - "Trending Topics" (visualize currently popular tags)
  - "Discover Entities" (group entities by type like People, Locations)

### B. Podcast Detail View (`/podcasts/[id]`)
**Requirement:** A clean, informative view for a specific podcast.
- **Header:** Large cover art, title, author, description, subscribe button.
- **Episode List:** A grid or list of episodes.
  - Each item should show: Title, duration, published date, and a "Play" button.
  - **Search within Podcast:** A small search bar to filter *just* this podcast's episodes.

### C. Episode Detail View (`/episodes/[id]`)
**Requirement:** The core consumption experience, heavily enriched by AI.
- **Player:** Prominent audio player.
- **Rich Content:**
  - **Summary:** AI-generated summary of the episode.
  - **Transcript:** Collapsible or scrollable transcript view.
  - **Knowledge Graph:** Display extracted **Entities** and **Topics** as clickable chips/badges.
  - **Deep Linking:** Clicking an Entity (e.g., "SpaceX") should navigate the user to a search/explore page pre-filtered for "SpaceX".

## 3. Deliverables

Please generate the Vue/Nuxt code for these pages.
- Use `<script setup lang="ts">`.
- Use `@nuxt/ui` components (e.g., `UInput`, `UButton`, `UCard`, `UBadge`, `UContainer`).
- Mock the data fetching (e.g., `const { data } = await useFetch(...)`) but define the TypeScript interfaces based on the schema above.
- Focus on the **UI/UX structure** and **component composition**.
