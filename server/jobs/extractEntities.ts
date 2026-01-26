import { db } from "../utils/db";
import {
  transcripts,
  entities,
  episodesEntities,
  entityTypes,
} from "../database/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { google } from "../utils/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { Job } from "bullmq";
import { generateEmbedding } from "../utils/embeddings";

export interface ExtractEntitiesPayload {
  episodeId: string;
}

export async function extractEntitiesHandler(job: Job<ExtractEntitiesPayload>) {
  const { episodeId } = job.data;
  await job.log(`[Entities] Starting extraction for episode ${episodeId}`);

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
    Analyze the following podcast transcript and extract the key entities mentioned.
    Focus on:
    - People (Hosts, Guests, Key figures mentioned)
    - Companies / Organizations
    - Locations (Cities, Countries, etc.)
    - Key Topics / Concepts (e.g. "Artificial Intelligence", "Climate Change")
    - News Events

    Return a list of entities.
    - name: The name of the entity (Title Case, e.g. "United States", "Elon Musk").
    - type: The category (e.g. "Person", "Location", "Topic", "Company").
  `;

  try {
    const { object } = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
          }),
        ),
      }),
      prompt: `${prompt}\n\nTranscript:\n${contentInput.slice(0, 500000)}`,
    });

    const extracted = object.entities;
    if (!extracted || extracted.length === 0) {
      await job.log(`[Entities] No entities found for episode ${episodeId}`);
      return;
    }

    await job.log(
      `[Entities] Found ${extracted.length} entities. Processing...`,
    );

    // Pre-processing: Identify unique names and fetch existing entities
    // Remove duplicates from extraction list by name to avoid redundant processing
    const distinctExtracted = new Map<string, typeof extracted[0]>();
    for (const e of extracted) {
        if (!distinctExtracted.has(e.name)) {
            distinctExtracted.set(e.name, e);
        }
    }
    const uniqueExtracted = Array.from(distinctExtracted.values());
    const distinctNames = uniqueExtracted.map(e => e.name);

    // Fetch existing entities by name (Exact Match)
    const existingEntities = await db.query.entities.findMany({
        where: inArray(entities.name, distinctNames)
    });

    // Map: Name -> Entity
    const entityMap = new Map(existingEntities.map(e => [e.name, e]));

    // Identify which ones need embeddings (no exact match)
    const needsEmbedding = distinctNames.filter(name => !entityMap.has(name));

    await job.log(`[Entities] ${existingEntities.length} exact matches found. Generating embeddings for ${needsEmbedding.length} candidates...`);

    // Generate embeddings in parallel
    const embeddingsMap = new Map<string, number[]>();
    await Promise.all(needsEmbedding.map(async (name) => {
        try {
            const emb = await generateEmbedding(name);
            embeddingsMap.set(name, emb);
        } catch (e) {
            await job.log(`[Entities] Warning: Failed to generate embedding for ${name}: ${String(e)}`);
        }
    }));

    // 4. Batch Resolve Entity Types
    const uniqueTypeNames = Array.from(
      new Set(uniqueExtracted.map((e) => e.type.trim())),
    );

    const existingTypes =
      uniqueTypeNames.length > 0
        ? await db.query.entityTypes.findMany({
            where: inArray(entityTypes.name, uniqueTypeNames),
          })
        : [];

    const typeMap = new Map(existingTypes.map((t) => [t.name, t.id]));
    const missingTypes = uniqueTypeNames.filter((name) => !typeMap.has(name));

    // Insert missing types
    for (const name of missingTypes) {
      try {
        const [insertedType] = await db
          .insert(entityTypes)
          .values({ name })
          .returning({ id: entityTypes.id });
        typeMap.set(name, insertedType.id);
      } catch (e) {
        // Race condition: someone else inserted it
        const retryType = await db.query.entityTypes.findFirst({
          where: eq(entityTypes.name, name),
        });
        if (retryType) {
          typeMap.set(name, retryType.id);
        } else {
          await job.log(`[Entities] Failed to resolve type ${name}: ${e}`);
        }
      }
    }

    // 5. Resolve Entities and Prepare Links
    const episodeEntityLinks: { episodeId: string; entityId: string }[] = [];

    for (const entity of uniqueExtracted) {
      const normalizedType = entity.type.trim();
      const typeId = typeMap.get(normalizedType);

      if (!typeId) continue; // Skip if type resolution failed

      let entityId: string;

      // Check pre-fetched exact match map
      if (entityMap.has(entity.name)) {
        const existing = entityMap.get(entity.name)!;
        entityId = existing.id;

        // Update type if missing
        if (!existing.typeId) {
          await db
            .update(entities)
            .set({ typeId })
            .where(eq(entities.id, entityId));
        }
      } else {
        // Fuzzy Search / Create
        let vectorMatchId: string | null = null;
        const embedding = embeddingsMap.get(entity.name);

        if (embedding) {
          try {
            const embeddingString = JSON.stringify(embedding);
            const result = await db.run(
              sql`SELECT entities.id, vector_distance_cos(entities.embedding, vector(${embeddingString})) as distance
                        FROM vector_top_k('entities_embedding_idx', vector(${embeddingString}), 1) as v
                        JOIN entities ON entities.rowid = v.id
                        WHERE distance < 0.35`,
            );

            if (result.rows && result.rows.length > 0) {
              const bestMatch = result.rows[0] as any;
              await job.log(
                `[Entities] Fuzzy match found: "${entity.name}" matched with entity ID ${bestMatch.id} (dist: ${bestMatch.distance})`,
              );
              vectorMatchId = bestMatch.id;
            }
          } catch (err) {
            await job.log(
              `[Entities] Warning: Vector search failed for "${entity.name}": ${String(err)}`,
            );
          }
        }

        if (vectorMatchId) {
          entityId = vectorMatchId;
        } else {
          // Create New
          try {
            const [inserted] = await db
              .insert(entities)
              .values({
                name: entity.name,
                typeId: typeId,
                embedding: embedding,
              })
              .returning({ id: entities.id });

            entityId = inserted.id;
          } catch (e) {
            const retry = await db.query.entities.findFirst({
              where: eq(entities.name, entity.name),
            });
            if (retry) {
              entityId = retry.id;
            } else {
              await job.log(
                `Error: [Entities] Failed to insert entity ${entity.name}. ${String(e)}`,
              );
              continue;
            }
          }
        }
      }

      episodeEntityLinks.push({
        episodeId,
        entityId,
      });
    }

    // 6. Batch Insert Links
    if (episodeEntityLinks.length > 0) {
      await db
        .insert(episodesEntities)
        .values(episodeEntityLinks)
        .onConflictDoNothing();
      await job.log(
        `[Entities] Linked ${episodeEntityLinks.length} entities to episode ${episodeId}`,
      );
    }

    await job.log(`[Entities] Extraction complete for episode ${episodeId}`);
  } catch (error) {
    await job.log(
      "Error: [Entities] Error extracting entities: " + String(error),
    );

    throw error;
  }
}
