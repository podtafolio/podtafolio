import { db } from '../utils/db';
import { episodes, transcripts, topics, episodesTopics } from '../database/schema';
import { eq } from 'drizzle-orm';
import { google } from '../utils/ai';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface ExtractTopicsPayload {
  episodeId: string;
}

export async function extractTopicsHandler(payload: ExtractTopicsPayload) {
  const { episodeId } = payload;
  console.log(`[Topics] Starting extraction for episode ${episodeId}`);

  // 1. Fetch transcript
  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.episodeId, episodeId),
  });

  if (!transcript) {
    throw new Error(`Transcript for episode ${episodeId} not found. Please transcribe first.`);
  }

  // 2. Prepare content
  let contentInput = "";
  const segments = transcript.segments as any[];
  if (segments && Array.isArray(segments) && segments.length > 0) {
      contentInput = segments.map(s => s.text).join('\n');
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

    Return a list of topics (max 5-8 topics).
  `;

  try {
    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: z.object({
        topics: z.array(z.string())
      }),
      prompt: `${prompt}\n\nTranscript:\n${contentInput.slice(0, 500000)}`,
    });

    const extractedTopics = object.topics;
    if (!extractedTopics || extractedTopics.length === 0) {
        console.log(`[Topics] No topics found for episode ${episodeId}`);
        return;
    }

    console.log(`[Topics] Found ${extractedTopics.length} topics. Upserting...`);

    // 4. Upsert Topics and Link
    for (const topicName of extractedTopics) {
        const normalizedName = topicName.trim();
        let topicId: string;

        const existingTopic = await db.query.topics.findFirst({
            where: eq(topics.name, normalizedName)
        });

        if (existingTopic) {
            topicId = existingTopic.id;
        } else {
            try {
                const [inserted] = await db.insert(topics).values({
                    name: normalizedName
                }).returning({ id: topics.id });
                topicId = inserted.id;
            } catch (e) {
                 const retry = await db.query.topics.findFirst({
                    where: eq(topics.name, normalizedName)
                });
                if (retry) {
                    topicId = retry.id;
                } else {
                    console.error(`[Topics] Failed to insert topic ${normalizedName}`, e);
                    continue;
                }
            }
        }

        // Link to Episode
        await db.insert(episodesTopics).values({
            episodeId,
            topicId
        }).onConflictDoNothing();
    }

    console.log(`[Topics] Extraction complete for episode ${episodeId}`);

  } catch (error) {
      console.error("[Topics] Error extracting topics:", error);
      throw error;
  }
}
