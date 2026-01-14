import { db } from '../utils/db';
import { episodes, transcripts } from '../database/schema';
import { eq } from 'drizzle-orm';
import { transcribeAudio } from '../utils/groq';
import { enqueueJob } from '../utils/queue';

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
  const { text, language, segments } = await transcribeAudio(audioBuffer, filename);
  console.log(`[Transcription] Transcription complete. Language: ${language}, Length: ${text.length}, Segments: ${segments.length}`);

  // 4. Insert into transcripts table
  // Let's delete previous transcript for this episode to avoid clutter for now,
  // until we have a proper UI to manage multiple versions.
  await db.delete(transcripts).where(eq(transcripts.episodeId, episodeId));

  await db.insert(transcripts).values({
    episodeId: episodeId,
    content: text,
    language: language,
    segments: segments,
  });

  console.log(`[Transcription] Transcript saved to database.`);

  // 5. Trigger downstream tasks
  await enqueueJob('extract_topics', { episodeId });
  console.log(`[Transcription] Triggered extract_topics job.`);
}
