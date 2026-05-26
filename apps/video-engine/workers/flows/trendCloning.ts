import type { Logger } from 'pino';
import { renderComposition } from '../../remotion/render';
import type { VideoJobData } from '../types';

/**
 * Trend Cloning flow: HeyGen avatar + ElevenLabs voice (both called externally via n8n).
 * By the time this worker runs, `inputUrl` points to the pre-rendered avatar video.
 */
export async function handleTrendCloning(
  data: VideoJobData,
  logger: Logger,
): Promise<string> {
  if (!data.inputUrl) {
    throw new Error('TREND_CLONING flow requires inputUrl (avatar video URL from HeyGen)');
  }

  const fps = 30;
  // Avatar videos from HeyGen are typically 30–60 s
  const durationInFrames = 60 * fps;

  logger.info({ correlationId: data.correlationId, step: 'RENDERING' }, 'Rendering with Corporate template');
  const outputPath = await renderComposition(
    'Corporate',
    {
      videoSrc: data.inputUrl,
      title: 'Trend',
      primaryColor: '#1A73E8',
      fps,
    },
    data.correlationId,
    durationInFrames,
  );

  return outputPath;
}
