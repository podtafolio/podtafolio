import { db } from '../utils/db';
import { episodes, transcripts } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { transcribeAudio } from '../utils/groq';
import { uploadFileToStorage, deleteFileFromStorage } from '../utils/storage';
import crypto from 'crypto';

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

  // 3. Compute Hash
  const hash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
  console.log(`[Transcription] Audio hash: ${hash}`);

  // 4. Check for existing transcript with same hash
  const existingTranscript = await db.query.transcripts.findFirst({
    where: and(
        eq(transcripts.episodeId, episodeId),
        eq(transcripts.audioHash, hash)
    )
  });

  if (existingTranscript) {
      console.log(`[Transcription] Transcript already exists for this audio version (hash: ${hash}). Skipping.`);
      return;
  }

  // Determine filename
  const urlPath = new URL(episode.audioUrl).pathname;
  const filename = urlPath.split('/').pop() || 'audio.mp3';

  // 5. Transcribe
  let text, language, segments;
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  if (audioBuffer.byteLength > MAX_FILE_SIZE) {
      console.log(`[Transcription] File size (${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)}MB) exceeds 25MB. Uploading to R2...`);

      // Determine content type
      const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';

      // Upload
      // Use a unique key: transcripts/temp/{episodeId}_{hash}.{ext}
      // We use the extension from the original filename
      const ext = filename.includes('.') ? filename.split('.').pop() : 'mp3';
      const storageKey = `transcripts/temp/${episodeId}_${hash}.${ext}`;

      try {
          const publicUrl = await uploadFileToStorage(audioBuffer, storageKey, contentType);
          console.log(`[Transcription] Uploaded to ${publicUrl}. Calling Groq with URL...`);

          const result = await transcribeAudio(publicUrl);
          text = result.text;
          language = result.language;
          segments = result.segments;

      } finally {
          // Cleanup
          console.log(`[Transcription] Cleaning up temporary file from R2...`);
          try {
              await deleteFileFromStorage(storageKey);
          } catch (cleanupError) {
              console.error(`[Transcription] Failed to delete temporary file ${storageKey}:`, cleanupError);
              // Don't fail the job if cleanup fails, but log it.
          }
      }

  } else {
      console.log(`[Transcription] File size is small. Calling Groq directly with buffer...`);
      const result = await transcribeAudio(audioBuffer, filename);
      text = result.text;
      language = result.language;
      segments = result.segments;
  }

  console.log(`[Transcription] Transcription complete. Language: ${language}, Length: ${text.length}, Segments: ${segments.length}`);

  // 6. Insert into transcripts table
  // Delete previous transcript for this episode (even if hash was different, we replace it with the new one)
  await db.delete(transcripts).where(eq(transcripts.episodeId, episodeId));

  await db.insert(transcripts).values({
    episodeId: episodeId,
    content: text,
    language: language,
    segments: segments,
    audioHash: hash,
  });

  console.log(`[Transcription] Transcript saved to database.`);
}
