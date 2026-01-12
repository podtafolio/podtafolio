import { podcastImportHandler, type PodcastImportPayload } from './podcastImport';

// Define the Registry Mapping
export const jobRegistry = {
  'podcast_import': podcastImportHandler,
} as const;

// Helper type to derive payload type from job type key
export type JobType = keyof typeof jobRegistry;
export type JobPayload<T extends JobType> = Parameters<typeof jobRegistry[T]>[0];

// Generic handler type
export type JobHandler = (payload: any) => Promise<void>;

export function getJobHandler(type: string): JobHandler | undefined {
  return (jobRegistry as any)[type];
}
