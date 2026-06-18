export interface VideoJobData {
  videoId: string;
  correlationId: string;
  userId: string;
  flow: 'REPURPOSING' | 'TREND_CLONING' | 'QUICK_MODE';
  inputUrl: string | undefined;
  webhookUrl: string;
  // TREND_CLONING: HeyGen avatar generation params
  heygenAvatarId?: string;
  heygenVoiceId?: string;
  script?: string;
  // QUICK_MODE / TREND_CLONING: ElevenLabs voice cloning
  elevenlabsVoiceId?: string;
  narrationText?: string;
}
