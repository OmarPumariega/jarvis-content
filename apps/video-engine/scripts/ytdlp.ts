import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

const TMP_DIR = process.env['YTDLP_TMP_DIR'] ?? '/tmp/yt-dlp';

async function ensureTmpDir(): Promise<void> {
  await fs.mkdir(TMP_DIR, { recursive: true });
}

export interface DownloadResult {
  videoPath: string;
  title: string;
  durationSeconds: number;
}

export async function downloadVideo(url: string, correlationId: string): Promise<DownloadResult> {
  await ensureTmpDir();

  const outputTemplate = path.join(TMP_DIR, `${correlationId}.%(ext)s`);

  await execFileAsync('yt-dlp', [
    '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '--output', outputTemplate,
    '--no-playlist',
    '--quiet',
    url,
  ]);

  const files = await fs.readdir(TMP_DIR);
  const downloaded = files.find((f) => f.startsWith(correlationId));
  if (!downloaded) {
    throw new Error(`yt-dlp produced no output for correlationId=${correlationId}`);
  }
  const videoPath = path.join(TMP_DIR, downloaded);

  const { stdout } = await execFileAsync('yt-dlp', [
    '--print', '%(title)s|||%(duration)s',
    '--no-download',
    '--quiet',
    url,
  ]);

  const [title = 'unknown', durationStr = '0'] = stdout.trim().split('|||');
  const durationSeconds = parseInt(durationStr, 10) || 0;

  return { videoPath, title, durationSeconds };
}

export async function getVideoInfo(url: string): Promise<{ title: string; durationSeconds: number }> {
  const { stdout } = await execFileAsync('yt-dlp', [
    '--print', '%(title)s|||%(duration)s',
    '--no-download',
    '--quiet',
    url,
  ]);

  const [title = 'unknown', durationStr = '0'] = stdout.trim().split('|||');
  return { title, durationSeconds: parseInt(durationStr, 10) || 0 };
}

export async function cleanOldDownloads(maxAgeHours = 48): Promise<void> {
  await ensureTmpDir();
  const files = await fs.readdir(TMP_DIR);
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(TMP_DIR, file);
    const stat = await fs.stat(filePath);
    if (now - stat.mtimeMs > maxAgeMs) {
      await fs.rm(filePath, { force: true });
    }
  }
}
