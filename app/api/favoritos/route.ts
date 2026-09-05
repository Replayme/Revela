import { NextResponse } from 'next/server';
import { favoritesByUser, toggleFavorite } from '@/lib/repository';
import { findPhoto } from '@/lib/repository';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await currentSession();

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  return NextResponse.json({ photoIds: await favoritesByUser(session.sub) });
}

export async function POST(request: Request) {
  const session = await currentSession();

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: { photoId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const photoId = typeof body.photoId === 'string' ? body.photoId : '';
  if (!(await findPhoto(photoId))) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    photoId,
    favorited: await toggleFavorite(session.sub, photoId),
  });
}
