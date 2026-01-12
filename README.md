# Podtafolio

**Podtafolio** is a podcast discovery platform designed to provide deep insights into audio content. The platform aims to revolutionize how users discover and consume podcasts by leveraging AI for transcriptions, summaries, and analysis.

## Core Goals

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

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

## Directory Structure

- `app/`: Contains the main application source code (pages, components, layouts, `app.vue`).
- `public/`: Static assets that are served directly.
- `server/`: Server-side logic, API routes, and database interactions.
- `tests/`: Unit and integration tests.

For more information, check out the [Nuxt documentation](https://nuxt.com/docs).
