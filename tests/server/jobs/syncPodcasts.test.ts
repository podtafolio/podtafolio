import { describe, it, expect, vi, beforeEach } from "vitest";
import { JOB_PODCAST_IMPORT } from "../../../server/jobs/keys";

const mocks = vi.hoisted(() => {
  return {
    db: {
      select: vi.fn(),
    },
    queues: {},
    enqueueJob: vi.fn(),
  };
});

vi.mock("../../../server/utils/db", () => ({
  db: mocks.db,
}));

vi.mock("../../../server/utils/queue", () => ({
  queues: mocks.queues,
  enqueueJob: mocks.enqueueJob,
}));

import { syncPodcastsHandler } from "../../../server/jobs/syncPodcasts";

describe("syncPodcastsHandler", () => {
  let mockFrom: any;
  let mockWhere: any;
  let mockGetJobs: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWhere = vi.fn().mockResolvedValue([]);
    mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mocks.db.select.mockReturnValue({ from: mockFrom });

    mockGetJobs = vi.fn().mockResolvedValue([]);
    // Reset the queue mock for the specific job type
    mocks.queues[JOB_PODCAST_IMPORT] = {
      getJobs: mockGetJobs,
    };
  });

  it("should schedule sync for stale podcasts", async () => {
    // Mock Stale Podcasts
    mockWhere.mockResolvedValue([
      { id: "p1", feedUrl: "url1", lastScrapedAt: new Date(0) },
    ]);

    await syncPodcastsHandler({} as any);

    expect(mocks.enqueueJob).toHaveBeenCalledWith(JOB_PODCAST_IMPORT, {
      podcastId: "p1",
      feedUrl: "url1",
    });
  });

  it("should skip already active podcasts", async () => {
    // Mock Active Jobs
    mockGetJobs.mockResolvedValue([
      { data: { podcastId: "p1" } },
    ]);

    // Mock Stale Podcasts (p1 is active, p2 is not)
    mockWhere.mockResolvedValue([
      { id: "p1", feedUrl: "url1" },
      { id: "p2", feedUrl: "url2" },
    ]);

    await syncPodcastsHandler({} as any);

    // Should only schedule p2
    expect(mocks.enqueueJob).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueJob).toHaveBeenCalledWith(JOB_PODCAST_IMPORT, {
      podcastId: "p2",
      feedUrl: "url2",
    });
  });

  it("should throw error if queue is missing", async () => {
    delete mocks.queues[JOB_PODCAST_IMPORT];

    await expect(syncPodcastsHandler({} as any)).rejects.toThrow(
      `Queue not found for job type: ${JOB_PODCAST_IMPORT}`
    );
  });
});
