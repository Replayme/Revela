import { NextResponse } from 'next/server';
import { favoritesByUser, toggleFavorite } from '@/lib/mock-db';
import { findPhoto } from '@/lib/mock-photos';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await currentSession();

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  return NextResponse.json({ photoIds: favoritesByUser(session.sub) });
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
  if (!findPhoto(photoId)) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    photoId,
    favorited: toggleFavorite(session.sub, photoId),
  });
}
