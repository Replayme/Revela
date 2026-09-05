import { NextResponse } from 'next/server';
import { createPhoto, photographerOfUser } from '@/lib/repository';
import { lerFichaDeFoto } from '@/lib/photo-validation';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const photographer = await photographerOfUser(session.sub);
  if (!photographer) {

    return NextResponse.json({ error: 'NOT_A_PHOTOGRAPHER' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const { ficha, invalidos } = lerFichaDeFoto(body);

  if (invalidos.length > 0 || !ficha) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        fields: Object.fromEntries(invalidos.map((campo) => [campo, 'invalid'])),
      },
      { status: 400 },
    );
  }

  const prefixo = `fotos/${photographer.id}/`;
  if (!ficha.storageKey.startsWith(prefixo)) {
    return NextResponse.json(
      { error: 'VALIDATION', fields: { storageKey: 'invalid' } },
      { status: 400 },
    );
  }

  const photo = await createPhoto({ ...ficha, photographerId: photographer.id });

  return NextResponse.json({ photo }, { status: 201 });
}
