import { db } from '../utils/db';
import { episodes, transcripts } from '../database/schema';
import { eq } from 'drizzle-orm';
import { transcribeAudio } from '../utils/groq';

export interface TranscribeEpisodePayload {
  episodeId: string;
}

export async function transcribeEpisodeHandler(payload: TranscribeEpisodePayload) {
  const { episodeId } = payload;
  console.log(`[Transcription] Starting transcription for episode ${episodeId}`);

  // 1. Fetch episode to get audio URL
  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, episodeId),
  });

  if (!episode) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  if (!episode.audioUrl) {
    throw new Error(`Episode ${episodeId} has no audio URL`);
  }

  // 2. Download audio file
  console.log(`[Transcription] Downloading audio from ${episode.audioUrl}`);
  const audioResponse = await fetch(episode.audioUrl);

  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
  }

  const audioArrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  // Check file size limit (25MB for Groq)
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  if (audioBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`Audio file size (${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)}MB) exceeds Groq limit of 25MB.`);
  }

  // Determine filename (optional, but helpful for format detection if URL has extension)
  const urlPath = new URL(episode.audioUrl).pathname;
  const filename = urlPath.split('/').pop() || 'audio.mp3';

  // 3. Call Groq API
  console.log(`[Transcription] Calling Groq API...`);
  const { text, language } = await transcribeAudio(audioBuffer, filename);
  console.log(`[Transcription] Transcription complete. Language: ${language}, Length: ${text.length}`);

  // 4. Insert into transcripts table
  // We use a transaction or just insert. Since we might want to support multiple transcripts later,
  // we check if one exists for this language or just add it.
  // For now, let's assume one transcript per episode or just simple insert.
  // The schema allows multiple transcripts (one-to-many), but unique constraint is not on (episodeId, language).
  // Let's just insert. If we re-run, we might want to clean up old ones or just add new one.
  // To keep it simple and avoid duplicates for the same job, let's delete existing for this episode?
  // Or better, let's just insert. The user might want multiple versions.
  // Wait, the plan says "store detected language".

  // Let's delete previous transcript for this episode to avoid clutter for now,
  // until we have a proper UI to manage multiple versions.
  await db.delete(transcripts).where(eq(transcripts.episodeId, episodeId));

  await db.insert(transcripts).values({
    episodeId: episodeId,
    content: text,
    language: language,
  });

  console.log(`[Transcription] Transcript saved to database.`);
}
