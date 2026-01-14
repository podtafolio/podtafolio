import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";

// Mock dependencies
vi.mock("bullmq", () => {
  const MockQueue = vi.fn(() => ({
    add: vi.fn(),
  }));
  return { Queue: MockQueue };
});

vi.mock("../../../server/utils/redis", () => ({
  getRedisConnection: vi.fn(),
}));

vi.mock("../../../server/jobs/keys", () => ({
  ALL_JOBS: ["test_job"],
  JOB_PODCAST_IMPORT: "test_job",
}));

// Import after mocks
import { enqueueJob, queues } from "../../../server/utils/queue";

describe("queue utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have initialized queues", () => {
      // We check that the queue object is present and is our mock
      expect(queues["test_job"]).toBeDefined();
      expect(queues["test_job"].add).toBeDefined();
      // Note: We cannot check Queue constructor calls here because they happened
      // at module load time, and beforeEach clears the history.
    });
  });

  describe("enqueueJob", () => {
    it("should add job to the correct queue", async () => {
      const payload = { some: "data" };
      await enqueueJob("test_job" as any, payload as any);

      const queue = queues["test_job"];
      expect(queue.add).toHaveBeenCalledWith("test_job", payload);
    });

    it("should throw error if queue does not exist", async () => {
      await expect(enqueueJob("invalid_job" as any, {})).rejects.toThrow(
        "No queue found",
      );
    });
  });
});
