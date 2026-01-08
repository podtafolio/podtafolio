# AGENTS.md

## Project Overview
**Podtafolio** is a podcast discovery platform designed to provide deep insights into audio content. The platform aims to revolutionize how users discover and consume podcasts by leveraging AI for transcriptions, summaries, and analysis.

### Core Goals
- **Discovery**: Facilitate the discovery of new and relevant podcasts.
- **AI Integration**:
    - **Transcriptions**: Full text transcriptions of podcast episodes.
    - **Summaries**: AI-generated summaries to give users a quick overview.
    - **Analysis**: Deep analysis of content, sentiment, and topics.
    - **Search**: Advanced AI-powered search to find specific topics or quotes within episodes.
- **Analytics & Trends**: Provide data-driven insights on podcast trends and listener analytics.

## Tech Stack
The project is built using the following technologies:
- **Framework**: [Nuxt 4](https://nuxt.com)
- **UI Framework**: [Nuxt UI](https://ui.nuxt.com) (based on Tailwind CSS)
- **Language**: TypeScript
- **Dependencies**:
    - `@nuxt/image`: For optimized image handling.
    - `@nuxt/scripts`: For third-party script management.
    - `vue`: Vue 3.

## Directory Structure
The project follows the standard Nuxt 4 structure:
- `app/`: Contains the main application source code (pages, components, layouts, `app.vue`).
- `public/`: Static assets that are served directly.
- `server/`: (To be added) Server-side logic, API routes, and database interactions.

## Coding Guidelines

### General
- **TypeScript**: All code must be written in TypeScript.
- **Vue**: Use the **Composition API** with `<script setup lang="ts">`.
- **Styling**: Utilize **Tailwind CSS** utility classes provided by Nuxt UI. Avoid custom CSS when possible.

### Components
- Place reusable components in `app/components/`.
- Use descriptive naming for components (e.g., `PodcastCard.vue`, `SearchBar.vue`).

### Pages
- Page components go in `app/pages/`.
- Use Nuxt's file-based routing system.

### State Management
- Use `useState` for simple shared state.
- (Future) Consider Pinia for complex state management if needed.

## Development Workflow
1.  **Install Dependencies**: `npm install`
2.  **Start Dev Server**: `npm run dev`
3.  **Build for Production**: `npm run build`

## Future Implementation Notes
- **AI Services**: When implementing AI features, consider modularizing the service interactions (e.g., OpenAI, Anthropic, or custom models) in the `server/` directory.
- **Database**: A database will be required for storing user data, podcast metadata, and cached transcriptions.
- **Testing**: Implement unit and integration tests using libraries compatible with Nuxt/Vue (e.g., Vitest).
