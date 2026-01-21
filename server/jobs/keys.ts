export const JOB_PODCAST_IMPORT = "podcast_import";
export const JOB_EPISODE_TRANSCRIPTION = "episode_transcription";
export const JOB_EPISODE_SUMMARY = "episode_summary";
export const JOB_EXTRACT_ENTITIES = "extract_entities";
export const JOB_EXTRACT_TOPICS = "extract_topics";
export const JOB_SYNC_PODCASTS = "sync_podcasts";

export const ALL_JOBS = [
  JOB_PODCAST_IMPORT,
  JOB_EPISODE_TRANSCRIPTION,
  JOB_EPISODE_SUMMARY,
  JOB_EXTRACT_ENTITIES,
  JOB_EXTRACT_TOPICS,
  JOB_SYNC_PODCASTS,
] as const;

export type JobType = (typeof ALL_JOBS)[number];
