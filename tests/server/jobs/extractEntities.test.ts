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
          findMany: vi.fn(),
        },
        entityTypes: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      run: vi.fn(),
    },
    generateObject: vi.fn(),
    google: vi.fn(),
    generateEmbedding: vi.fn(),
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

vi.mock("../../../server/utils/embeddings", () => ({
  generateEmbedding: mocks.generateEmbedding,
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
  let mockValues: any;
  let mockReturning: any;
  let mockOnConflictDoNothing: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chaining for db.insert
    mockValues = vi.fn();
    mockReturning = vi.fn().mockResolvedValue([{ id: "new_id" }]);
    mockOnConflictDoNothing = vi.fn();

    mocks.db.insert.mockReturnValue({
      values: mockValues,
    });
    mockValues.mockImplementation(() => ({
      returning: mockReturning,
      onConflictDoNothing: mockOnConflictDoNothing,
    }));

    // Setup chaining for db.update
    const mockSet = vi.fn();
    const mockWhere = vi.fn();
    mocks.db.update.mockReturnValue({
      set: mockSet
    });
    mockSet.mockReturnValue({
        where: mockWhere
    });

    // Default: Run returns empty rows
    mocks.db.run.mockResolvedValue({ rows: [] });

    // Default: findMany returns empty array
    mocks.db.query.entities.findMany.mockResolvedValue([]);
  });

  it("should use vector search if exact match fails", async () => {
    // Setup Transcript
    mocks.db.query.transcripts.findFirst.mockResolvedValue({
      episodeId: "ep1",
      content: "Hello",
      segments: [],
    });

    // Setup AI response
    mocks.generateObject.mockResolvedValue({
      object: {
        entities: [{ name: "Fuzzy Entity", type: "Person" }],
      },
    });

    // Type found
    mocks.db.query.entityTypes.findFirst.mockResolvedValue({ id: "type_person" });

    // Entity Exact Match: Not found in findMany
    mocks.db.query.entities.findMany.mockResolvedValue([]);

    // Mock Embedding
    mocks.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

    // Mock Vector Search (Fuzzy match)
    mocks.db.run.mockResolvedValue({
        rows: [{ id: "existing_vector_id", distance: 0.1 }]
    });

    await extractEntitiesHandler(createMockJob({ episodeId: "ep1" }));

    // Verify generateEmbedding called
    expect(mocks.generateEmbedding).toHaveBeenCalledWith("Fuzzy Entity");

    // Verify vector search called (db.run)
    expect(mocks.db.run).toHaveBeenCalled();

    // Verify insert count: only link inserted (episodesEntities)
    expect(mocks.db.insert).toHaveBeenCalledTimes(1);
  });

  it("should create new entity with embedding if no match found", async () => {
     // Setup Transcript
    mocks.db.query.transcripts.findFirst.mockResolvedValue({
      episodeId: "ep1",
      content: "Hello",
      segments: [],
    });

    mocks.generateObject.mockResolvedValue({
      object: { entities: [{ name: "New Entity", type: "Person" }] },
    });
    mocks.db.query.entityTypes.findFirst.mockResolvedValue({ id: "type_person" });

    // Entity Exact Match: Not found in findMany
    mocks.db.query.entities.findMany.mockResolvedValue([]);

    mocks.generateEmbedding.mockResolvedValue([0.9, 0.9]);

    // Vector search returns no results
    mocks.db.run.mockResolvedValue({ rows: [] });

    await extractEntitiesHandler(createMockJob({ episodeId: "ep1" }));

    // Expect insert entity + insert link = 2 inserts
    expect(mocks.db.insert).toHaveBeenCalledTimes(2);

    // Check that embedding was passed to insert values
    const firstInsertValues = mockValues.mock.calls[0][0];
    expect(firstInsertValues).toHaveProperty("embedding");
    expect(firstInsertValues.embedding).toEqual([0.9, 0.9]);
    expect(firstInsertValues.name).toBe("New Entity");
  });

  it("should reuse exact match found in pre-fetch", async () => {
    mocks.db.query.transcripts.findFirst.mockResolvedValue({
      episodeId: "ep1",
      content: "Hello",
      segments: [],
    });

    mocks.generateObject.mockResolvedValue({
      object: { entities: [{ name: "Existing Entity", type: "Person" }] },
    });
    mocks.db.query.entityTypes.findFirst.mockResolvedValue({ id: "type_person" });

    // Pre-fetch finds existing entity
    mocks.db.query.entities.findMany.mockResolvedValue([{ id: "exact_id", name: "Existing Entity" }]);

    await extractEntitiesHandler(createMockJob({ episodeId: "ep1" }));

    // Should NOT generate embedding
    expect(mocks.generateEmbedding).not.toHaveBeenCalled();

    // Should NOT vector search
    expect(mocks.db.run).not.toHaveBeenCalled();

    // Should insert Link only (1 insert)
    expect(mocks.db.insert).toHaveBeenCalledTimes(1);
  });
});
