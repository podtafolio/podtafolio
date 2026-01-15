import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEmbedding } from "../../../server/utils/embeddings";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "../../../server/utils/constants";

// Hoist mocks
const mocks = vi.hoisted(() => ({
  embed: vi.fn(),
  textEmbeddingModel: vi.fn().mockReturnValue("mock-google-model"),
}));

vi.mock("ai", () => ({
  embed: mocks.embed,
}));

vi.mock("../../../server/utils/ai", () => ({
  google: {
      textEmbeddingModel: mocks.textEmbeddingModel
  },
}));

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3] });
  });

  it("should call embed with correct model and options", async () => {
    const text = "test text";
    await generateEmbedding(text);

    expect(mocks.textEmbeddingModel).toHaveBeenCalledWith(EMBEDDING_MODEL);

    expect(mocks.embed).toHaveBeenCalledWith({
      model: "mock-google-model",
      value: text,
      providerOptions: {
        google: {
            outputDimensionality: EMBEDDING_DIMENSIONS
        }
      }
    });
  });

  it("should return the embedding", async () => {
    const result = await generateEmbedding("test");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("should throw error if embed fails", async () => {
      mocks.embed.mockRejectedValue(new Error("API Error"));
      await expect(generateEmbedding("test")).rejects.toThrow("API Error");
  });
});
