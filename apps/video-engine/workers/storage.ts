import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

function buildS3Client(): S3Client {
  if (process.env['MINIO_ENDPOINT']) {
    return new S3Client({
      endpoint: process.env['MINIO_ENDPOINT'],
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env['MINIO_ACCESS_KEY'] ?? '',
        secretAccessKey: process.env['MINIO_SECRET_KEY'] ?? '',
      },
      forcePathStyle: true,
    });
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
    },
  });
}

const s3 = buildS3Client();
const BUCKET = process.env['MINIO_BUCKET'] ?? process.env['R2_BUCKET_NAME'] ?? 'jarvis-content';

export async function uploadFile(filePath: string, correlationId: string): Promise<string> {
  const ext = path.extname(filePath);
  const key = `outputs/${correlationId}${ext}`;
  const body = await fs.readFile(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'video/mp4',
    }),
  );

  if (process.env['MINIO_ENDPOINT']) {
    return `${process.env['MINIO_ENDPOINT']}/${BUCKET}/${key}`;
  }

  return `https://pub-${process.env['R2_ACCOUNT_ID']}.r2.dev/${key}`;
}
