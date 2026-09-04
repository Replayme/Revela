import { NextResponse } from 'next/server';
import { painelDoAutor } from '@/lib/photographer-panel-data';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/minhas-fotos — o painel de quem está logado.
 *
 * Conta que não é de autor responde **200 com o painel vazio**, não 404: ela
 * existe, está logada e simplesmente não publicou nada. É o mesmo estado
 * honesto que a tela mostra — "a conta existe, não publicou, e a tela diz isso
 * em vez de fingir um acervo".
 *
 * O `userId` de quem comprou **não sai daqui**: `vendasDoAutor` é quem monta a
 * lista de vendas, e ela não traz a identidade de quem licencia. Ver o
 * comentário lá.
 */
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
