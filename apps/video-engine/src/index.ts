import pino from 'pino';
import { createVideoWorker } from '../workers/videoWorker';
import { cleanOldDownloads } from '../scripts/ytdlp';
import { cleanOldRenders } from '../scripts/ffmpeg';

const loggerOptions = {
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
};
const logger = pino(loggerOptions);

async function runCleanup(): Promise<void> {
  try {
    await cleanOldDownloads(48);
    const { freedBytes } = await cleanOldRenders(48);
    logger.info({ freedMB: Math.round(freedBytes / 1024 / 1024) }, 'Cleanup completed');
  } catch (err) {
    logger.warn({ err }, 'Cleanup error (non-fatal)');
  }
}

async function main(): Promise<void> {
  logger.info('Starting Jarvis video-engine worker');

  const worker = createVideoWorker(logger);

  // Daily cleanup: run once at startup, then every 24h
  await runCleanup();
  setInterval(() => void runCleanup(), 24 * 60 * 60 * 1000);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down gracefully');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  logger.info('Worker ready, waiting for jobs...');
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
