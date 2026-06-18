import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ElevenLabsTTSRequest, ElevenLabsTTSRequestSchema } from '@jarvis/types';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';
const AUDIO_CACHE_DIR = '/tmp/elevenlabs-cache';

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
  const key = process.env['ELEVENLABS_API_KEY'];
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  return key;
}

function buildCacheKey(text: string, voiceId: string): string {
  return `audio:${createHash('sha256').update(text + voiceId).digest('hex')}`;
}

async function fetchFromElevenLabs(voiceId: string, request: ElevenLabsTTSRequest): Promise<Buffer> {
  return withRetry(async () => {
    const res = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}?output_format=${request.output_format ?? 'mp3_44100_128'}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': getApiKey(),
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model_id ?? 'eleven_multilingual_v2',
          voice_settings: request.voice_settings,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
    }

    return Buffer.from(await res.arrayBuffer());
  });
}

export interface SynthesisResult {
  filePath: string;
  cacheKey: string;
  fromCache: boolean;
}

// redis is optional — pass an ioredis client when available for distributed cache
export async function synthesizeSpeech(
  voiceId: string,
  request: ElevenLabsTTSRequest,
  redis?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<unknown> },
): Promise<SynthesisResult> {
  const parsed = ElevenLabsTTSRequestSchema.parse(request);
  const cacheKey = buildCacheKey(parsed.text, voiceId);
  const ext = parsed.output_format?.startsWith('pcm') ? 'pcm' : 'mp3';
  const fileName = `${cacheKey.replace('audio:', '')}.${ext}`;

  await mkdir(AUDIO_CACHE_DIR, { recursive: true });
  const filePath = join(AUDIO_CACHE_DIR, fileName);

  // 1. Redis cache check
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && existsSync(filePath)) {
      return { filePath, cacheKey, fromCache: true };
    }
  }

  // 2. Filesystem cache check
  if (existsSync(filePath)) {
    if (redis) {
      await redis.set(cacheKey, filePath);
    }
    return { filePath, cacheKey, fromCache: true };
  }

  // 3. Fetch from API
  const audio = await fetchFromElevenLabs(voiceId, parsed);
  await writeFile(filePath, audio);

  if (redis) {
    await redis.set(cacheKey, filePath);
  }

  return { filePath, cacheKey, fromCache: false };
}
