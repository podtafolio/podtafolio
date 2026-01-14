import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  importPodcast,
  findPodcastsByTermOrFeedUrls,
} from "../../../server/utils/podcastService";
import { podcasts } from "../../../server/database/schema";

const mocks = vi.hoisted(() => {
  const txMock = {
    update: vi.fn(),
    insert: vi.fn(),
  };

  const dbMock = {
    transaction: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  };

  return {
    parsePodcastFeed: vi.fn(),
    invalidatePodcastCache: vi.fn(),
    db: dbMock,
    tx: txMock,
  };
});

vi.mock("../../../server/utils/db", () => ({
  db: mocks.db,
}));

vi.mock("../../../server/utils/feedParser", () => ({
  parsePodcastFeed: mocks.parsePodcastFeed,
}));

vi.mock("../../../server/utils/cache", () => ({
  invalidatePodcastCache: mocks.invalidatePodcastCache,
}));

describe("podcastService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup transaction mock to execute callback immediately
    mocks.db.transaction.mockImplementation(async (cb) => {
      return await cb(mocks.tx);
    });

    // Setup chaining for tx.update
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.tx.update.mockReturnValue({ set: setMock });

    // Setup chaining for tx.insert
    const onConflictMock = vi.fn().mockResolvedValue(undefined);
    const valuesMock = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictMock });
    mocks.tx.insert.mockReturnValue({ values: valuesMock });

    // Setup chaining for db.update (used in error handler)
    const dbWhereMock = vi.fn().mockResolvedValue(undefined);
    const dbSetMock = vi.fn().mockReturnValue({ where: dbWhereMock });
    mocks.db.update.mockReturnValue({ set: dbSetMock });

    // Setup chaining for db.select
    const dbWhereSelectMock = vi.fn().mockResolvedValue([]);
    const dbFromMock = vi.fn().mockReturnValue({ where: dbWhereSelectMock });
    mocks.db.select.mockReturnValue({ from: dbFromMock });
  });

  describe("importPodcast", () => {
    it("should successfully import podcast and episodes", async () => {
      const feedUrl = "https://example.com/rss";
      const podcastId = "pod_123";
      const mockFeedData = {
        title: "Test Podcast",
        description: "Desc",
        imageUrl: "img.jpg",
        author: "Author",
        websiteUrl: "web.com",
        episodes: [
          {
            title: "Ep 1",
            description: "Ep Desc",
            audioUrl: "audio.mp3",
            imageUrl: "ep_img.jpg",
            publishedAt: new Date(),
            duration: 100,
            guid: "guid1",
          },
        ],
      };

      mocks.parsePodcastFeed.mockResolvedValue(mockFeedData);

      await importPodcast(feedUrl, podcastId);

      // Verify feed parsing
      expect(mocks.parsePodcastFeed).toHaveBeenCalledWith(feedUrl);

      // Verify update podcast
      expect(mocks.tx.update).toHaveBeenCalledWith(podcasts);
      // Check set values
      const setCall = mocks.tx.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Podcast",
          status: "ready",
        }),
      );

      // Verify insert episodes
      expect(mocks.tx.insert).toHaveBeenCalled();

      // Verify cache invalidation
      expect(mocks.invalidatePodcastCache).toHaveBeenCalledWith(podcastId);
    });

    it("should handle errors and update status to error", async () => {
      const feedUrl = "https://example.com/rss";
      const podcastId = "pod_123";
      const error = new Error("Feed parse failed");

      mocks.parsePodcastFeed.mockRejectedValue(error);

      await importPodcast(feedUrl, podcastId);

      // Verify error update
      expect(mocks.db.update).toHaveBeenCalledWith(podcasts);
      const setCall = mocks.db.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          importError: "Feed parse failed",
        }),
      );

      // Verify cache invalidation even on error
      expect(mocks.invalidatePodcastCache).toHaveBeenCalledWith(podcastId);
    });
  });

  describe("findPodcastsByTermOrFeedUrls", () => {
    it("should query with search term", async () => {
      await findPodcastsByTermOrFeedUrls("test", []);

      expect(mocks.db.select).toHaveBeenCalled();
      // We can't easily check the complex where clause object structure from Drizzle,
      // but we verify the chain was called.
      const fromCall = mocks.db.select.mock.results[0].value.from;
      expect(fromCall).toHaveBeenCalledWith(podcasts);
    });
  });
});
