import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  enqueueJob,
  getJobCounts,
  claimNextJob,
  completeJob,
  failJob,
  STUCK_TIMEOUT_MS,
} from "../../../server/utils/queue";
import { jobs } from "../../../server/database/schema";

const mocks = vi.hoisted(() => {
  const txMock = {
    update: vi.fn(),
    insert: vi.fn(),
    query: {
      jobs: {
        findFirst: vi.fn(),
      },
    },
  };

  const dbMock = {
    transaction: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    query: {
      jobs: {
        findFirst: vi.fn(),
      },
    },
  };

  return {
    db: dbMock,
    tx: txMock,
  };
});

vi.mock("../../../server/utils/db", () => ({
  db: mocks.db,
}));

describe("queue utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Transaction mock
    mocks.db.transaction.mockImplementation(async (cb) => {
      return await cb(mocks.tx);
    });

    // Chain helpers
    const chain = (m: any) => {
      m.mockReturnValue(m);
      return m;
    };

    // db.insert().values()
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values: valuesMock });

    // db.select().from().where().groupBy()
    // We need to return an array for getJobCounts
    const groupByMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.db.select.mockReturnValue({ from: fromMock });

    // tx.update().set().where()
    const txWhereMock = vi.fn().mockResolvedValue(undefined);
    const txSetMock = vi.fn().mockReturnValue({ where: txWhereMock });
    mocks.tx.update.mockReturnValue({ set: txSetMock });

    // db.update().set().where()
    const dbWhereUpdateMock = vi.fn().mockResolvedValue(undefined);
    const dbSetUpdateMock = vi
      .fn()
      .mockReturnValue({ where: dbWhereUpdateMock });
    mocks.db.update.mockReturnValue({ set: dbSetUpdateMock });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("enqueueJob", () => {
    it("should insert a pending job", async () => {
      const payload = { podcastId: "1" };
      await enqueueJob("import_podcast", payload as any);

      expect(mocks.db.insert).toHaveBeenCalledWith(jobs);
      const valuesCall = mocks.db.insert.mock.results[0].value.values;
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "import_podcast",
          payload,
          status: "pending",
        }),
      );
    });
  });

  describe("getJobCounts", () => {
    it("should query active processing jobs", async () => {
      // Setup return value
      const groupByMock = mocks.db.select().from().where().groupBy;
      groupByMock.mockResolvedValue([
        { type: "import_podcast", count: 2 },
        { type: "episode_transcription", count: 1 },
      ]);

      const counts = await getJobCounts();

      expect(counts).toEqual({
        import_podcast: 2,
        episode_transcription: 1,
      });
    });
  });

  describe("claimNextJob", () => {
    it("should return null if no jobs available", async () => {
      mocks.tx.query.jobs.findFirst.mockResolvedValue(null);

      const result = await claimNextJob(["import_podcast"]);
      expect(result).toBeNull();
    });

    it("should claim a job and mark it processing", async () => {
      const mockJob = { id: "job_1", type: "import_podcast" };
      mocks.tx.query.jobs.findFirst.mockResolvedValue(mockJob);

      const result = await claimNextJob(["import_podcast"]);

      expect(result).toEqual(mockJob);

      // Verify update
      expect(mocks.tx.update).toHaveBeenCalledWith(jobs);
      const setCall = mocks.tx.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "processing",
        }),
      );
    });
  });

  describe("completeJob", () => {
    it("should mark job as completed", async () => {
      await completeJob("job_1");

      expect(mocks.db.update).toHaveBeenCalledWith(jobs);
      const setCall = mocks.db.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
        }),
      );
    });
  });

  describe("failJob", () => {
    it("should retry if retries < MAX", async () => {
      mocks.db.query.jobs.findFirst.mockResolvedValue({ retries: 0 });

      await failJob("job_1", new Error("Fail"));

      const setCall = mocks.db.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          retries: 1,
          error: "Fail",
        }),
      );
    });

    it("should fail permanently if retries >= MAX", async () => {
      // MAX_RETRIES is 3 inside the function
      mocks.db.query.jobs.findFirst.mockResolvedValue({ retries: 3 });

      await failJob("job_1", new Error("Fail"));

      const setCall = mocks.db.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error: "Fail",
        }),
      );
    });
  });
});
