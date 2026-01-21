import { podcastImportHandler } from "./podcastImport";
import { transcribeEpisodeHandler } from "./transcribeEpisode";
import { summarizeEpisodeHandler } from "./summarizeEpisode";
import { extractEntitiesHandler } from "./extractEntities";
import { extractTopicsHandler } from "./extractTopics";
import { syncPodcastsHandler } from "./syncPodcasts";
import {
  JOB_PODCAST_IMPORT,
  JOB_EPISODE_TRANSCRIPTION,
  JOB_EPISODE_SUMMARY,
  JOB_EXTRACT_ENTITIES,
  JOB_EXTRACT_TOPICS,
  JOB_SYNC_PODCASTS,
  type JobType,
} from "./keys";

// Define the Registry Mapping
export const jobRegistry = {
  [JOB_PODCAST_IMPORT]: {
    handler: podcastImportHandler,
    concurrency: 3,
  },
  [JOB_EPISODE_TRANSCRIPTION]: {
    handler: transcribeEpisodeHandler,
    concurrency: 3, // Limit concurrent transcriptions to avoid rate limits or heavy load
  },
  [JOB_EPISODE_SUMMARY]: {
    handler: summarizeEpisodeHandler,
    concurrency: 3,
  },
  [JOB_EXTRACT_ENTITIES]: {
    handler: extractEntitiesHandler,
    concurrency: 5, // Lightweight job compared to audio processing
  },
  [JOB_EXTRACT_TOPICS]: {
    handler: extractTopicsHandler,
    concurrency: 5,
  },
  [JOB_SYNC_PODCASTS]: {
    handler: syncPodcastsHandler,
    concurrency: 1,
  },
} as const;

export type { JobType } from "./keys";

import type { Job } from "bullmq";

// Helper type to extract Data type from Job<Data>
type ExtractJobData<T> = T extends Job<infer Data> ? Data : never;

// Helper type to derive payload type from job type key
export type JobPayload<T extends JobType> = ExtractJobData<
  Parameters<(typeof jobRegistry)[T]["handler"]>[0]
>;

// Generic handler type
export type JobHandler = (payload: any) => Promise<void>;

export function getJobHandler(type: string): JobHandler | undefined {
  return (jobRegistry as any)[type]?.handler;
}

export function getJobConcurrency(type: string): number {
  return (jobRegistry as any)[type]?.concurrency ?? 1;
}
