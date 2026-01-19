import { db } from "../utils/db";
import { transcripts, topics, episodesTopics } from "../database/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { google } from "../utils/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { Job } from "bullmq";
import { generateEmbedding } from "../utils/embeddings";

export interface ExtractTopicsPayload {
  episodeId: string;
}

export async function extractTopicsHandler(job: Job<ExtractTopicsPayload>) {
  const { episodeId } = job.data;
  await job.log(`[Topics] Starting extraction for episode ${episodeId}`);

  // 1. Fetch transcript
  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.episodeId, episodeId),
  });

  if (!transcript) {
    throw new Error(
      `Transcript for episode ${episodeId} not found. Please transcribe first.`,
    );
  }

  // 2. Prepare content
  let contentInput = "";
  const segments = transcript.segments as any[];
  if (segments && Array.isArray(segments) && segments.length > 0) {
    contentInput = segments.map((s) => s.text).join("\n");
  } else {
    contentInput = transcript.content;
  }

  // 3. Call AI
  const prompt = `
    Analyze the following podcast transcript and extract the key distinct topics discussed.
    These topics will be used to group episodes together.

    Focus on:
    - Major News Events (e.g., "US Invasion of Venezuela", "Hurricane Milton")
    - Specific Concepts (e.g., "Generative AI", "Universal Basic Income")
    - Broad but distinct themes.

    Avoid:
    - Generic terms like "Podcast", "Interview", "Introduction".
    - Too granular details that wouldn't likely appear in other episodes.

    IMPORTANT: Generate the topics in the following language: ${transcript.language}.

    Return a list of topics (max 5-8 topics).
  `;

  try {
    const { object } = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: z.object({
        topics: z.array(z.string()),
      }),
      prompt: `${prompt}\n\nTranscript:\n${contentInput.slice(0, 500000)}`,
    });

    const extractedTopics = object.topics;
    if (!extractedTopics || extractedTopics.length === 0) {
      await job.log(`[Topics] No topics found for episode ${episodeId}`);
      return;
    }

    await job.log(
      `[Topics] Found ${extractedTopics.length} topics. Upserting...`,
    );

    // 4. Upsert Topics and Link

    // Deduplicate extracted topics
    const uniqueTopics = Array.from(
      new Set(extractedTopics.map((t) => t.trim())),
    );

    // Fetch existing topics (Exact Match)
    const existingTopics = await db.query.topics.findMany({
      where: inArray(topics.name, uniqueTopics),
    });
    const topicMap = new Map(existingTopics.map((t) => [t.name, t]));

    // Identify needed embeddings
    const needsEmbedding = uniqueTopics.filter((name) => !topicMap.has(name));

    await job.log(
      `[Topics] ${existingTopics.length} exact matches. Generating embeddings for ${needsEmbedding.length} candidates.`,
    );

    // Generate Embeddings
    const embeddingsMap = new Map<string, number[]>();
    await Promise.all(
      needsEmbedding.map(async (name) => {
        try {
          const emb = await generateEmbedding(name);
          embeddingsMap.set(name, emb);
        } catch (e) {
          await job.log(
            `[Topics] Warning: Failed to generate embedding for ${name}: ${String(e)}`,
          );
        }
      }),
    );

    for (const topicName of uniqueTopics) {
      let topicId: string;

      if (topicMap.has(topicName)) {
        topicId = topicMap.get(topicName)!.id;
      } else {
        // Fuzzy Search
        let vectorMatchId: string | null = null;
        const embedding = embeddingsMap.get(topicName);

        if (embedding) {
          try {
            const embeddingString = JSON.stringify(embedding);
            const result = await db.run(
              sql`SELECT topics.id, vector_distance_cos(topics.embedding, vector(${embeddingString})) as distance
                            FROM vector_top_k('topics_embedding_idx', vector(${embeddingString}), 1) as v
                            JOIN topics ON topics.rowid = v.id
                            WHERE distance < 0.35`,
            );
            if (result.rows && result.rows.length > 0) {
              const bestMatch = result.rows[0] as any;
              await job.log(
                `[Topics] Fuzzy match: "${topicName}" -> ID ${bestMatch.id} (dist: ${bestMatch.distance})`,
              );
              vectorMatchId = bestMatch.id;
            }
          } catch (err) {
            await job.log(
              `[Topics] Warning: Vector search failed for "${topicName}": ${String(err)}`,
            );
          }
        }

        if (vectorMatchId) {
          topicId = vectorMatchId;
        } else {
          // Insert New
          try {
            const [inserted] = await db
              .insert(topics)
              .values({
                name: topicName,
                embedding: embedding,
              })
              .returning({ id: topics.id });
            topicId = inserted.id;
          } catch (e) {
            // Retry logic for race conditions
            const retry = await db.query.topics.findFirst({
              where: eq(topics.name, topicName),
            });
            if (retry) {
              topicId = retry.id;
            } else {
              await job.log(
                `[Topics] Failed to insert topic ${topicName}: ${String(e)}`,
              );
              continue;
            }
          }
        }
      }

      // Link
      await db
        .insert(episodesTopics)
        .values({ episodeId, topicId })
        .onConflictDoNothing();
    }

    await job.log(`[Topics] Extraction complete for episode ${episodeId}`);
  } catch (error) {
    await job.log("Error: [Topics] Error extracting topics: " + String(error));
    throw error;
  }
}
