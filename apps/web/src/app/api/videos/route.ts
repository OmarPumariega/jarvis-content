import { auth } from '@/auth';
import { db, videos } from '@jarvis/database';
import { CreateVideoSchema } from '@jarvis/types';
import { NextResponse } from 'next/server';
import { videoQueue } from '@/queues/videoQueue';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = CreateVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [video] = await db
    .insert(videos)
    .values({
      userId: session.user.id,
      flow: parsed.data.flow,
      inputUrl: parsed.data.inputUrl ?? null,
    })
    .returning();

  if (!video) {
    return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
  }

  const baseUrl = process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/videos/callback`;

  const { heygenAvatarId, heygenVoiceId, script, elevenlabsVoiceId, narrationText } = parsed.data;

  await videoQueue.add(`video-${video.id}`, {
    videoId: video.id,
    correlationId: video.correlationId,
    userId: session.user.id,
    flow: parsed.data.flow,
    inputUrl: parsed.data.inputUrl,
    webhookUrl,
    ...(heygenAvatarId !== undefined && { heygenAvatarId }),
    ...(heygenVoiceId !== undefined && { heygenVoiceId }),
    ...(script !== undefined && { script }),
    ...(elevenlabsVoiceId !== undefined && { elevenlabsVoiceId }),
    ...(narrationText !== undefined && { narrationText }),
  });

  return NextResponse.json({ id: video.id, correlationId: video.correlationId }, { status: 201 });
}
