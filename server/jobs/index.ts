import { podcastImportHandler, type PodcastImportPayload } from './podcastImport';
import { transcribeEpisodeHandler, type TranscribeEpisodePayload } from './transcribeEpisode';

// Define the Registry Mapping
export const jobRegistry = {
  'podcast_import': {
    handler: podcastImportHandler,
    concurrency: 3,
  },
  'episode_transcription': {
    handler: transcribeEpisodeHandler,
    concurrency: 3, // Limit concurrent transcriptions to avoid rate limits or heavy load
  },
} as const;

// Helper type to derive payload type from job type key
export type JobType = keyof typeof jobRegistry;
export type JobPayload<T extends JobType> = Parameters<typeof jobRegistry[T]['handler']>[0];

// Generic handler type
export type JobHandler = (payload: any) => Promise<void>;

export function getJobHandler(type: string): JobHandler | undefined {
  return (jobRegistry as any)[type]?.handler;
}

export function getJobConcurrency(type: string): number {
  return (jobRegistry as any)[type]?.concurrency ?? 1;
}
