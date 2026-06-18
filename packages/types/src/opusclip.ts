import { z } from 'zod';

export const OpusClipJobStatusSchema = z.enum([
  'pending',
  'in_queue',
  'processing',
  'completed',
  'failed',
]);

export const OpusClipCreateJobRequestSchema = z.object({
  url: z.string().url(),
  language: z.string().default('en'),
  num_clips: z.number().int().min(1).max(10).default(3),
});

export const OpusClipClipSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number().min(0).max(100),
  start_time: z.number(),
  end_time: z.number(),
  stream_url: z.string().url(),
  download_url: z.string().url().optional(),
  transcript: z.string().optional(),
});

export const OpusClipCreateJobResponseSchema = z.object({
  job_id: z.string(),
  status: OpusClipJobStatusSchema,
});

export const OpusClipJobStatusResponseSchema = z.object({
  job_id: z.string(),
  status: OpusClipJobStatusSchema,
  clips: z.array(OpusClipClipSchema).optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export type OpusClipJobStatus = z.infer<typeof OpusClipJobStatusSchema>;
export type OpusClipCreateJobRequest = z.infer<typeof OpusClipCreateJobRequestSchema>;
export type OpusClipClip = z.infer<typeof OpusClipClipSchema>;
export type OpusClipCreateJobResponse = z.infer<typeof OpusClipCreateJobResponseSchema>;
export type OpusClipJobStatusResponse = z.infer<typeof OpusClipJobStatusResponseSchema>;
