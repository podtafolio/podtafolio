import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { transcribeAudio } from "../../../server/utils/groq";

const mocks = vi.hoisted(() => {
  return {
    fetch: vi.fn(),
  };
});

vi.stubGlobal("fetch", mocks.fetch);

describe("groq utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GROQ_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should transcribe successfully", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ text: "Hello world", language: "en", segments: [] }),
    };
    mocks.fetch.mockResolvedValue(mockResponse);

    const buffer = Buffer.from("test audio");
    const result = await transcribeAudio(buffer, "test.mp3");

    expect(result).toEqual({
      text: "Hello world",
      language: "en",
      segments: [],
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
        },
      }),
    );
  });

  it("should throw error if API key is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const buffer = Buffer.from("test");
    await expect(transcribeAudio(buffer, "test.mp3")).rejects.toThrow(
      "GROQ_API_KEY environment variable is not set",
    );
  });

  it("should throw error if API returns error", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid file",
    };
    mocks.fetch.mockResolvedValue(mockResponse);

    const buffer = Buffer.from("test");
    await expect(transcribeAudio(buffer, "test.mp3")).rejects.toThrow(
      "Groq API failed: 400 Bad Request - Invalid file",
    );
  });
});
