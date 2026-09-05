import { NextResponse } from 'next/server';
import { findOrderById, findSoldPhoto } from '@/lib/repository';

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

  const order = await findOrderById(session.sub, (await params).id);
  if (!order) {
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }

  const photo = await findSoldPhoto(order.photoId);
  if (!photo) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.redirect(photo.fullUrl, {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
