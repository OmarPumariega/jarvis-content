import { auth } from '@/auth';
import { db, videos } from '@jarvis/database';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [video] = await db
    .select({
      id: videos.id,
      status: videos.status,
      outputUrl: videos.outputUrl,
      errorMessage: videos.errorMessage,
      updatedAt: videos.updatedAt,
    })
    .from(videos)
    .where(and(eq(videos.id, id), eq(videos.userId, session.user.id)));

  if (!video) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(video);
}
