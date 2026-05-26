import type { Logger } from 'pino';
import { renderComposition } from '../../remotion/render';
import type { VideoJobData } from '../types';

/**
 * Quick Mode flow: inputUrl points to a screen recording or raw footage
 * already uploaded by the user. We render it with the HybridTutorial template.
 */
export async function handleQuickMode(
  data: VideoJobData,
  logger: Logger,
): Promise<string> {
  if (!data.inputUrl) {
    throw new Error('QUICK_MODE flow requires inputUrl (screen or raw footage URL)');
  }

  const fps = 30;
  const durationInFrames = 60 * fps;

  logger.info({ correlationId: data.correlationId, step: 'RENDERING' }, 'Rendering with HybridTutorial template');
  const outputPath = await renderComposition(
    'HybridTutorial',
    {
      screenSrc: data.inputUrl,
      faceSrc: data.inputUrl,
      title: 'Quick Mode',
      steps: [],
      fps,
    },
    data.correlationId,
    durationInFrames,
  );

  return outputPath;
}
