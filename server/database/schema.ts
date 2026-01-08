import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';

export const podcasts = sqliteTable('podcasts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  title: text('title').notNull(),
  description: text('description'),
  feedUrl: text('feed_url').notNull().unique(),
  imageUrl: text('image_url'),
  author: text('author'),
  websiteUrl: text('website_url'),
  lastScrapedAt: integer('last_scraped_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  podcastId: text('podcast_id').references(() => podcasts.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  audioUrl: text('audio_url').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  duration: integer('duration'), // Seconds
  guid: text('guid').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
