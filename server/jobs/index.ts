import {
  podcastImportHandler,
  type PodcastImportPayload,
} from "./podcastImport";
import {
  transcribeEpisodeHandler,
  type TranscribeEpisodePayload,
} from "./transcribeEpisode";
import {
  summarizeEpisodeHandler,
  type SummarizeEpisodePayload,
} from "./summarizeEpisode";
import {
  extractEntitiesHandler,
  type ExtractEntitiesPayload,
} from "./extractEntities";
import {
  extractTopicsHandler,
  type ExtractTopicsPayload,
} from "./extractTopics";
import {
  JOB_PODCAST_IMPORT,
  JOB_EPISODE_TRANSCRIPTION,
  JOB_EPISODE_SUMMARY,
  JOB_EXTRACT_ENTITIES,
  JOB_EXTRACT_TOPICS,
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
} as const;

export type { JobType } from "./keys";

// Helper type to derive payload type from job type key
export type JobPayload<T extends JobType> = Parameters<
  (typeof jobRegistry)[T]["handler"]
>[0];

// Generic handler type
export type JobHandler = (payload: any) => Promise<void>;

export function getJobHandler(type: string): JobHandler | undefined {
  return (jobRegistry as any)[type]?.handler;
}

export function getJobConcurrency(type: string): number {
  return (jobRegistry as any)[type]?.concurrency ?? 1;
}
