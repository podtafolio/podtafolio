import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeEpisodeHandler } from '../../../server/jobs/transcribeEpisode';
import { db } from '../../../server/utils/db';
import * as groq from '../../../server/utils/groq';
import * as storage from '../../../server/utils/storage';

// Mock DB
vi.mock('../../../server/utils/db', () => {
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
vi.mock('../../../server/utils/groq', () => ({
  transcribeAudio: vi.fn(),
}));

// Mock Storage
vi.mock('../../../server/utils/storage', () => ({
  uploadFileToStorage: vi.fn(),
  deleteFileFromStorage: vi.fn(),
}));

// Stub Global Fetch
const fetchStub = vi.fn();
vi.stubGlobal('fetch', fetchStub);

describe('transcribeEpisodeHandler', () => {
  const mockEpisode = {
    id: 'ep_1',
    audioUrl: 'https://example.com/audio.mp3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.episodes.findFirst as any).mockResolvedValue(mockEpisode);
  });

  it('should skip if transcript exists with same hash', async () => {
    // 1. Mock Fetch to return some content
    const audioContent = Buffer.from('audio content');
    const mockResponse = {
      ok: true,
      arrayBuffer: async () => audioContent.buffer,
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB to return existing transcript
    // Hash of 'audio content' using sha256
    // We can rely on the implementation logic or pre-calculate.
    // Let's just assume the implementation calculates a hash and queries DB.
    // If we return a result for that query, it should skip.
    (db.query.transcripts.findFirst as any).mockResolvedValue({ id: 'tr_1', audioHash: 'somehash' });

    // 3. Run
    await transcribeEpisodeHandler({ episodeId: 'ep_1' });

    // 4. Assert
    expect(groq.transcribeAudio).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('should transcribe directly if file is small', async () => {
    // 1. Mock Fetch (Small file)
    const audioContent = Buffer.alloc(1024); // 1KB
    const mockResponse = {
      ok: true,
      arrayBuffer: async () => audioContent.buffer,
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB (No existing transcript)
    (db.query.transcripts.findFirst as any).mockResolvedValue(null);

    // 3. Mock Groq
    (groq.transcribeAudio as any).mockResolvedValue({
      text: 'Transcribed text',
      language: 'en',
      segments: [],
    });

    // 4. Run
    await transcribeEpisodeHandler({ episodeId: 'ep_1' });

    // 5. Assert
    expect(groq.transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'audio.mp3');
    expect(storage.uploadFileToStorage).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(expect.anything()); // transcripts table
    expect(db.insert).toHaveBeenCalledTimes(1);

    // Check arguments of insert
    const insertCall = (db.insert as any).mock.results[0].value.values;
    expect(insertCall).toHaveBeenCalledWith(expect.objectContaining({
        content: 'Transcribed text',
        audioHash: expect.any(String)
    }));
  });

  it('should upload to R2 if file is large', async () => {
    // 1. Mock Fetch (Large file > 25MB)
    const largeSize = 26 * 1024 * 1024; // 26MB
    // Creating a real buffer of 26MB might be slow/memory intensive for tests.
    // We can mock Buffer.byteLength or just use a small buffer but mock the property check?
    // But `Buffer.from(arrayBuffer)` creates a real buffer.

    // Better strategy: The code checks `audioBuffer.byteLength`.
    // We can simulate a large buffer without allocating 26MB by mocking the buffer?
    // No, `Buffer.from` returns a Uint8Array/Buffer.

    // Let's create a fake object that looks like a buffer but has a large byteLength
    // The code uses `audioBuffer.byteLength` and passes it to `uploadFileToStorage` or `transcribeAudio`.
    // `crypto.update(audioBuffer)` also uses it.

    // Actually, allocating 26MB is not THAT big for a test runner (Node has ample heap).
    // Let's try allocating it.

    const largeBuffer = Buffer.alloc(largeSize);
    const mockResponse = {
      ok: true,
      arrayBuffer: async () => largeBuffer.buffer,
      headers: { get: () => 'audio/mpeg' }
    };
    fetchStub.mockResolvedValue(mockResponse);

    // 2. Mock DB (No existing transcript)
    (db.query.transcripts.findFirst as any).mockResolvedValue(null);

    // 3. Mock Storage
    (storage.uploadFileToStorage as any).mockResolvedValue('https://r2.example.com/file.mp3');

    // 4. Mock Groq
    (groq.transcribeAudio as any).mockResolvedValue({
      text: 'Transcribed text',
      language: 'en',
      segments: [],
    });

    // 5. Run
    await transcribeEpisodeHandler({ episodeId: 'ep_1' });

    // 6. Assert
    expect(storage.uploadFileToStorage).toHaveBeenCalled();
    expect(groq.transcribeAudio).toHaveBeenCalledWith('https://r2.example.com/file.mp3');
    expect(storage.deleteFileFromStorage).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  }, 10000); // Increase timeout for large buffer allocation
});
