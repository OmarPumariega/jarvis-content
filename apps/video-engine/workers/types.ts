export interface VideoJobData {
  videoId: string;
  correlationId: string;
  userId: string;
  flow: 'REPURPOSING' | 'TREND_CLONING' | 'QUICK_MODE';
  inputUrl: string | undefined;
  webhookUrl: string;
}
