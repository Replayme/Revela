import { NextResponse } from 'next/server';
import { favoritesByUser, toggleFavorite } from '@/lib/mock-db';
import { findPhoto } from '@/lib/mock-photos';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As fotos que a pessoa salvou.
 *
 * Favoritar exige conta pelo mesmo motivo que comprar: a lista é de alguém.
 * Sem sessão a resposta é 401 e a tela manda para o login com o caminho de
 * volta — nunca uma lista vazia fingindo que deu certo.
 *
 * ⚠️ O armazenamento é o mock em memória (`lib/mock-db.ts`), que some a cada
 * restart. Em produção é uma tabela com chave composta (usuário, foto) e
 * índice único nos dois: favoritar duas vezes em paralelo não pode criar duas
 * linhas.
 */
export async function GET() {
  const session = await currentSession();

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  return NextResponse.json({ photoIds: favoritesByUser(session.sub) });
}

/**
 * POST alterna o favorito de uma foto e devolve o estado que ficou.
 *
 * Alternar num POST só, em vez de POST para salvar e DELETE para remover,
 * porque o botão é um só: mandar o *desejo* de inverter evita a tela e o
 * servidor discordarem sobre qual era o estado anterior.
 */
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
