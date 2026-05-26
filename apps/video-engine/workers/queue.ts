import { Queue } from 'bullmq';
import type { VideoJobData } from './types';

export const VIDEO_QUEUE_NAME = 'video-processing';

export const videoQueue = new Queue<VideoJobData>(VIDEO_QUEUE_NAME, {
  connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
