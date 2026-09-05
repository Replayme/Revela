import { NextResponse } from 'next/server';
import { createOrder, findOrder, findPhoto } from '@/lib/repository';
import { UNIVERSAL_LICENSE } from '@/lib/license';

import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const photo = await findPhoto(photoId);

  if (!photo) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  const existing = await findOrder(session.sub, photo.id);
  if (existing) {
    return NextResponse.json({ order: existing, alreadyOwned: true });
  }

  const { order, created } = await createOrder({
    userId: session.sub,
    photoId: photo.id,
    pricePaid: photo.price,
    licenseVersion: UNIVERSAL_LICENSE.version,
  });

  return NextResponse.json(
    { order, alreadyOwned: !created },
    { status: created ? 201 : 200 },
  );
}
