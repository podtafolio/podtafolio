import "dotenv/config";
import { db } from "../server/utils/db";
import { topics } from "../server/database/schema";
import { isNull, eq } from "drizzle-orm";
import { generateEmbedding } from "../server/utils/embeddings";

async function main() {
  console.log("Starting backfill of topic embeddings...");

  // Fetch topics without embeddings
  const pendingTopics = await db.query.topics.findMany({
    where: isNull(topics.embedding),
  });

  console.log(`Found ${pendingTopics.length} topics to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const topic of pendingTopics) {
    try {
      console.log(`Processing topic: ${topic.name}`);
      const embedding = await generateEmbedding(topic.name);

      await db
        .update(topics)
        .set({ embedding })
        .where(eq(topics.id, topic.id));

      successCount++;
    } catch (error) {
      console.error(`Failed to process topic ${topic.name}:`, error);
      errorCount++;
    }

    // Optional: Add a small delay to avoid rate limits if necessary
    // await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Backfill complete. Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in backfill script:", err);
  process.exit(1);
});
