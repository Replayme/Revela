import { NextResponse } from 'next/server';
import { findOrderById, findSoldPhoto } from '@/lib/repository';
import { assinarEntrega } from '@/lib/blob';
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

  let destino = photo.fullUrl;

  if (photo.storageKey) {
    try {
      destino = await assinarEntrega(photo.storageKey);
    } catch {
      return NextResponse.json({ error: 'STORAGE_UNAVAILABLE' }, { status: 503 });
    }
  }

  return NextResponse.redirect(destino, {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
