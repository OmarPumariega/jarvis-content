import { z } from 'zod';

export const HeyGenVideoStatusSchema = z.enum([
  'pending',
  'processing',
  'waiting',
  'completed',
  'failed',
]);

export const HeyGenAvatarVideoInputSchema = z.object({
  avatar_id: z.string(),
  voice_id: z.string(),
  script: z.string().max(1500),
  background: z
    .object({
      type: z.enum(['color', 'image', 'transparent']),
      value: z.string().optional(),
    })
    .optional(),
  dimension: z
    .object({ width: z.number(), height: z.number() })
    .optional()
    .default({ width: 1080, height: 1920 }),
});

export const HeyGenCreateVideoResponseSchema = z.object({
  data: z.object({ video_id: z.string() }),
  error: z.string().nullable().optional(),
});

export const HeyGenVideoStatusResponseSchema = z.object({
  data: z.object({
    video_id: z.string(),
    status: HeyGenVideoStatusSchema,
    video_url: z.string().url().optional(),
    video_url_caption: z.string().url().optional(),
    error: z
      .object({ code: z.string(), detail: z.string() })
      .nullable()
      .optional(),
    duration: z.number().optional(),
  }),
  error: z.string().nullable().optional(),
});

export type HeyGenVideoStatus = z.infer<typeof HeyGenVideoStatusSchema>;
export type HeyGenAvatarVideoInput = z.infer<typeof HeyGenAvatarVideoInputSchema>;
export type HeyGenCreateVideoResponse = z.infer<typeof HeyGenCreateVideoResponseSchema>;
export type HeyGenVideoStatusResponse = z.infer<typeof HeyGenVideoStatusResponseSchema>;
