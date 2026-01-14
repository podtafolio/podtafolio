import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTopicsHandler } from "../../../server/jobs/extractTopics";
import { db } from "../../../server/utils/db";
import { generateObject } from "ai";

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
          findFirst: vi.fn(),
        },
      },
      insert: insertMock,
    },
  };
});

vi.mock("../../../server/utils/ai", () => ({
  google: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

describe("extractTopicsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract topics and save them", async () => {
    // Mock transcript
    (db.query.transcripts.findFirst as any).mockResolvedValue({
      content: "This is a transcript about AI and Climate Change.",
      segments: [],
    });

    // Mock AI response
    (generateObject as any).mockResolvedValue({
      object: {
        topics: ["AI", "Climate Change"],
      },
    });

    await extractTopicsHandler({ episodeId: "ep-1" });

    expect(db.query.transcripts.findFirst).toHaveBeenCalled();
    expect(generateObject).toHaveBeenCalled();

    // We expect 4 calls to insert:
    // 1. Insert topic 'AI'
    // 2. Link 'AI' to episode
    // 3. Insert topic 'Climate Change'
    // 4. Link 'Climate Change' to episode
    expect(db.insert).toHaveBeenCalledTimes(4);
  });

  it("should handle existing topics", async () => {
    // Mock transcript
    (db.query.transcripts.findFirst as any).mockResolvedValue({
      content: "This is a transcript about AI.",
      segments: [],
    });

    // Mock AI response
    (generateObject as any).mockResolvedValue({
      object: {
        topics: ["AI"],
      },
    });

    // Mock existing topic
    (db.query.topics.findFirst as any).mockResolvedValue({
      id: "existing-id",
      name: "AI",
    });

    await extractTopicsHandler({ episodeId: "ep-1" });

    // Should check if topic exists
    expect(db.query.topics.findFirst).toHaveBeenCalled();

    // Should NOT insert topic, ONLY insert link
    // But wait, the code calls insert for link.
    // So 1 insert call (for link).
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
