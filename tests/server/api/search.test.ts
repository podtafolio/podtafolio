import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

vi.stubGlobal("defineCachedEventHandler", (handler: any) => handler);

// Mock dependencies
vi.mock("../../../server/utils/itunes", () => ({
  searchPodcasts: vi.fn(),
}));

vi.mock("../../../server/utils/podcastService", () => ({
  findPodcastsByTerm: vi.fn(),
  findPodcastsByFeedUrls: vi.fn(),
}));

vi.mock("h3", async () => {
  return {
    getQuery: vi.fn(),
    createError: (opts: any) => opts,
    defineEventHandler: (handler: any) => handler,
  };
});

// We need to import these to mock them or use them in assertions
import { searchPodcasts } from "../../../server/utils/itunes";
import {
  findPodcastsByTerm,
  findPodcastsByFeedUrls,
} from "../../../server/utils/podcastService";
import { getQuery } from "h3";

describe("Search API", () => {
  let searchHandler: any;

  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import("../../../server/api/search.get");
    searchHandler = mod.default;
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should merge local and itunes results correctly", async () => {
    // Setup
    const term = "test";
    vi.mocked(getQuery).mockReturnValue({ term });

    const itunesResults = [
      { title: "Pod A", feedUrl: "http://a.com", author: "A" },
      { title: "Pod B", feedUrl: "http://b.com", author: "B" },
    ];
    vi.mocked(searchPodcasts).mockResolvedValue(itunesResults as any);

    const localTermResults = [
      {
        id: "1",
        title: "Pod A",
        feedUrl: "http://a.com",
        author: "A",
        status: "ready",
        imageUrl: "img",
        description: "desc",
        websiteUrl: "web",
      },
    ];
    vi.mocked(findPodcastsByTerm).mockResolvedValue(localTermResults as any);
    vi.mocked(findPodcastsByFeedUrls).mockResolvedValue([]);

    // Execute
    const response: any = await searchHandler({} as any);

    // Verify
    expect(searchPodcasts).toHaveBeenCalledWith(term);
    expect(findPodcastsByTerm).toHaveBeenCalledWith(term);
    // Since "http://a.com" was found in localTermResults, we only need to check "http://b.com"
    expect(findPodcastsByFeedUrls).toHaveBeenCalledWith(["http://b.com"]);

    expect(response).toHaveLength(2);

    // Pod A (Local)
    const podA = response.find((p: any) => p.feedUrl === "http://a.com");
    expect(podA).toMatchObject({
      title: "Pod A",
      isImported: true,
      id: "1",
    });

    // Pod B (iTunes)
    const podB = response.find((p: any) => p.feedUrl === "http://b.com");
    expect(podB).toMatchObject({
      title: "Pod B",
      isImported: false,
    });
    expect(podB.id).toBeUndefined();
  });

  it("should handle iTunes failure gracefully", async () => {
    const term = "test";
    vi.mocked(getQuery).mockReturnValue({ term });

    vi.mocked(searchPodcasts).mockRejectedValue(new Error("iTunes down"));

    const localResults = [
      {
        id: "2",
        title: "Local Only",
        feedUrl: "http://local.com",
        status: "importing",
      },
    ];
    vi.mocked(findPodcastsByTerm).mockResolvedValue(localResults as any);
    vi.mocked(findPodcastsByFeedUrls).mockResolvedValue([]);

    const response: any = await searchHandler({} as any);

    expect(response).toHaveLength(1);
    expect(response[0].title).toBe("Local Only");

    // iTunes failed, so itunesResults is [].
    // localFeedUrls = ["http://local.com"].
    // itunesFeedUrls = [].
    // feedUrlsToCheck = [].
    // findPodcastsByFeedUrls should NOT be called (or checked if length > 0)
    expect(findPodcastsByFeedUrls).not.toHaveBeenCalled();
  });
});
