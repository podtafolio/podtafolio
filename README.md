# Podtafolio

![Status](https://img.shields.io/badge/Status-Active_Development-green)

**Podtafolio** is a podcast discovery platform designed to provide deep insights into audio content. The platform aims to revolutionize how users discover and consume podcasts by leveraging AI for transcriptions, summaries, and analysis.

## Features

### Current Features
- **Hybrid Search**: Unified search across local database and iTunes API, ensuring immediate results with local data precedence.
- **Podcast Management**:
    - **Import**: Asynchronous background processing for importing large podcast feeds.
    - **Sync**: Automated hourly synchronization to keep feeds up-to-date.
- **AI Transcriptions**: High-fidelity episode transcriptions powered by the **Groq API** (using `whisper-large-v3`).
- **Discovery**: Filter and browse podcasts and episodes.

### Roadmap
- **Summaries**: AI-generated summaries for quick episode overviews.
- **Deep Analysis**: Sentiment analysis, topic extraction, and entity recognition.
- **Semantic Search**: AI-powered search to find specific quotes or concepts within episodes.
- **Analytics**: User listening trends and data visualization.

## Architecture

Podtafolio uses a modern, robust architecture designed for performance and scalability:

- **Framework**: [Nuxt 4](https://nuxt.com)
- **Database**: [Turso](https://turso.tech/) (LibSQL) accessed via **Drizzle ORM**.
- **Job Queue**: Custom SQLite-backed job queue for handling asynchronous tasks (imports, transcriptions).
- **UI**: [Nuxt UI](https://ui.nuxt.com) (Tailwind CSS).
- **AI Inference**: Groq API.

## Tech Stack

- **Language**: TypeScript
- **Backend**: Nuxt Server (Nitro)
- **Database**: Drizzle ORM, LibSQL/Turso
- **Dependencies**:
    - `rss-parser`: Robust RSS feed parsing.
    - `zod`: Runtime schema validation.
    - `ofetch`: HTTP client.
    - `@nuxt/image`: Optimized image handling.

## Configuration

The application requires the following environment variables to be set (typically in a `.env` file):

```env
# Database Connection (Turso)
TURSO_DATABASE_URL="libsql://your-db-name.turso.io"
TURSO_AUTH_TOKEN="your-turso-auth-token"

# AI Services
GROQ_API_KEY="your-groq-api-key"
```

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Database

This project uses Drizzle ORM.

**Generate Migrations:**
```bash
npm run db:generate
```

**Apply Migrations:**
```bash
npm run db:migrate
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Testing

Run the test suite:

```bash
# npm
npm run test

# pnpm
pnpm test

# yarn
yarn test

# bun
bun run test
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

## Directory Structure

- `app/`: Contains the main application source code (pages, components, layouts, `app.vue`).
- `public/`: Static assets that are served directly.
- `server/`: Server-side logic.
    - `api/`: API route handlers.
    - `database/`: Schema definitions and migrations.
    - `jobs/`: Background job definitions (imports, transcriptions).
    - `tasks/`: Scheduled Nitro tasks (e.g., sync).
    - `utils/`: Shared utilities.
- `tests/`: Unit and integration tests.

For more information, check out the [Nuxt documentation](https://nuxt.com/docs).
