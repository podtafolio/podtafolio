import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock global defineCachedEventHandler
vi.stubGlobal("defineCachedEventHandler", (handler: any) => handler);

// Mock DB
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: vi.fn(), // For await
};

vi.mock("../../../../server/utils/db", () => ({
  db: mockDb,
}));

// Mock schema to avoid import errors or real DB interaction implications
vi.mock("../../../../server/database/schema", () => ({
  entities: { id: "entities.id", name: "entities.name" },
  episodesEntities: { episodeId: "ee.episodeId", entityId: "ee.entityId" },
  episodes: { id: "e.id", publishedAt: "e.publishedAt" },
}));

describe("Trending Entities API", () => {
  let trendingHandler: any;

  beforeAll(async () => {
    const mod = await import("../../../../server/api/entities/trending.get");
    trendingHandler = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chain return values
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.innerJoin.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.groupBy.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
  });

  it("should fetch trending entities", async () => {
    const mockData = [
      { id: "1", name: "Entity 1", count: 10 },
      { id: "2", name: "Entity 2", count: 5 },
    ];

    // Mock the final resolution
    // We mock `.then` to simulate await behavior or just make the chain return a promise-like object?
    // Actually, awaiting the chain triggers `.then` or checking if it's a promise.
    // The easiest way with `mockReturnThis` is if the last call returns a Promise.
    // In the code: .limit(6) is awaited.

    mockDb.limit.mockResolvedValue(mockData);

    const response = await trendingHandler({} as any);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalled();
    expect(mockDb.innerJoin).toHaveBeenCalledTimes(2);
    expect(mockDb.limit).toHaveBeenCalledWith(6);
    expect(response).toEqual({ data: mockData });
  });
});
