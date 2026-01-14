import { db } from "../utils/db";
import {
  episodes,
  transcripts,
  entities,
  episodesEntities,
  entityTypes,
} from "../database/schema";
import { eq } from "drizzle-orm";
import { google } from "../utils/ai";
import { generateObject } from "ai";
import { z } from "zod";

export interface ExtractEntitiesPayload {
  episodeId: string;
}

export async function extractEntitiesHandler(payload: ExtractEntitiesPayload) {
  const { episodeId } = payload;
  console.log(`[Entities] Starting extraction for episode ${episodeId}`);

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
      console.log(`[Entities] No entities found for episode ${episodeId}`);
      return;
    }

    console.log(`[Entities] Found ${extracted.length} entities. Upserting...`);

    // 4. Upsert Entities and Link
    for (const entity of extracted) {
      // Resolve Type
      let typeId: string;
      const normalizedType = entity.type.trim();

      const existingType = await db.query.entityTypes.findFirst({
        where: eq(entityTypes.name, normalizedType),
      });

      if (existingType) {
        typeId = existingType.id;
      } else {
        try {
          const [insertedType] = await db
            .insert(entityTypes)
            .values({
              name: normalizedType,
            })
            .returning({ id: entityTypes.id });
          typeId = insertedType.id;
        } catch (e) {
          const retryType = await db.query.entityTypes.findFirst({
            where: eq(entityTypes.name, normalizedType),
          });
          if (retryType) {
            typeId = retryType.id;
          } else {
            console.error(
              `[Entities] Failed to insert type ${normalizedType}`,
              e,
            );
            continue;
          }
        }
      }

      // Resolve Entity
      let entityId: string;

      const existingEntity = await db.query.entities.findFirst({
        where: eq(entities.name, entity.name),
      });

      if (existingEntity) {
        entityId = existingEntity.id;
        // Optionally update type if missing?
        if (!existingEntity.typeId && typeId) {
          await db
            .update(entities)
            .set({ typeId })
            .where(eq(entities.id, entityId));
        }
      } else {
        try {
          const [inserted] = await db
            .insert(entities)
            .values({
              name: entity.name,
              typeId: typeId,
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
            console.error(
              `[Entities] Failed to insert entity ${entity.name}`,
              e,
            );
            continue;
          }
        }
      }

      // Link to Episode
      await db
        .insert(episodesEntities)
        .values({
          episodeId,
          entityId,
        })
        .onConflictDoNothing();
    }

    console.log(`[Entities] Extraction complete for episode ${episodeId}`);
  } catch (error) {
    console.error("[Entities] Error extracting entities:", error);
    throw error;
  }
}
