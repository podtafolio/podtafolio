import { describe, it, expect, vi, beforeEach } from "vitest";
import { summarizeEpisodeHandler } from "../../../server/jobs/summarizeEpisode";
import type { Job } from "bullmq";
import type { SummarizeEpisodePayload } from "../../../server/jobs/summarizeEpisode";

// Helper to create mock BullMQ Job
function createMockJob(
  data: SummarizeEpisodePayload
): Job<SummarizeEpisodePayload> {
  return {
    data,
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<SummarizeEpisodePayload>;
}

const mocks = vi.hoisted(() => {
  return {
    generateText: vi.fn(),
    google: vi.fn(),
    db: {
      query: {
        transcripts: {
          findFirst: vi.fn(),
        },
        episodes: {
          findFirst: vi.fn(),
        },
      },
      delete: vi.fn(),
      insert: vi.fn(),
    },
  };
});

vi.mock("ai", () => ({
  generateText: mocks.generateText,
}));

vi.mock("../../../server/utils/ai", () => ({
  google: mocks.google,
}));

vi.mock("../../../server/utils/db", () => ({
  db: mocks.db,
}));

describe("summarizeEpisodeHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chaining for db.delete
    const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where: deleteWhereMock });

    // Setup chaining for db.insert
    const insertValuesMock = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values: insertValuesMock });
  });

  it("should include language in the prompt", async () => {
    const episodeId = "ep_123";
    const transcriptMock = {
      content: "Hello world",
      segments: [],
      language: "Spanish",
    };
    const episodeMock = {
      title: "My Podcast Episode",
    };

    mocks.db.query.transcripts.findFirst.mockResolvedValue(transcriptMock);
    mocks.db.query.episodes.findFirst.mockResolvedValue(episodeMock);
    mocks.generateText.mockResolvedValue({ text: "Summary content" });

    await summarizeEpisodeHandler(createMockJob({ episodeId }));

    expect(mocks.generateText).toHaveBeenCalled();
    const callArgs = mocks.generateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("My Podcast Episode");
    expect(callArgs.prompt).toContain("Spanish");
  });
});
