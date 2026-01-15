import { embed } from "ai";
import { google } from "./ai";

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google("text-embedding-004"),
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error(`Error generating embedding for text: "${text.slice(0, 50)}..."`, error);
    throw error;
  }
}
