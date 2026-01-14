import { db } from "../utils/db";
import { episodes, transcripts } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { transcribeAudio } from "../utils/groq";
import { enqueueJob } from "../utils/queue";
import { uploadFileToStorage, deleteFileFromStorage } from "../utils/storage";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

export interface TranscribeEpisodePayload {
  episodeId: string;
}

export async function transcribeEpisodeHandler(
  payload: TranscribeEpisodePayload
) {
  const { episodeId } = payload;
  console.log(
    `[Transcription] Starting transcription for episode ${episodeId}`
  );

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

  // 2. Download audio file using stream
  console.log(`[Transcription] Downloading audio from ${episode.audioUrl}`);
  const audioResponse = await fetch(episode.audioUrl);

  if (!audioResponse.ok || !audioResponse.body) {
    throw new Error(
      `Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`
    );
  }

  // Use a temporary file to store the audio while we hash it
  // This avoids holding the entire file in memory
  const tempDir = path.join(process.cwd(), ".tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFilePath = path.join(tempDir, `${episodeId}_${Date.now()}.tmp`);
  const fileWriteStream = fs.createWriteStream(tempFilePath);

  // Create a hash stream
  const hashStream = crypto.createHash("sha256");

  // Convert Web Stream to Node Stream if necessary (fetch returns ReadableStream)
  // @ts-ignore - Readable.fromWeb is available in Node 18+
  const readableBody = Readable.fromWeb(audioResponse.body);

  // Pipe: Body -> [Hash, File]
  // We can't easily pipe to two destinations and wait for both without passing through.
  // We can pipe: Body -> Hash -> File? No, Hash is a transform but usually consumes or emits hash?
  // `crypto.createHash()` is a Transform stream that emits the data passed through it?
  // Actually, standard crypto.createHash() returns a Hash object which is a Writable (legacy) or Transform?
  // It is a Transform stream. It emits the *digest* when done, but does it pass through data?
  // No, `crypto.createHash()` is a Writeable stream that you write data to, and then you get the hash.
  // Wait, in modern Node it is a Transform? No, you usually stick it at the end.
  // To pass through, we need a PassThrough stream that we pipe to Hash AND File.

  // Better approach: Body -> File. While writing to file, we also update hash.
  // We can listen to 'data' events on the readable stream.

  await new Promise<void>((resolve, reject) => {
    readableBody.on("data", (chunk) => {
      hashStream.update(chunk);
      fileWriteStream.write(chunk);
    });
    readableBody.on("end", () => {
      fileWriteStream.end();
      resolve();
    });
    readableBody.on("error", (err) => {
      fileWriteStream.destroy();
      reject(err);
    });
  });

  const hash = hashStream.digest("hex");
  console.log(`[Transcription] Audio hash: ${hash}`);

  // 3. Check for existing transcript with same hash
  const existingTranscript = await db.query.transcripts.findFirst({
    where: and(
      eq(transcripts.episodeId, episodeId),
      eq(transcripts.audioHash, hash)
    ),
  });

  if (existingTranscript) {
    console.log(
      `[Transcription] Transcript already exists for this audio version (hash: ${hash}). Skipping.`
    );
    // Cleanup temp file
    fs.unlinkSync(tempFilePath);
    return;
  }

  // 4. Check file size
  const stats = fs.statSync(tempFilePath);
  const fileSizeInBytes = stats.size;
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  // Determine filename
  const urlPath = new URL(episode.audioUrl).pathname;
  const originalFilename = urlPath.split("/").pop() || "audio.mp3";
  const ext = originalFilename.includes(".")
    ? originalFilename.split(".").pop()
    : "mp3";

  let text, language, segments;

  try {
    if (fileSizeInBytes > MAX_FILE_SIZE) {
      console.log(
        `[Transcription] File size (${(fileSizeInBytes / 1024 / 1024).toFixed(
          2
        )}MB) exceeds 25MB. Uploading to R2...`
      );

      const contentType =
        audioResponse.headers.get("content-type") || "audio/mpeg";
      const storageKey = `transcripts/temp/${episodeId}_${hash}.${ext}`;

      // Read file content for upload
      // Note: unstorage setItem usually takes string/buffer/object.
      // To avoid loading 100MB into memory, we ideally stream it.
      // But `unstorage` S3 driver via `setItem` might not support stream input directly depending on implementation.
      // However, `fs.readFileSync` buffers it.
      // Given we are in a serverless/container environment, reading 50-100MB might be okay, but ideal is streaming.
      // Since we are using `unstorage`, let's try passing the buffer.
      // We already downloaded to disk, so we can read it.
      const fileBuffer = fs.readFileSync(tempFilePath);

      try {
        const publicUrl = await uploadFileToStorage(
          fileBuffer,
          storageKey,
          contentType
        );
        console.log(
          `[Transcription] Uploaded to ${publicUrl}. Calling Groq with URL...`
        );

        const result = await transcribeAudio(publicUrl);
        text = result.text;
        language = result.language;
        segments = result.segments;
      } finally {
        console.log(`[Transcription] Cleaning up temporary file from R2...`);
        try {
          await deleteFileFromStorage(storageKey);
        } catch (cleanupError) {
          console.error(
            `[Transcription] Failed to delete temporary file ${storageKey}:`,
            cleanupError
          );
        }
      }
    } else {
      console.log(
        `[Transcription] File size is small. Calling Groq directly...`
      );
      // Read file buffer
      const fileBuffer = fs.readFileSync(tempFilePath);
      const result = await transcribeAudio(fileBuffer, originalFilename);
      text = result.text;
      language = result.language;
      segments = result.segments;
    }

    console.log(
      `[Transcription] Transcription complete. Language: ${language}, Length: ${text.length}, Segments: ${segments.length}`
    );

    // 5. Insert into transcripts table
    await db.delete(transcripts).where(eq(transcripts.episodeId, episodeId));

    await db.insert(transcripts).values({
      episodeId: episodeId,
      content: text,
      language: language,
      segments: segments,
      audioHash: hash,
    });

    console.log(`[Transcription] Transcript saved to database.`);

    // 5. Trigger downstream tasks
    await enqueueJob("extract_topics", { episodeId });
    console.log(`[Transcription] Triggered extract_topics job.`);
  } finally {
    // Cleanup local temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
