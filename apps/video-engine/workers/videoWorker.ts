import { Worker, type Job } from 'bullmq';
import crypto from 'crypto';
import { db, videos } from '@jarvis/database';
import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { VideoJobData } from './types';
import { VIDEO_QUEUE_NAME } from './queue';
import { uploadFile } from './storage';
import { handleRepurposing } from './flows/repurposing';
import { handleTrendCloning } from './flows/trendCloning';
import { handleQuickMode } from './flows/quickMode';

async function sendWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify(payload);
  const secret = process.env['WEBHOOK_HMAC_SECRET'] ?? '';
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jarvis-signature': `sha256=${sig}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}`);
  }
}

async function setStatus(
  videoId: string,
  status: typeof videos.$inferSelect.status,
  extra: Partial<Pick<typeof videos.$inferSelect, 'outputUrl' | 'errorMessage'>> = {},
): Promise<void> {
  await db
    .update(videos)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(videos.id, videoId));
}

export function createVideoWorker(logger: Logger): Worker<VideoJobData> {
  const worker = new Worker<VideoJobData>(
    VIDEO_QUEUE_NAME,
    async (job: Job<VideoJobData>) => {
      const { videoId, correlationId, flow, webhookUrl } = job.data;
      const log = logger.child({ videoId, correlationId, flow, jobId: job.id });

      log.info('Job started');

      try {
        await setStatus(videoId, 'DOWNLOADING');

        let outputPath: string;

        switch (flow) {
          case 'REPURPOSING':
            outputPath = await handleRepurposing(job.data, log);
            break;
          case 'TREND_CLONING':
            outputPath = await handleTrendCloning(job.data, log);
            break;
          case 'QUICK_MODE':
            outputPath = await handleQuickMode(job.data, log);
            break;
          default: {
            const _exhaustive: never = flow;
            throw new Error(`Unknown flow: ${String(_exhaustive)}`);
          }
        }

        log.info({ step: 'UPLOADING' }, 'Uploading to storage');
        await setStatus(videoId, 'UPLOADING');
        const outputUrl = await uploadFile(outputPath, correlationId);

        await setStatus(videoId, 'COMPLETED', { outputUrl });

        await sendWebhook(webhookUrl, { videoId, correlationId, status: 'COMPLETED', outputUrl });

        log.info('Job completed');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err }, 'Job failed');

        await setStatus(videoId, 'FAILED', { errorMessage: message }).catch(() => void 0);
        await sendWebhook(webhookUrl, { videoId, correlationId, status: 'FAILED', errorMessage: message }).catch(
          () => void 0,
        );

        throw err;
      }
    },
    {
      connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
      concurrency: 2,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Worker reported job failure');
  });

  return worker;
}
