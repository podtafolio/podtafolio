import { db } from "../utils/db";
import { episodes, transcripts, summaries } from "../database/schema";
import { eq } from "drizzle-orm";
import { google } from "../utils/ai";
import { generateText } from "ai";

export interface SummarizeEpisodePayload {
  episodeId: string;
}

export async function summarizeEpisodeHandler(
  payload: SummarizeEpisodePayload,
) {
  const { episodeId } = payload;
  console.log(`[Summary] Starting summary for episode ${episodeId}`);

  // 1. Fetch transcript
  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.episodeId, episodeId),
  });

  if (!transcript) {
    throw new Error(
      `Transcript for episode ${episodeId} not found. Please transcribe first.`,
    );
  }

  // 2. Fetch episode details for context
  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, episodeId),
  });

  if (!episode) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  // 3. Prepare Prompt
  const segments = transcript.segments as any[];

  let contentInput = "";
  if (segments && Array.isArray(segments) && segments.length > 0) {
    contentInput = segments
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");
  } else {
    contentInput = transcript.content;
    console.warn(
      `[Summary] No segments found for episode ${episodeId}, using plain text.`,
    );
  }

  const prompt = `
You are an expert podcast summarizer and blog post writer.
I will provide you with the transcript of a podcast episode titled "${episode.title}".
Your task is to write a comprehensive blog post summary of this episode.

Requirements:
- Structure it like a blog post with a catchy title, introduction, key topics/takeaways, and a conclusion.
- Use Markdown formatting (headers, bullet points, etc.).
- Use double line breaks between paragraphs to ensure clear separation.
- Write the summary in ${transcript.language}.
- Analyze the topics discussed in depth.
- IMPORTANT: Use footnotes to cite the timestamps of important phrases or topics discussed. Use the format [^timestamp] where timestamp is in MM:SS or HH:MM:SS format.
- At the end of the post, list the footnotes in a section called "Timestamp References".

Here is the transcript (with timestamps if available):
${contentInput}
`;

  // 4. Call AI
  try {
    const { text } = await generateText({
      model: google("gemini-3-flash-preview"),
      prompt: prompt,
    });

    // 5. Save Summary
    // Delete existing summary if any
    await db.delete(summaries).where(eq(summaries.episodeId, episodeId));

    await db.insert(summaries).values({
      episodeId,
      content: text,
    });

    console.log(`[Summary] Summary generated and saved.`);
  } catch (error: any) {
    console.error("[Summary] Error generating summary:", error);
    throw error;
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
