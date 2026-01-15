import "dotenv/config";
import { db } from "../server/utils/db";
import { entities } from "../server/database/schema";
import { isNull, eq } from "drizzle-orm";
import { generateEmbedding } from "../server/utils/embeddings";

async function main() {
  console.log("Starting backfill of embeddings...");

  // Fetch entities without embeddings
  const pendingEntities = await db.query.entities.findMany({
    where: isNull(entities.embedding),
  });

  console.log(`Found ${pendingEntities.length} entities to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const entity of pendingEntities) {
    try {
      console.log(`Processing entity: ${entity.name}`);
      const embedding = await generateEmbedding(entity.name);

      await db
        .update(entities)
        .set({ embedding })
        .where(eq(entities.id, entity.id));

      successCount++;
    } catch (error) {
      console.error(`Failed to process entity ${entity.name}:`, error);
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
