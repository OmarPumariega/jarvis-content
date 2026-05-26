import { z } from 'zod';

export const UltraDynamicPropsSchema = z.object({
  videoSrc: z.string(),
  title: z.string(),
  captions: z.array(
    z.object({
      text: z.string(),
      startFrame: z.number().int().nonnegative(),
      endFrame: z.number().int().positive(),
    }),
  ),
  accentColor: z.string().default('#FF3D00'),
  fps: z.number().int().positive().default(30),
});

export const CorporatePropsSchema = z.object({
  videoSrc: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  logoSrc: z.string().optional(),
  primaryColor: z.string().default('#1A73E8'),
  fps: z.number().int().positive().default(30),
});

export const HybridTutorialPropsSchema = z.object({
  screenSrc: z.string(),
  faceSrc: z.string(),
  title: z.string(),
  steps: z.array(
    z.object({
      label: z.string(),
      startFrame: z.number().int().nonnegative(),
    }),
  ),
  fps: z.number().int().positive().default(30),
});

export type UltraDynamicProps = z.infer<typeof UltraDynamicPropsSchema>;
export type CorporateProps = z.infer<typeof CorporatePropsSchema>;
export type HybridTutorialProps = z.infer<typeof HybridTutorialPropsSchema>;
