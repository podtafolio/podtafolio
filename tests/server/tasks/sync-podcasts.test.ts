import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub defineTask before importing the task
vi.stubGlobal("defineTask", (task: any) => task);

// Mock dependencies
const mockEnqueueJob = vi.fn();
const mockGetJobs = vi.fn();
const mockDbSelect = vi.fn();

vi.mock("../../../server/utils/db", () => ({
  db: {
    select: (...args: any[]) => mockDbSelect(...args),
  },
}));

vi.mock("../../../server/utils/queue", () => ({
  enqueueJob: (...args: any[]) => mockEnqueueJob(...args),
  queues: {
    podcast_import: {
      getJobs: (...args: any[]) => mockGetJobs(...args),
    },
  },
}));

vi.mock("../../../server/jobs/keys", () => ({
  JOB_PODCAST_IMPORT: "podcast_import",
}));

// We need to reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Default db chain mock
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]), // Default empty
    }),
  });
  mockGetJobs.mockResolvedValue([]);
});

describe("sync-podcasts task", () => {
  it("should schedule jobs for stale podcasts when no jobs are active", async () => {
    // Import dynamically
    const { default: syncPodcastsTask } = await import("../../../server/tasks/sync-podcasts");

    // Mock stale podcasts
    const stalePodcasts = [
        { id: "p1", feedUrl: "http://p1.com", lastScrapedAt: null },
    ];

    mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(stalePodcasts),
        }),
    });

    const result = await syncPodcastsTask.run();

    expect(mockGetJobs).toHaveBeenCalledWith(["active", "waiting", "delayed"]);
    expect(mockEnqueueJob).toHaveBeenCalledWith("podcast_import", { podcastId: "p1", feedUrl: "http://p1.com" });
    expect(result).toEqual({ result: "Scheduled 1 jobs" });
  });

  it("should NOT schedule jobs for podcasts that are already active", async () => {
    const { default: syncPodcastsTask } = await import("../../../server/tasks/sync-podcasts");

    // Mock active jobs
    mockGetJobs.mockResolvedValue([
        { data: { podcastId: "p1", feedUrl: "http://p1.com" } }
    ]);

    // Mock stale podcasts (p1 is active, p2 is not)
    const stalePodcasts = [
        { id: "p1", feedUrl: "http://p1.com", lastScrapedAt: null },
        { id: "p2", feedUrl: "http://p2.com", lastScrapedAt: null },
    ];

    mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(stalePodcasts),
        }),
    });

    const result = await syncPodcastsTask.run();

    expect(mockGetJobs).toHaveBeenCalled();
    // Should only schedule p2
    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    expect(mockEnqueueJob).toHaveBeenCalledWith("podcast_import", { podcastId: "p2", feedUrl: "http://p2.com" });
    expect(result).toEqual({ result: "Scheduled 1 jobs" });
  });
});
