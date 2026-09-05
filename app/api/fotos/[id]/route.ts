import { NextResponse } from 'next/server';
import { photographerOfUser, removePhoto, updatePhoto } from '@/lib/repository';
import { lerPatchDeFoto } from '@/lib/photo-validation';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function autorDaSessao() {
  const session = await currentSession();
  if (!session) return { erro: naoAutenticado() };

  const photographer = await photographerOfUser(session.sub);
  if (!photographer) return { erro: naoEncontrada() };

  return { photographer };
}

const naoAutenticado = () =>
  NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

const naoEncontrada = () =>
  NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { photographer, erro } = await autorDaSessao();
  if (erro) return erro;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const { patch, invalidos } = lerPatchDeFoto(body);

  if (invalidos.length > 0) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        fields: Object.fromEntries(invalidos.map((campo) => [campo, 'invalid'])),
      },
      { status: 400 },
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const photo = await updatePhoto(photographer.id, (await params).id, patch);
  if (!photo) return naoEncontrada();

  return NextResponse.json({ photo });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { photographer, erro } = await autorDaSessao();
  if (erro) return erro;

  const removida = await removePhoto(photographer.id, (await params).id);
  if (!removida) return naoEncontrada();

  return NextResponse.json({ ok: true });
}
