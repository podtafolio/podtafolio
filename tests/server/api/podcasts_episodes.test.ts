import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock functions
const getRouterParamMock = vi.fn();
const getQueryMock = vi.fn();

// Stub globals
vi.stubGlobal("defineCachedEventHandler", (handler: any) => handler);
vi.stubGlobal("getPaginationParams", () => ({ limit: 10, offset: 0, page: 1 }));
vi.stubGlobal("createPaginatedResponse", (data: any, total: any) => ({ data, meta: { total } }));
vi.stubGlobal("getRouterParam", getRouterParamMock);
vi.stubGlobal("getQuery", getQueryMock);
vi.stubGlobal("createError", (opts: any) => opts);

// Mock H3 - for explicit imports if any
vi.mock("h3", async () => {
  return {
    getRouterParam: getRouterParamMock,
    getQuery: getQueryMock,
    createError: (opts: any) => opts,
    defineEventHandler: (handler: any) => handler,
  };
});

// Mock DB
const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn(), // This is the end of the chain in the second query
};

// We need to handle the two different select calls.
// 1. db.select({ value: count() }) -> returns array [{ value: 10 }]
// 2. db.select() -> returns array [episode1, episode2]

const mockDb = {
  query: {
    podcasts: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
};

vi.stubGlobal("db", mockDb);

vi.mock("../../../server/utils/db", () => ({
  db: mockDb,
}));

// We need to import the handler dynamically
import { episodes } from "../../../server/database/schema";

describe("Podcast Episodes API", () => {
  let handler: any;

  beforeAll(async () => {
    const mod = await import("../../../server/api/podcasts/[id]/episodes.get");
    handler = mod.default;
  });

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mocks
    mockDb.select.mockReturnValue(mockSelectChain);
    // count() query
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
  });

  it("should fetch episodes in parallel and select specific columns", async () => {
    getRouterParamMock.mockReturnValue("podcast-123");
    getQueryMock.mockReturnValue({});

    // Mock podcast existence
    mockDb.query.podcasts.findFirst.mockResolvedValue({ id: "podcast-123" });

    // Mock count query result
    // The first select call is db.select({ value: count() })
    // The chain is .from().where() -> await

    // Mock data query result
    // The second select call is db.select()
    // The chain is .from().where().limit().offset().orderBy() -> await

    // Implementation of the chain mock
    const countResult = [{ value: 50 }];
    const dataResult = [{ id: "ep-1", title: "Episode 1" }];

    // We can use a sophisticated mock for `db.select`
    mockDb.select.mockImplementation((args) => {
      // Check if it's the count query (has args) or select-all (no args/undefined)
      if (args && args.value) {
        // Count query chain
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(countResult), // await where(...)
        };
      } else {
        // Data query chain
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(dataResult), // await orderBy(...)
        };
      }
    });

    const response = await handler({} as any);

    expect(mockDb.query.podcasts.findFirst).toHaveBeenCalled();
    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(response.data).toEqual(dataResult);
    expect(response.meta.total).toBe(50);
  });
});
