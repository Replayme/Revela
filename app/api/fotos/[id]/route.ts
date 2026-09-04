import { NextResponse } from 'next/server';
import { photographerOfUser, removePhoto, updatePhoto } from '@/lib/repository';
import { lerPatchDeFoto } from '@/lib/photo-validation';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A ficha de uma foto do autor logado.
 *
 * **Foto de outra pessoa responde 404, não 403.** "Existe, mas não é sua" já
 * conta quantas fotos o acervo tem e quais ids são válidos — a mesma regra do
 * recibo em `/pedido/{id}`. Quem não é autor nenhum cai no mesmo 404: para
 * essa conta, foto de autor não existe.
 *
 * A conferência de dono não é um `if` antes da gravação: o id do autor entra
 * no `WHERE` da consulta (ver `lib/store-postgres.ts`). Buscar, comparar e só
 * então gravar deixa uma janela entre a comparação e o UPDATE — e é o caminho
 * que um dia esquece de comparar.
 */
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

/**
 * PATCH /api/fotos/{id} — edita título, categoria, preço e `status`.
 *
 * É por `status` que despublicar acontece: a tela de remover manda
 * `{ status: 'rascunho' }` para tirar de venda sem tirar do acervo, e um
 * `DELETE` para tirar de vez. Duas ações diferentes, duas rotas, porque o erro
 * a evitar é remover querendo despublicar.
 *
 * O que já foi comprado **não muda**. `pricePaid` e `licenseVersion` moram no
 * pedido justamente para isso: mexer na tabela de preços não reescreve venda
 * antiga.
 */
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

  // Corpo válido e vazio não é erro — é um pedido que não pede nada. Gravar
  // `updated_at` por causa dele marcaria como editada uma foto que ninguém
  // editou.
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const photo = await updatePhoto(photographer.id, (await params).id, patch);
  if (!photo) return naoEncontrada();

  return NextResponse.json({ photo });
}

/**
 * DELETE /api/fotos/{id} — tira do acervo.
 *
 * **Não apaga a linha, e não toca nos pedidos já emitidos.** A licença é
 * perpétua: quem comprou continua com o recibo e com o download, para sempre.
 * O que a remoção encerra são as vendas novas. Ver `db/003_catalogo.sql`, onde
 * essa decisão está no esquema e não só aqui.
 */
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
