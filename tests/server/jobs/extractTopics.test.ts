import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTopicsHandler } from "../../../server/jobs/extractTopics";
import { db } from "../../../server/utils/db";
import { generateObject } from "ai";
import type { Job } from "bullmq";
import type { ExtractTopicsPayload } from "../../../server/jobs/extractTopics";

// Helper to create mock BullMQ Job
function createMockJob(data: ExtractTopicsPayload): Job<ExtractTopicsPayload> {
  return {
    data,
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<ExtractTopicsPayload>;
}

// Mock dependencies
vi.mock("../../../server/utils/db", () => {
  const insertMock = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([{ id: "mock-topic-id" }]),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    })),
  }));
  return {
    db: {
      query: {
        transcripts: {
          findFirst: vi.fn(),
        },
        topics: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
      insert: insertMock,
      run: vi.fn(),
    },
  };
});

vi.mock("../../../server/utils/ai", () => ({
  google: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("../../../server/utils/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

describe("extractTopicsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract topics and save them (new topics)", async () => {
    // Mock transcript
    (db.query.transcripts.findFirst as any).mockResolvedValue({
      content: "This is a transcript about AI and Climate Change.",
      segments: [],
      language: "en",
    });

    // Mock AI response
    (generateObject as any).mockResolvedValue({
      object: {
        topics: ["AI", "Climate Change"],
      },
    });

    // Mock existing topics (none)
    (db.query.topics.findMany as any).mockResolvedValue([]);

    // Mock vector search (no match)
    (db.run as any).mockResolvedValue({ rows: [] });

    await extractTopicsHandler(createMockJob({ episodeId: "ep-1" }));

    expect(db.query.transcripts.findFirst).toHaveBeenCalled();
    expect(generateObject).toHaveBeenCalled();
    expect(db.query.topics.findMany).toHaveBeenCalled();

    // We expect 4 calls to insert:
    // 1. Insert topic 'AI'
    // 2. Link 'AI' to episode
    // 3. Insert topic 'Climate Change'
    // 4. Link 'Climate Change' to episode
    expect(db.insert).toHaveBeenCalledTimes(4);
  });

  it("should handle existing topics (exact match)", async () => {
    // Mock transcript
    (db.query.transcripts.findFirst as any).mockResolvedValue({
      content: "This is a transcript about AI.",
      segments: [],
      language: "en",
    });

    // Mock AI response
    (generateObject as any).mockResolvedValue({
      object: {
        topics: ["AI"],
      },
    });

    // Mock existing topic
    (db.query.topics.findMany as any).mockResolvedValue([{
      id: "existing-id",
      name: "AI",
    }]);

    await extractTopicsHandler(createMockJob({ episodeId: "ep-1" }));

    expect(db.query.topics.findMany).toHaveBeenCalled();

    // Should NOT insert topic, ONLY insert link
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("should handle fuzzy match via vector search", async () => {
    // Mock transcript
    (db.query.transcripts.findFirst as any).mockResolvedValue({
      content: "This is a transcript about Artificial Intel.",
      segments: [],
      language: "en",
    });

    // Mock AI response
    (generateObject as any).mockResolvedValue({
      object: {
        topics: ["Artificial Intel"],
      },
    });

    // Mock existing topics (none exact)
    (db.query.topics.findMany as any).mockResolvedValue([]);

    // Mock vector search (match found)
    (db.run as any).mockResolvedValue({
        rows: [{ id: "fuzzy-match-id", distance: 0.1 }]
    });

    await extractTopicsHandler(createMockJob({ episodeId: "ep-1" }));

    // Should find match and NOT insert new topic
    // Only insert link
    expect(db.insert).toHaveBeenCalledTimes(1);

    expect(db.run).toHaveBeenCalled();
  });
});
