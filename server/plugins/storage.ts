import s3Driver from "unstorage/drivers/s3";

export default defineNitroPlugin((nitroApp) => {
  const storage = useStorage();

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;

  if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
    console.log("[Nitro Plugin] Configuring 'files' storage with R2 credentials...");

    storage.mount(
      "files",
      s3Driver({
        driver: "s3",
        accountId: r2AccountId,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        bucket: r2BucketName,
        region: "auto",
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      })
    );
  } else {
    if (process.env.NODE_ENV === 'production') {
        console.warn("[Nitro Plugin] R2 environment variables missing. 'files' storage not mounted to S3.");
    }
  }
});
