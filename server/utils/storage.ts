import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const getR2Config = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicDomain) {
    throw new Error('Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN)');
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicDomain };
};

let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const config = getR2Config();
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return s3Client;
};

/**
 * Uploads a file buffer to R2 and returns the public URL.
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const config = getR2Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  // Construct public URL
  // Assuming R2_PUBLIC_DOMAIN is just the domain like "pub-xxxx.r2.dev"
  // We handle if it has https:// or not
  let domain = config.publicDomain;
  if (!domain.startsWith('http')) {
    domain = `https://${domain}`;
  }
  // Ensure no trailing slash
  domain = domain.replace(/\/$/, '');

  // Key might have / at start
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;

  return `${domain}/${cleanKey}`;
}

/**
 * Deletes a file from R2.
 */
export async function deleteFileFromStorage(key: string): Promise<void> {
  const config = getR2Config();
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
}
