import { db, videos } from '@jarvis/database';
import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';

const CallbackSchema = z.object({
  videoId: z.string(),
  correlationId: z.string(),
  status: z.enum(['COMPLETED', 'FAILED']),
  outputUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
});

function verifyHmac(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env['WEBHOOK_HMAC_SECRET'] ?? '';
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-jarvis-signature');

  if (!verifyHmac(rawBody, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: z.infer<typeof CallbackSchema>;
  try {
    parsed = CallbackSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const [current] = await db
    .select({ id: videos.id, status: videos.status })
    .from(videos)
    .where(eq(videos.id, parsed.videoId));

  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Terminal states are immutable
  if (current.status === 'COMPLETED' || current.status === 'FAILED') {
    return NextResponse.json({ ignored: true });
  }

  await db
    .update(videos)
    .set({
      status: parsed.status,
      outputUrl: parsed.outputUrl ?? null,
      errorMessage: parsed.errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(videos.id, parsed.videoId));

  return NextResponse.json({ ok: true });
}
