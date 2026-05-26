import {
  HeyGenAvatarVideoInput,
  HeyGenAvatarVideoInputSchema,
  HeyGenCreateVideoResponseSchema,
  HeyGenVideoStatusResponseSchema,
} from '@jarvis/types';

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 72; // 6 minutes

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
  const key = process.env['HEYGEN_API_KEY'];
  if (!key) throw new Error('HEYGEN_API_KEY is not set');
  return key;
}

export async function createAvatarVideo(input: HeyGenAvatarVideoInput): Promise<string> {
  const parsed = HeyGenAvatarVideoInputSchema.parse(input);

  const response = await withRetry(() =>
    fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': getApiKey(),
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: parsed.avatar_id,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: parsed.script,
              voice_id: parsed.voice_id,
            },
            background: parsed.background ?? { type: 'color', value: '#000000' },
          },
        ],
        dimension: parsed.dimension,
        test: false,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HeyGen createVideo failed: ${res.status} ${await res.text()}`);
      return res.json();
    }),
  );

  const { data } = HeyGenCreateVideoResponseSchema.parse(response);
  return data.video_id;
}

export async function pollVideoUntilDone(videoId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await withRetry(() =>
      fetch(`${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': getApiKey() },
      }).then(async (res) => {
        if (!res.ok) throw new Error(`HeyGen poll failed: ${res.status} ${await res.text()}`);
        return res.json();
      }),
    );

    const { data } = HeyGenVideoStatusResponseSchema.parse(response);

    if (data.status === 'completed') {
      if (!data.video_url) throw new Error('HeyGen completed but video_url is missing');
      return data.video_url;
    }

    if (data.status === 'failed') {
      const detail = data.error?.detail ?? 'unknown error';
      throw new Error(`HeyGen video generation failed: ${detail}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`HeyGen video ${videoId} did not complete within the polling window`);
}

export async function generateAvatarVideo(input: HeyGenAvatarVideoInput): Promise<string> {
  const videoId = await createAvatarVideo(input);
  return pollVideoUntilDone(videoId);
}
