import { z } from 'zod';
import {
  OpusClipClip,
  OpusClipCreateJobRequestSchema,
  OpusClipCreateJobResponseSchema,
  OpusClipJobStatusResponseSchema,
} from '@jarvis/types';

type OpusClipCreateJobInput = z.input<typeof OpusClipCreateJobRequestSchema>;

const OPUSCLIP_BASE_URL = 'https://api.opus.pro';
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60; // 10 minutes

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw new Error('Unreachable');
}

function getApiKey(): string {
  const key = process.env['OPUSCLIP_API_KEY'];
  if (!key) throw new Error('OPUSCLIP_API_KEY is not set');
  return key;
}

export async function createClipJob(request: OpusClipCreateJobInput): Promise<string> {
  const parsed = OpusClipCreateJobRequestSchema.parse(request);

  const response = await withRetry(() =>
    fetch(`${OPUSCLIP_BASE_URL}/api/videos/create-clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(parsed),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`OpusClip createJob failed: ${res.status} ${await res.text()}`);
      return res.json();
    }),
  );

  const { job_id } = OpusClipCreateJobResponseSchema.parse(response);
  return job_id;
}

export async function pollClipJobUntilDone(jobId: string): Promise<OpusClipClip[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await withRetry(() =>
      fetch(`${OPUSCLIP_BASE_URL}/api/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${getApiKey()}` },
      }).then(async (res) => {
        if (!res.ok) throw new Error(`OpusClip poll failed: ${res.status} ${await res.text()}`);
        return res.json();
      }),
    );

    const result = OpusClipJobStatusResponseSchema.parse(response);

    if (result.status === 'completed') {
      return result.clips ?? [];
    }

    if (result.status === 'failed') {
      throw new Error(`OpusClip job ${jobId} failed: ${result.error_message ?? 'unknown error'}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`OpusClip job ${jobId} did not complete within the polling window`);
}

export async function detectViralClips(
  videoUrl: string,
  numClips = 3,
): Promise<OpusClipClip[]> {
  const jobId = await createClipJob({ url: videoUrl, num_clips: numClips });
  return pollClipJobUntilDone(jobId);
}
