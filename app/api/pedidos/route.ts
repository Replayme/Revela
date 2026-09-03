import { NextResponse } from 'next/server';
import { createOrder, findOrder } from '@/lib/mock-db';
import { UNIVERSAL_LICENSE } from '@/lib/license';
import { findPhoto } from '@/lib/mock-photos';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/pedidos — emite a licença de uma foto para quem está logado.
 *
 * Comprar exige conta: sem sessão válida a resposta é 401 e a tela manda para
 * o login carregando o caminho de volta.
 *
 * ⚠️ NÃO HÁ COBRANÇA. O pedido é registrado com o preço da tabela e a versão
 * da licença, que é o que precisa existir de qualquer forma; falta o passo de
 * pagamento no meio. Ver docs/API.md.
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
  const photo = findPhoto(photoId);

  if (!photo) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  // A licença é perpétua: comprar de novo a mesma foto não emite outra nem
  // cobra de novo — devolve a que já existe.
  const existing = findOrder(session.sub, photo.id);
  if (existing) {
    return NextResponse.json({ order: existing, alreadyOwned: true });
  }

  const order = createOrder({
    userId: session.sub,
    photoId: photo.id,
    pricePaid: photo.price,
    licenseVersion: UNIVERSAL_LICENSE.version,
  });

  return NextResponse.json({ order, alreadyOwned: false }, { status: 201 });
}
