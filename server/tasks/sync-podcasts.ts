import { schedulePodcastRefresh } from '../utils/scheduler';

export default defineTask({
  meta: {
    name: 'sync-podcasts',
    description: 'Syncs stale podcasts by checking for updates',
  },
  async run() {
    console.log('[Task] Starting scheduled podcast sync...');
    try {
      const result = await schedulePodcastRefresh();
      return { result: `Scheduled ${result} jobs` };
    } catch (error: any) {
        console.error('[Task] Podcast sync failed:', error);
        return { error: error.message };
    }
  },
});
