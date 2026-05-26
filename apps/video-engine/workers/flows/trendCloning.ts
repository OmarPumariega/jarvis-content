import { createHash } from 'crypto';
import type { Logger } from 'pino';
import {
  HeyGenCreateVideoResponseSchema,
  HeyGenVideoStatusResponseSchema,
  ElevenLabsTTSRequestSchema,
} from '@jarvis/types';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { renderComposition } from '../../remotion/render';
import type { VideoJobData } from '../types';

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 72;
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

async function generateHeyGenVideo(
  avatarId: string,
  voiceId: string,
  script: string,
  logger: Logger,
): Promise<string> {
  const apiKey = process.env['HEYGEN_API_KEY'];
  if (!apiKey) throw new Error('HEYGEN_API_KEY is not set');

  logger.info({ step: 'HEYGEN_CREATE' }, 'Creating HeyGen avatar video');

  const createRes = await withRetry(() =>
    fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
            voice: { type: 'text', input_text: script, voice_id: voiceId },
            background: { type: 'color', value: '#000000' },
          },
        ],
        dimension: { width: 1080, height: 1920 },
        test: false,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HeyGen create failed: ${res.status} ${await res.text()}`);
      return res.json();
    }),
  );

  const { data: createData } = HeyGenCreateVideoResponseSchema.parse(createRes);
  const videoId = createData.video_id;
  logger.info({ videoId, step: 'HEYGEN_POLL' }, 'Polling HeyGen video status');

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const pollRes = await withRetry(() =>
      fetch(`${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': apiKey },
      }).then(async (res) => {
        if (!res.ok) throw new Error(`HeyGen poll failed: ${res.status} ${await res.text()}`);
        return res.json();
      }),
    );

    const { data } = HeyGenVideoStatusResponseSchema.parse(pollRes);

    if (data.status === 'completed') {
      if (!data.video_url) throw new Error('HeyGen completed but video_url is missing');
      logger.info({ videoId, step: 'HEYGEN_DONE' }, 'HeyGen video ready');
      return data.video_url;
    }

    if (data.status === 'failed') {
      throw new Error(`HeyGen failed: ${data.error?.detail ?? 'unknown'}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`HeyGen video ${videoId} timed out`);
}

async function synthesizeSpeech(voiceId: string, text: string, logger: Logger): Promise<string> {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const cacheKey = createHash('sha256').update(text + voiceId).digest('hex');
  const filePath = join(AUDIO_CACHE_DIR, `${cacheKey}.mp3`);

  if (existsSync(filePath)) {
    logger.info({ cacheKey, step: 'ELEVENLABS_CACHE_HIT' }, 'ElevenLabs cache hit');
    return filePath;
  }

  const request = ElevenLabsTTSRequestSchema.parse({ text, model_id: 'eleven_multilingual_v2' });

  const audio = await withRetry(async () => {
    const res = await fetch(
      `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}?output_format=${request.output_format}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({ text: request.text, model_id: request.model_id, voice_settings: request.voice_settings }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  });

  await mkdir(AUDIO_CACHE_DIR, { recursive: true });
  await writeFile(filePath, audio);
  logger.info({ cacheKey, step: 'ELEVENLABS_SYNTHESIZED' }, 'ElevenLabs audio synthesized and cached');

  return filePath;
}

export async function handleTrendCloning(data: VideoJobData, logger: Logger): Promise<string> {
  let avatarVideoUrl: string;

  if (data.inputUrl) {
    // Pre-rendered avatar URL (e.g. forwarded from an external pipeline)
    avatarVideoUrl = data.inputUrl;
  } else {
    if (!data.heygenAvatarId || !data.heygenVoiceId || !data.script) {
      throw new Error(
        'TREND_CLONING requires either inputUrl or (heygenAvatarId + heygenVoiceId + script)',
      );
    }
    avatarVideoUrl = await generateHeyGenVideo(
      data.heygenAvatarId,
      data.heygenVoiceId,
      data.script,
      logger,
    );
  }

  // Optional: synthesize narration with ElevenLabs cloned voice
  if (data.elevenlabsVoiceId && data.narrationText) {
    await synthesizeSpeech(data.elevenlabsVoiceId, data.narrationText, logger);
  }

  const fps = 30;
  const durationInFrames = 60 * fps;

  logger.info({ step: 'RENDERING' }, 'Rendering with Corporate template');
  return renderComposition(
    'Corporate',
    { videoSrc: avatarVideoUrl, title: 'Trend', primaryColor: '#1A73E8', fps },
    data.correlationId,
    durationInFrames,
  );
}
