import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub defineNitroPlugin globally BEFORE importing the plugin
vi.stubGlobal("defineNitroPlugin", (fn: any) => fn);

// Mock unstorage drivers
vi.mock("unstorage/drivers/s3", () => ({
  default: vi.fn((opts) => ({ ...opts, type: "s3-mock" })),
}));

// Mock useStorage
const mockStorage = {
  mount: vi.fn(),
};
vi.stubGlobal("useStorage", () => mockStorage);

describe("storage plugin", () => {
  const originalEnv = process.env;
  let storagePlugin: any;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    mockStorage.mount.mockClear();

    // Dynamically import the plugin
    // Using vi.importActual logic might be needed if we want to bypass cache,
    // but typically we just need the exported function.
    const mod = await import("../../../server/plugins/storage");
    storagePlugin = mod.default;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should mount s3 driver if R2 credentials are present", () => {
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.R2_BUCKET_NAME = "test-bucket";

    storagePlugin({} as any);

    expect(mockStorage.mount).toHaveBeenCalledWith(
      "files",
      expect.objectContaining({
        type: "s3-mock",
        driver: "s3",
        accountId: "test-account",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        bucket: "test-bucket",
        endpoint: "https://test-account.r2.cloudflarestorage.com",
      })
    );
  });

  it("should not mount s3 driver if R2 credentials are missing", () => {
    delete process.env.R2_ACCESS_KEY_ID;

    storagePlugin({} as any);

    expect(mockStorage.mount).not.toHaveBeenCalled();
  });
});
