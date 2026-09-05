import { NextResponse } from 'next/server';
import { painelDoAutor } from '@/lib/photographer-panel-data';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const painel = await painelDoAutor(session.sub);

  return NextResponse.json(
    painel ?? { photographer: null, photos: [] },
  );
}
