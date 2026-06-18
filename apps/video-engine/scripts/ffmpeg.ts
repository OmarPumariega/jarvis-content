import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

const RENDERS_DIR = process.env['RENDERS_TMP_DIR'] ?? '/tmp/renders';

async function ensureRendersDir(): Promise<void> {
  await fs.mkdir(RENDERS_DIR, { recursive: true });
}

export interface CropOptions {
  startTime: number;
  endTime: number;
  outputPath?: string;
}

export interface ReframeOptions {
  /** Target aspect ratio — defaults to 9:16 */
  width?: number;
  height?: number;
  /** Optional face-track crop center as 0–1 relative coordinates */
  faceX?: number;
  faceY?: number;
}

export async function extractClip(
  inputPath: string,
  correlationId: string,
  index: number,
  opts: CropOptions,
): Promise<string> {
  await ensureRendersDir();

  const outputPath =
    opts.outputPath ?? path.join(RENDERS_DIR, `${correlationId}_clip${index}.mp4`);
  const duration = opts.endTime - opts.startTime;

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(opts.startTime)
      .setDuration(duration)
      .outputOptions(['-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  return outputPath;
}

export async function reframeTo916(
  inputPath: string,
  correlationId: string,
  opts: ReframeOptions = {},
): Promise<string> {
  await ensureRendersDir();

  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const outputPath = path.join(RENDERS_DIR, `${correlationId}_reframed.mp4`);

  // Dynamic crop: center on face if coordinates provided, otherwise center-crop
  const cropX = opts.faceX !== undefined
    ? `iw*${opts.faceX.toFixed(4)}-${Math.floor(width / 2)}`
    : `(iw-${width})/2`;
  const cropY = opts.faceY !== undefined
    ? `ih*${opts.faceY.toFixed(4)}-${Math.floor(height / 2)}`
    : `(ih-${height})/2`;

  const vf = [
    `crop=${width}:${height}:${cropX}:${cropY}`,
    `scale=${width}:${height}`,
  ].join(',');

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(vf)
      .outputOptions(['-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', '-crf', '22'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  return outputPath;
}

export async function mergeAudioVideo(
  videoPath: string,
  audioPath: string,
  correlationId: string,
): Promise<string> {
  await ensureRendersDir();

  const outputPath = path.join(RENDERS_DIR, `${correlationId}_merged.mp4`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-shortest', '-map', '0:v:0', '-map', '1:a:0'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  return outputPath;
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

export async function cleanOldRenders(maxAgeHours = 48): Promise<{ freedBytes: number }> {
  await ensureRendersDir();
  const files = await fs.readdir(RENDERS_DIR);
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  let freedBytes = 0;

  for (const file of files) {
    const filePath = path.join(RENDERS_DIR, file);
    const stat = await fs.stat(filePath);
    if (now - stat.mtimeMs > maxAgeMs) {
      freedBytes += stat.size;
      await fs.rm(filePath, { force: true });
    }
  }

  return { freedBytes };
}
