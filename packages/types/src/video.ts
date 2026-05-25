import { z } from 'zod';

export const VideoStatusSchema = z.enum([
  'QUEUED',
  'DOWNLOADING',
  'EXTRACTING_CLIPS',
  'GENERATING_AVATAR',
  'RENDERING',
  'UPLOADING',
  'COMPLETED',
  'FAILED',
]);

export const VideoFlowSchema = z.enum(['REPURPOSING', 'TREND_CLONING', 'QUICK_MODE']);

export const CreateVideoSchema = z.object({
  flow: VideoFlowSchema,
  inputUrl: z.string().url().optional(),
});

export const VideoStatusResponseSchema = z.object({
  id: z.string(),
  status: VideoStatusSchema,
  outputUrl: z.string().url().nullable(),
  errorMessage: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export type VideoStatus = z.infer<typeof VideoStatusSchema>;
export type VideoFlow = z.infer<typeof VideoFlowSchema>;
export type CreateVideoInput = z.infer<typeof CreateVideoSchema>;
export type VideoStatusResponse = z.infer<typeof VideoStatusResponseSchema>;
