import { importPodcast } from "../utils/podcastService";

export interface PodcastImportPayload {
  podcastId: string;
  feedUrl: string;
}

export async function podcastImportHandler(payload: PodcastImportPayload) {
  // The importPodcast service already handles its own error logging and status updates for the podcast record.
  // However, for the queue system, we might want it to throw so the queue knows it failed.
  // The current importPodcast catches everything and updates status to 'error'.
  // This is fine, but the job status in the queue should probably also reflect 'completed' (even if 'error' business-wise) or 'failed' (system error).

  // Let's call it. If it throws, the worker will catch it.
  await importPodcast(payload.feedUrl, payload.podcastId);
}
