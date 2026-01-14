import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';

export const podcasts = sqliteTable('podcasts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  title: text('title').notNull(),
  description: text('description'),
  feedUrl: text('feed_url').notNull().unique(),
  imageUrl: text('image_url'),
  author: text('author'),
  websiteUrl: text('website_url'),
  status: text('status', { enum: ['importing', 'ready', 'error'] }).notNull().default('importing'),
  importError: text('import_error'),
  lastScrapedAt: integer('last_scraped_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  podcastId: text('podcast_id').references(() => podcasts.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  audioUrl: text('audio_url').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  duration: integer('duration'), // Seconds
  guid: text('guid').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  uniqueEpisode: uniqueIndex('unique_episode').on(table.podcastId, table.guid),
  publishedAtIdx: index('published_at_idx').on(table.publishedAt),
  podcastIdPublishedAtIdx: index('podcast_id_published_at_idx').on(table.podcastId, table.publishedAt),
}));

export const transcripts = sqliteTable('transcripts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  episodeId: text('episode_id').references(() => episodes.id).notNull(),
  content: text('content').notNull(),
  segments: text('segments', { mode: 'json' }), // JSON array of segments with timestamps
  language: text('language').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  episodeIdIdx: index('episode_id_idx').on(table.episodeId),
}));

export const summaries = sqliteTable('summaries', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  episodeId: text('episode_id').references(() => episodes.id).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  episodeIdIdx: index('summary_episode_id_idx').on(table.episodeId),
}));

export const entityTypes = sqliteTable('entity_types', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  name: text('name').notNull().unique(), // e.g., 'Person', 'Location'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  name: text('name').notNull().unique(),
  typeId: text('type_id').references(() => entityTypes.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const episodesEntities = sqliteTable('episodes_entities', {
  episodeId: text('episode_id').references(() => episodes.id).notNull(),
  entityId: text('entity_id').references(() => entities.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  pk: primaryKey({ columns: [table.episodeId, table.entityId] }),
  episodeIdIdx: index('episodes_entities_episode_id_idx').on(table.episodeId),
  entityIdIdx: index('episodes_entities_entity_id_idx').on(table.entityId),
}));

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  error: text('error'),
  retries: integer('retries').notNull().default(0),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
}));
