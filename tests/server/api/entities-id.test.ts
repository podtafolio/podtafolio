import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock global defines
vi.stubGlobal("defineEventHandler", (handler: any) => handler);
vi.stubGlobal("getRouterParam", vi.fn());
vi.stubGlobal("createError", (opts: any) => opts);

// Mock dependencies
vi.mock("../../../server/utils/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock schema to avoid import errors if DB is not set up
vi.mock("../../../server/database/schema", () => ({
  entities: { id: "entities.id", name: "entities.name", typeId: "entities.typeId", createdAt: "c", updatedAt: "u" },
  entityTypes: { id: "entityTypes.id", name: "entityTypes.name" },
  episodesEntities: { episodeId: "ee.episodeId", entityId: "ee.entityId" },
  episodes: { id: "episodes.id", title: "episodes.title", publishedAt: "p", podcastId: "pid", imageUrl: "img", duration: "d" },
  podcasts: { id: "podcasts.id", title: "podcasts.title" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}));

import { db } from "../../../server/utils/db";

vi.stubGlobal("db", db);

describe("Entity API", () => {
  let entityHandler: any;

  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import("../../../server/api/entities/[id].get");
    entityHandler = mod.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockQueryChain = (result: any) => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve(result),
    };
    return chain;
  };

  it("should return entity and episodes when entity exists", async () => {
    (getRouterParam as any).mockReturnValue("123");

    const mockEntity = { id: "123", name: "Test Entity" };
    const mockEpisodes = [{ id: "ep1", title: "Episode 1" }];

    // Mock DB calls
    // First call: Entity lookup
    const entityChain = mockQueryChain([mockEntity]);
    // Second call: Episodes lookup
    const episodesChain = mockQueryChain(mockEpisodes);

    vi.mocked(db.select)
      .mockReturnValueOnce(entityChain as any)
      .mockReturnValueOnce(episodesChain as any);

    const response = await entityHandler({} as any);

    // Verify
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(response.data.id).toBe("123");
    expect(response.data.episodes).toEqual(mockEpisodes);
  });

  it("should throw 404 when entity does not exist", async () => {
    (getRouterParam as any).mockReturnValue("999");

    // First call returns empty array (not found)
    const entityChain = mockQueryChain([]);
    // In parallel execution, the second query IS called.
    const episodesChain = mockQueryChain([]); // Return empty episodes

    vi.mocked(db.select)
      .mockReturnValueOnce(entityChain as any)
      .mockReturnValueOnce(episodesChain as any);

    await expect(entityHandler({} as any)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
