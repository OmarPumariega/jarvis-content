import type { Logger } from 'pino';
import { downloadVideo } from '../../scripts/ytdlp';
import { reframeTo916, getVideoDuration } from '../../scripts/ffmpeg';
import { renderComposition } from '../../remotion/render';
import type { VideoJobData } from '../types';

export async function handleRepurposing(
  data: VideoJobData,
  logger: Logger,
): Promise<string> {
  if (!data.inputUrl) {
    throw new Error('REPURPOSING flow requires inputUrl');
  }

  logger.info({ correlationId: data.correlationId, step: 'DOWNLOADING' }, 'Downloading video');
  const { videoPath, title, durationSeconds } = await downloadVideo(data.inputUrl, data.correlationId);

  logger.info({ correlationId: data.correlationId, step: 'REFRAMING' }, 'Reframing to 9:16');
  const reframedPath = await reframeTo916(videoPath, data.correlationId);

  const fps = 30;
  const durationInFrames = Math.min(durationSeconds * fps, 60 * fps); // cap at 60s

  logger.info({ correlationId: data.correlationId, step: 'RENDERING' }, 'Rendering with UltraDynamic template');
  const outputPath = await renderComposition(
    'UltraDynamic',
    {
      videoSrc: reframedPath,
      title,
      captions: [],
      accentColor: '#FF3D00',
      fps,
    },
    data.correlationId,
    durationInFrames,
  );

  return outputPath;
}
