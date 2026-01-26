import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Stub globals
vi.stubGlobal("defineEventHandler", (handler: any) => handler);

const getRouterParamMock = vi.fn();
vi.stubGlobal("getRouterParam", getRouterParamMock);

const createErrorMock = vi.fn((opts) => opts);
vi.stubGlobal("createError", createErrorMock);

// Mock db
const dbMock = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(), // Distinct terminator for query 1
  orderBy: vi.fn(), // Distinct terminator for query 2
  then: vi.fn(),
};

// Stub db global since it is auto-imported in the handler
vi.stubGlobal("db", dbMock);

describe("Entities API", () => {
  let handler: any;

  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import("../../../server/api/entities/[id].get");
    handler = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks to return self
    dbMock.select.mockReturnThis();
    dbMock.from.mockReturnThis();
    dbMock.leftJoin.mockReturnThis();
    dbMock.innerJoin.mockReturnThis();
    dbMock.where.mockReturnThis();
  });

  it("should return entity and episodes when found", async () => {
    const entityId = "ent_123";
    getRouterParamMock.mockReturnValue(entityId);

    const mockEntity = {
      id: entityId,
      name: "Test Entity",
      type: "Person",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const mockEpisodes = [
      {
        id: "ep_1",
        title: "Ep 1",
        publishedAt: new Date(),
        podcastTitle: "Pod 1",
        podcastId: "pod_1",
        imageUrl: "img.jpg",
        duration: 100
      }
    ];

    // Query 1 (Entity) ends with limit(1)
    dbMock.limit.mockResolvedValue([mockEntity]);

    // Query 2 (Episodes) ends with orderBy(...)
    dbMock.orderBy.mockResolvedValue(mockEpisodes);

    const response = await handler({} as any);

    expect(response).toEqual({
      data: {
        ...mockEntity,
        episodes: mockEpisodes,
      },
    });

    expect(dbMock.select).toHaveBeenCalledTimes(2);
    expect(dbMock.limit).toHaveBeenCalledTimes(1);
    expect(dbMock.orderBy).toHaveBeenCalledTimes(1);
  });

  it("should throw 404 if entity not found", async () => {
    const entityId = "ent_missing";
    getRouterParamMock.mockReturnValue(entityId);

    // Query 1 (Entity) -> Empty array
    dbMock.limit.mockResolvedValue([]);

    // Query 2 (Episodes) -> Empty array
    dbMock.orderBy.mockResolvedValue([]);

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Entity not found",
    });

    expect(dbMock.limit).toHaveBeenCalled();
  });
});
