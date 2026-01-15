import { embed } from "ai";
import { google } from "./ai";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./constants";

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      },
    });
    return embedding;
  } catch (error) {
    console.error(`Error generating embedding for text: "${text.slice(0, 50)}..."`, error);
    throw error;
  }
}
