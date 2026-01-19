import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
  customType,
} from "drizzle-orm/sqlite-core";
import { ulid } from "ulid";
import { EMBEDDING_DIMENSIONS } from "../utils/constants";

const float32Array = customType<{ data: number[]; driverData: Buffer }>({
  dataType() {
    return `F32_BLOB(${EMBEDDING_DIMENSIONS})`;
  },
  fromDriver(value: Buffer) {
    return Array.from(
      new Float32Array(value.buffer, value.byteOffset, value.byteLength / 4),
    );
  },
  toDriver(value: number[]) {
    return Buffer.from(new Float32Array(value).buffer);
  },
});

export const podcasts = sqliteTable("podcasts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  title: text("title").notNull(),
  description: text("description"),
  feedUrl: text("feed_url").notNull().unique(),
  imageUrl: text("image_url"),
  author: text("author"),
  websiteUrl: text("website_url"),
  status: text("status", { enum: ["importing", "ready", "error"] })
    .notNull()
    .default("importing"),
  importError: text("import_error"),
  lastScrapedAt: integer("last_scraped_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    podcastId: text("podcast_id")
      .references(() => podcasts.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    audioUrl: text("audio_url").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    duration: integer("duration"), // Seconds
    guid: text("guid").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    uniqueEpisode: uniqueIndex("unique_episode").on(
      table.podcastId,
      table.guid,
    ),
    publishedAtIdx: index("published_at_idx").on(table.publishedAt),
    podcastIdPublishedAtIdx: index("podcast_id_published_at_idx").on(
      table.podcastId,
      table.publishedAt,
    ),
  }),
);

export const transcripts = sqliteTable(
  "transcripts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    episodeId: text("episode_id")
      .references(() => episodes.id)
      .notNull(),
    content: text("content").notNull(),
    segments: text("segments", { mode: "json" }), // JSON array of segments with timestamps
    language: text("language").notNull(),
    audioHash: text("audio_hash"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    episodeIdIdx: index("episode_id_idx").on(table.episodeId),
  }),
);

export const summaries = sqliteTable(
  "summaries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    episodeId: text("episode_id")
      .references(() => episodes.id)
      .notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    episodeIdIdx: index("summary_episode_id_idx").on(table.episodeId),
  }),
);

export const entityTypes = sqliteTable("entity_types", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text("name").notNull().unique(), // e.g., 'Person', 'Location'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const entities = sqliteTable("entities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text("name").notNull().unique(),
  typeId: text("type_id").references(() => entityTypes.id),
  embedding: float32Array("embedding"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const episodesEntities = sqliteTable(
  "episodes_entities",
  {
    episodeId: text("episode_id")
      .references(() => episodes.id)
      .notNull(),
    entityId: text("entity_id")
      .references(() => entities.id)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.episodeId, table.entityId] }),
    episodeIdIdx: index("episodes_entities_episode_id_idx").on(table.episodeId),
    entityIdIdx: index("episodes_entities_entity_id_idx").on(table.entityId),
  }),
);

export const topics = sqliteTable("topics", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text("name").notNull().unique(),
  embedding: float32Array("embedding"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const episodesTopics = sqliteTable(
  "episodes_topics",
  {
    episodeId: text("episode_id")
      .references(() => episodes.id)
      .notNull(),
    topicId: text("topic_id")
      .references(() => topics.id)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.episodeId, table.topicId] }),
    episodeIdIdx: index("episodes_topics_episode_id_idx").on(table.episodeId),
    topicIdIdx: index("episodes_topics_topic_id_idx").on(table.topicId),
  }),
);
