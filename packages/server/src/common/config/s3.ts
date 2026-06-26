import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.S3_REGION || 'US',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  // Optional browser-reachable base URL for objects (e.g. a published MinIO
  // port). When set, public-read objects are served via a plain
  // `${publicUrl}/${bucket}/${key}` URL instead of a presigned URL whose host
  // (the internal storage endpoint) the browser cannot reach. Leave unset for
  // AWS S3 deployments to keep the presigned-URL behavior unchanged.
  publicUrl: process.env.S3_PUBLIC_URL,
}));
