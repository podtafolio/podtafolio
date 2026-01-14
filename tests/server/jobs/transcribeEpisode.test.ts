import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeEpisodeHandler } from "../../../server/jobs/transcribeEpisode";
import { db } from "../../../server/utils/db";
import * as groq from "../../../server/utils/groq";
import * as storage from "../../../server/utils/storage";
import * as queue from "../../../server/utils/queue";
import { Readable } from "node:stream";

// 1. Hoist the mocks variables
const mocks = vi.hoisted(() => {
  return {
    fs: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      createWriteStream: vi.fn(),
      statSync: vi.fn(),
      readFileSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
    path: {
      join: vi.fn((...args) => args.join("/")),
    },
  };
});

// 2. Mock modules
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    default: {
      ...actual,
      ...mocks.fs,
    },
    ...mocks.fs,
  };
});

vi.mock("node:path", async () => {
  const actual = await vi.importActual<typeof import("node:path")>("node:path");
  return {
    ...actual,
    default: {
      ...actual,
      ...mocks.path,
    },
    ...mocks.path,
  };
});

// Mock DB
vi.mock("../../../server/utils/db", () => {
  const deleteMock = { where: vi.fn().mockResolvedValue(undefined) };
  const insertMock = { values: vi.fn().mockResolvedValue(undefined) };
  return {
    db: {
      query: {
        episodes: {
          findFirst: vi.fn(),
        },
        transcripts: {
          findFirst: vi.fn(),
        },
      },
      delete: vi.fn(() => deleteMock),
      insert: vi.fn(() => insertMock),
    },
  };
});

// Mock Groq
vi.mock("../../../server/utils/groq", () => ({
  transcribeAudio: vi.fn(),
}));

// Mock Storage
vi.mock("../../../server/utils/storage", () => ({
  uploadFileToStorage: vi.fn(),
  deleteFileFromStorage: vi.fn(),
}));

// Mock Queue
vi.mock("../../../server/utils/queue", () => ({
  enqueueJob: vi.fn(),
}));

// Stub Global Fetch
const fetchStub = vi.fn();
vi.stubGlobal("fetch", fetchStub);

// Helper to create a Web ReadableStream
function createWebStream(content: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

describe("transcribeEpisodeHandler", () => {
  const mockEpisode = {
    id: "ep_1",
    audioUrl: "https://example.com/audio.mp3",
  };

  const mockWriteStream = {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.episodes.findFirst as any).mockResolvedValue(mockEpisode);

    // Default FS mocks
    mocks.fs.existsSync.mockReturnValue(true);
    mocks.fs.createWriteStream.mockReturnValue(mockWriteStream);
    mocks.fs.readFileSync.mockReturnValue(Buffer.from("audio content"));
    mocks.fs.statSync.mockReturnValue({ size: 1000 }); // Default small size
  });

  it("should skip if transcript exists with same hash", async () => {
    // 1. Mock Fetch to return Web Stream
    const mockResponse = {
      ok: true,
      body: createWebStream("audio content"),
      headers: { get: () => "audio/mpeg" },
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB to return existing transcript
    const crypto = await import("node:crypto");
    const expectedHash = crypto
      .createHash("sha256")
      .update("audio content")
      .digest("hex");

    (db.query.transcripts.findFirst as any).mockImplementation(({ where }) => {
      return Promise.resolve({ id: "tr_1", audioHash: expectedHash });
    });

    // 3. Run
    await transcribeEpisodeHandler({ episodeId: "ep_1" });

    // 4. Assert
    expect(groq.transcribeAudio).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(mocks.fs.unlinkSync).toHaveBeenCalled();
  });

  it("should transcribe directly if file is small", async () => {
    // 1. Mock Fetch (Small file)
    const mockResponse = {
      ok: true,
      body: createWebStream("small audio"),
      headers: { get: () => "audio/mpeg" },
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB (No existing transcript)
    (db.query.transcripts.findFirst as any).mockResolvedValue(null);

    // 3. Mock FS stat to return small size
    mocks.fs.statSync.mockReturnValue({ size: 1024 });
    mocks.fs.readFileSync.mockReturnValue(Buffer.from("small audio"));

    // 4. Mock Groq
    (groq.transcribeAudio as any).mockResolvedValue({
      text: "Transcribed text",
      language: "en",
      segments: [],
    });

    // 5. Run
    await transcribeEpisodeHandler({ episodeId: "ep_1" });

    // 6. Assert
    expect(groq.transcribeAudio).toHaveBeenCalledWith(
      expect.any(Buffer),
      "audio.mp3",
    );
    expect(storage.uploadFileToStorage).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(queue.enqueueJob).toHaveBeenCalledWith("extract_topics", {
      episodeId: "ep_1",
    });
    expect(mocks.fs.unlinkSync).toHaveBeenCalled();
  });

  it("should upload to R2 if file is large", async () => {
    // 1. Mock Fetch (Large file)
    const mockResponse = {
      ok: true,
      body: createWebStream("large audio"),
      headers: { get: () => "audio/mpeg" },
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB (No existing transcript)
    (db.query.transcripts.findFirst as any).mockResolvedValue(null);

    // 3. Mock FS stat to return large size
    const largeSize = 26 * 1024 * 1024; // 26MB
    mocks.fs.statSync.mockReturnValue({ size: largeSize });
    mocks.fs.readFileSync.mockReturnValue(Buffer.from("large audio"));

    // 4. Mock Storage
    (storage.uploadFileToStorage as any).mockResolvedValue(
      "https://r2.example.com/file.mp3",
    );

    // 5. Mock Groq
    (groq.transcribeAudio as any).mockResolvedValue({
      text: "Transcribed text",
      language: "en",
      segments: [],
    });

    // 6. Run
    await transcribeEpisodeHandler({ episodeId: "ep_1" });

    // 7. Assert
    expect(storage.uploadFileToStorage).toHaveBeenCalled();
    expect(groq.transcribeAudio).toHaveBeenCalledWith(
      "https://r2.example.com/file.mp3",
    );
    expect(storage.deleteFileFromStorage).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
    expect(mocks.fs.unlinkSync).toHaveBeenCalled();
  });
});
