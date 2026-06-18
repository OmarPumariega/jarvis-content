import { z } from 'zod';

export const ElevenLabsVoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).default(0.5),
  similarity_boost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  use_speaker_boost: z.boolean().default(true),
});

export const ElevenLabsTTSRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  model_id: z
    .enum(['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_monolingual_v1'])
    .default('eleven_multilingual_v2'),
  voice_settings: ElevenLabsVoiceSettingsSchema.optional(),
  output_format: z
    .enum(['mp3_44100_128', 'mp3_44100_192', 'pcm_16000', 'pcm_44100'])
    .default('mp3_44100_128'),
});

export const ElevenLabsCacheMetaSchema = z.object({
  voiceId: z.string(),
  text: z.string(),
  cacheKey: z.string(),
  cachedAt: z.string().datetime(),
  filePath: z.string(),
});

export type ElevenLabsVoiceSettings = z.infer<typeof ElevenLabsVoiceSettingsSchema>;
export type ElevenLabsTTSRequest = z.infer<typeof ElevenLabsTTSRequestSchema>;
export type ElevenLabsCacheMeta = z.infer<typeof ElevenLabsCacheMetaSchema>;
