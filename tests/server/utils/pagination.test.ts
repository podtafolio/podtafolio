import { describe, it, expect, vi } from "vitest";
import {
  getPaginationParams,
  createPaginatedResponse,
} from "../../../server/utils/pagination";

// Mock h3
vi.mock("h3", () => ({
  getQuery: (event: any) => event.query || {},
}));

describe("pagination utils", () => {
  it("getPaginationParams returns defaults", () => {
    const event = { query: {} } as any;
    const result = getPaginationParams(event);
    expect(result).toEqual({ page: 1, limit: 30, offset: 0 });
  });

  it("getPaginationParams parses values", () => {
    const event = { query: { page: "2", limit: "10" } } as any;
    const result = getPaginationParams(event);
    expect(result).toEqual({ page: 2, limit: 10, offset: 10 });
  });

  it("getPaginationParams handles invalid values", () => {
    const event = { query: { page: "abc", limit: "-5" } } as any;
    const result = getPaginationParams(event);
    expect(result).toEqual({ page: 1, limit: 30, offset: 0 });
  });

  it("createPaginatedResponse formats correctly", () => {
    const data = ["a", "b"];
    const total = 10;
    const params = { page: 1, limit: 5, offset: 0 };
    const result = createPaginatedResponse(data, total, params);
    expect(result).toEqual({
      data,
      meta: {
        total: 10,
        page: 1,
        limit: 5,
        totalPages: 2,
      },
    });
  });
});
