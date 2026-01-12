import { schedulePodcastRefresh } from '../utils/scheduler';

export default defineNitroPlugin((nitroApp) => {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  console.log('[Scheduler] Initializing podcast sync scheduler...');

  // Start the interval loop
  // We use setTimeout loop to avoid drift or overlapping if execution takes long,
  // though setInterval is usually fine for 1 hour.
  // Let's use setInterval for simplicity as per "Keep it simple".

  const timer = setInterval(async () => {
    try {
      await schedulePodcastRefresh();
    } catch (err) {
      console.error('[Scheduler] Error in periodic check:', err);
    }
  }, CHECK_INTERVAL);

  // Clean up on close (optional but good practice)
  nitroApp.hooks.hook('close', () => {
    clearInterval(timer);
  });
});
