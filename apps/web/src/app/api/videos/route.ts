import { auth } from '@/auth';
import { db, videos } from '@jarvis/database';
import { eq } from 'drizzle-orm';
import { CreateVideoSchema } from '@jarvis/types';
import { NextResponse } from 'next/server';

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

  return NextResponse.json(video, { status: 201 });
}
