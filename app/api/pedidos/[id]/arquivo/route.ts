import { NextResponse } from 'next/server';
import { findOrderById } from '@/lib/repository';
import { findPhoto } from '@/lib/mock-photos';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos/<id>/arquivo — entrega o arquivo de um pedido.
 *
 * O download passa pelo servidor de propósito. A alternativa — colocar a URL
 * do arquivo direto no botão da página — publica o endereço do original para
 * quem abrir o código-fonte, tenha comprado ou não. Aqui a posse é conferida
 * a cada pedido, e o endereço só existe dentro da resposta.
 *
 * Pedido de outra pessoa responde 404, não 403: dizer "esse pedido existe, mas
 * não é seu" já conta quantos pedidos o site tem.
 *
 * ⚠️ NO MOCK o arquivo é a mesma imagem de demonstração em outra medida, e a
 * resposta é um redirecionamento para o host público. Em produção o original
 * fica em bucket privado e esta rota devolve uma URL assinada de vida curta
 * (minutos), com `Content-Disposition: attachment`. Ver docs/API.md §11.
 */
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

  const photo = findPhoto(order.photoId);
  if (!photo) {
    return NextResponse.json({ error: 'PHOTO_NOT_FOUND' }, { status: 404 });
  }

  // `no-store` para o arquivo não sobrar em cache compartilhado depois que a
  // sessão acabar.
  return NextResponse.redirect(photo.fullUrl, {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
