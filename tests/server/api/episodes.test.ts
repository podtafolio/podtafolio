import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Stub global defineCachedEventHandler
vi.stubGlobal("defineCachedEventHandler", (handler: any) => handler);

// Stub global getRouterParam (simulating h3/nitro)
vi.stubGlobal("getRouterParam", (event: any, key: string) => {
  return event.context?.params?.[key];
});

// Stub createError
vi.stubGlobal("createError", (opts: any) => opts);

// Mock DB
const mockQueryBuilder = {
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]), // Default resolve to array
};

const dbMock = {
  query: {
    episodes: {
      findFirst: vi.fn(),
    },
    transcripts: {
      findFirst: vi.fn(),
    },
    summaries: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(() => mockQueryBuilder),
};

// Stub global db
vi.stubGlobal("db", dbMock);

vi.mock("../../../server/utils/db", () => ({
  db: dbMock,
}));

describe("Episode API", () => {
  let episodeHandler: any;

  beforeAll(async () => {
    // Dynamic import to verify the file works
    const mod = await import("../../../server/api/episodes/[id].get");
    episodeHandler = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default implementations if needed
    mockQueryBuilder.where.mockResolvedValue([]);
  });

  it("should return 400 if ID is missing", async () => {
    const event = { context: { params: {} } };
    try {
      await episodeHandler(event);
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
    }
  });

  it("should return 404 if episode not found", async () => {
    const event = { context: { params: { id: "123" } } };
    dbMock.query.episodes.findFirst.mockResolvedValue(null);

    try {
      await episodeHandler(event);
    } catch (e: any) {
      expect(e.statusCode).toBe(404);
    }
  });

  it("should return consolidated episode data", async () => {
    const event = { context: { params: { id: "123" } } };

    const mockEpisode = { id: "123", title: "Test Episode" };
    const mockTranscript = { id: "t1", content: "Transcript content" };
    const mockSummary = { id: "s1", content: "Summary content" };
    const mockEntities = [{ id: "e1", name: "Entity 1", type: "Person" }];

    dbMock.query.episodes.findFirst.mockResolvedValue(mockEpisode);
    dbMock.query.transcripts.findFirst.mockResolvedValue(mockTranscript);
    dbMock.query.summaries.findFirst.mockResolvedValue(mockSummary);
    mockQueryBuilder.where.mockResolvedValue(mockEntities);

    const response = await episodeHandler(event);

    expect(dbMock.query.episodes.findFirst).toHaveBeenCalled();
    // After optimization, these should be called
    expect(dbMock.query.transcripts.findFirst).toHaveBeenCalled();
    expect(dbMock.query.summaries.findFirst).toHaveBeenCalled();
    expect(dbMock.select).toHaveBeenCalled();

    expect(response.data).toEqual({
      ...mockEpisode,
      transcript: mockTranscript,
      summary: mockSummary,
      entities: mockEntities,
    });
  });
});
