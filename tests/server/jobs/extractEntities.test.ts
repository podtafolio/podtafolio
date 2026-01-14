import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    db: {
      query: {
        transcripts: {
          findFirst: vi.fn(),
        },
        entities: {
          findFirst: vi.fn(),
        },
        entityTypes: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(), // Added update
    },
    generateObject: vi.fn(),
    google: vi.fn(),
    eq: vi.fn(),
  };
});

vi.mock("../../../server/utils/db", () => ({
  db: mocks.db,
}));

vi.mock("ai", () => ({
  generateObject: (...args: any[]) => mocks.generateObject(...args),
}));

vi.mock("../../../server/utils/ai", () => ({
  google: mocks.google,
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  return {
    ...actual,
    eq: mocks.eq,
  };
});

import { extractEntitiesHandler } from "../../../server/jobs/extractEntities";
import type { Job } from "bullmq";
import type { ExtractEntitiesPayload } from "../../../server/jobs/extractEntities";

// Helper to create mock BullMQ Job
function createMockJob(
  data: ExtractEntitiesPayload
): Job<ExtractEntitiesPayload> {
  return {
    data,
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<ExtractEntitiesPayload>;
}

describe("extractEntitiesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for insert returning
    const mockValues = vi.fn();
    const mockReturning = vi.fn().mockResolvedValue([{ id: "new_id" }]);
    const mockOnConflictDoNothing = vi.fn();

    mocks.db.insert.mockReturnValue({
      values: mockValues,
    });
    mockValues.mockImplementation(() => ({
      returning: mockReturning,
      onConflictDoNothing: mockOnConflictDoNothing,
    }));
  });

  it("should extract entities, create types, and save them", async () => {
    // Setup Transcript
    mocks.db.query.transcripts.findFirst.mockResolvedValue({
      episodeId: "ep1",
      content: "Hello, I am Elon Musk and I live in the United States.",
      segments: [
        { text: "Hello, I am Elon Musk" },
        { text: "and I live in the United States." },
      ],
    });

    // Setup AI response
    mocks.generateObject.mockResolvedValue({
      object: {
        entities: [{ name: "Elon Musk", type: "Person" }],
      },
    });

    // Setup Type Lookup
    // 1. Person: Not found
    mocks.db.query.entityTypes.findFirst.mockResolvedValue(null);

    // Setup Entity Lookup
    // 1. Elon Musk: Not found
    mocks.db.query.entities.findFirst.mockResolvedValue(null);

    await extractEntitiesHandler(createMockJob({ episodeId: "ep1" }));

    // Verify
    expect(mocks.db.query.transcripts.findFirst).toHaveBeenCalled();
    expect(mocks.generateObject).toHaveBeenCalled();

    // Should insert Type 'Person'
    // Should insert Entity 'Elon Musk'
    // Should insert Link

    // We can't easily check exact call order with shared mock, but we can check call counts
    // db.insert called for:
    // 1. Type (Person)
    // 2. Entity (Elon)
    // 3. Link
    expect(mocks.db.insert).toHaveBeenCalledTimes(3);
  });
});
