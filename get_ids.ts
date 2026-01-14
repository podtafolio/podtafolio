import { db } from './server/utils/db';
import { podcasts, episodes } from './server/database/schema';

async function main() {
  const podcast = await db.query.podcasts.findFirst();
  if (!podcast) {
    console.log('No podcasts found');
    return;
  }
  console.log(`PODCAST_ID=${podcast.id}`);

  const episode = await db.query.episodes.findFirst({
    where: (episodes, { eq }) => eq(episodes.podcastId, podcast.id)
  });

  if (episode) {
    console.log(`EPISODE_ID=${episode.id}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
