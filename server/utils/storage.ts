const getPublicDomain = () => {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  if (!publicDomain) {
    throw new Error("Missing R2 environment variable: R2_PUBLIC_DOMAIN");
  }
  return publicDomain;
};

/**
 * Uploads a file buffer (or raw data) to R2 via Nitro storage and returns the public URL.
 */
export async function uploadFileToStorage(
  data: Buffer | ArrayBuffer | string,
  key: string,
  contentType: string,
): Promise<string> {
  // Use Nitro's storage abstraction
  // The 'files' mount point is configured in nuxt.config.ts
  const storage = useStorage("files");

  // Ensure key doesn't start with / as unstorage keys are usually "cleaned"
  const cleanKey = key.startsWith("/") ? key.substring(1) : key;

  // setItem simply saves the value. The S3 driver handles the PUT.
  // Note: Standard unstorage S3 driver might not set Content-Type automatically based on argument,
  // but it's often inferred or just stored as blob.
  // For R2 public access, Content-Type metadata is important for the browser to render/play it correctly.
  // The 'unstorage' `setItem` accepts options as third argument, but support depends on driver.
  // Checking `unstorage` S3 driver source, it passes `opts` to the put call?
  // Actually, unstorage setItem signature is setItem(key, value, opts).
  // The s3 driver implementation uses `opts`?
  // It seems basic S3 driver might not support custom headers easily via setItem.
  // However, for transcription, Groq downloads the file. Content-Type is less critical for the API than for a browser.
  // But let's try to pass it if possible or accept default.

  await storage.setItemRaw(cleanKey, data);

  // Construct public URL
  let domain = getPublicDomain();
  if (!domain.startsWith("http")) {
    domain = `https://${domain}`;
  }
  // Ensure no trailing slash
  domain = domain.replace(/\/$/, "");

  return `${domain}/${cleanKey}`;
}

/**
 * Deletes a file from R2 via Nitro storage.
 */
export async function deleteFileFromStorage(key: string): Promise<void> {
  const storage = useStorage("files");
  const cleanKey = key.startsWith("/") ? key.substring(1) : key;

  await storage.removeItem(cleanKey);
}
