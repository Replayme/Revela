import { NextResponse } from 'next/server';
import { findOrderById } from '@/lib/mock-db';
import { findPhoto } from '@/lib/mock-photos';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentSession();

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const order = findOrderById(session.sub, (await params).id);
  if (!order) {
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }

  const photo = findPhoto(order.photoId);
  if (!photo) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.redirect(photo.fullUrl, {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
