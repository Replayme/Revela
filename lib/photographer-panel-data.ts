import {
  ordersByAuthor,
  photographerOfUser,
  photosOfAuthor,
  salesByAuthor,
} from './repository';
import type { Order, Photographer } from './model';
import type { PhotographerPhoto } from './photographer-panel';

/**
 * O painel de quem vende, montado a partir do banco.
 *
 * Este arquivo se chamava `mock-photographer-panel.ts` e começava assim:
 *
 * ```ts
 * // some quando User.photographerId existir
 * const VINCULO_DEMO: Record<string, string> = { 'ana@revela.com': 'ana-vilar' };
 * ```
 *
 * O campo existe (`users.photographer_id`, em `db/003_catalogo.sql`), então o
 * mapa morreu — inteiro, como o comentário dele prometia. A consequência
 * prática é que o painel deixou de valer só para a conta de demonstração:
 * qualquer conta com autor vinculado tem painel, e qualquer conta sem ele vê a
 * tela vazia com o caminho para o cadastro de fotógrafo. Nenhuma das cinco
 * telas mudou por causa disso.
 *
 * A outra mudança é a chave: as funções recebem o **id da conta**, não o
 * e-mail. E-mail como chave estrangeira funciona até a primeira pessoa querer
 * trocar de e-mail.
 */

export interface PainelDoAutor {
  photographer: Photographer;
  photos: PhotographerPhoto[];
}

/**
 * O painel de quem está logado, ou `null` se a conta não é de um autor.
 *
 * **Só de leitura.** Publicar, despublicar e remover não passam por aqui: cada
 * um tem a sua rota, e a tela chama a rota.
 *
 * Duas consultas para o painel inteiro — as fotos do autor e um `GROUP BY` dos
 * pedidos delas —, e não uma por foto. A versão anterior consultava o acervo
 * inteiro foto a foto; o comentário lá dizia que isso viraria um
 * `COUNT`/`SUM` numa consulta só quando o acervo viesse do banco. Veio.
 */
export async function painelDoAutor(userId: string): Promise<PainelDoAutor | null> {
  const photographer = await photographerOfUser(userId);
  if (!photographer) return null;

  const [fotos, vendas] = await Promise.all([
    photosOfAuthor(photographer.id),
    salesByAuthor(photographer.id),
  ]);

  return {
    photographer,
    photos: fotos.map((foto) => ({
      ...foto,
      // Foto sem venda não aparece no `GROUP BY`, e a ausência é zero. Zero é a
      // resposta certa num acervo que ninguém comprou ainda — foi por inventar
      // número que não se podia conferir que a home perdeu seis deles.
      sales: vendas[foto.id]?.sales ?? 0,
      revenue: vendas[foto.id]?.revenue ?? 0,
    })),
  };
}

/**
 * Uma foto **do autor logado**, ou `undefined`.
 *
 * A busca parte da lista dele e não do catálogo inteiro: procurar a foto e só
 * depois comparar o dono dá o mesmo resultado hoje e é o caminho que um dia
 * esquece de comparar. Quem chama trata o `undefined` como 404, nunca como
 * 403 — "existe, mas não é sua" já conta quantas fotos o acervo tem e quais
 * ids são válidos.
 *
 * Recebe o painel em vez do id da conta porque as telas que a usam já
 * precisam dele para distinguir "não é autor" de "não é sua foto". Buscar de
 * novo aqui dobraria as consultas para responder uma pergunta que a lista já
 * na mão responde.
 */
export function fotoDoAutor(
  painel: PainelDoAutor | null,
  photoId: string,
): PhotographerPhoto | undefined {
  return painel?.photos.find((photo) => photo.id === photoId);
}

/** Uma licença emitida de uma foto do autor, com a foto junto. */
export interface VendaDoAutor {
  order: Order;
  photo: PhotographerPhoto;
}

/**
 * Todas as licenças emitidas das fotos do autor, da mais recente para a mais
 * antiga.
 *
 * **Quem comprou não vem junto de propósito.** O `Order` tem o `userId`, e
 * seria de uma linha trazê-lo — mas ninguém decidiu que o autor pode saber a
 * identidade de quem licencia, e o modelo do site não precisa disso para
 * funcionar. Entre expor uma pessoa por descuido e deixar de mostrar um dado
 * que ninguém pediu, a escolha é fácil. O dia em que houver uma decisão
 * escrita, ela entra aqui.
 *
 * Uma venda cuja foto o autor removeu **não some da lista**: a licença é
 * perpétua, o dinheiro entrou, e o recibo do outro lado continua de pé. Daí o
 * `includeRemoved` — montar este mapa sobre `painel.photos`, que exclui as
 * removidas, fazia a venda desaparecer do histórico no instante em que o autor
 * tirava a foto do acervo.
 *
 * As contagens saem dos próprios pedidos, e não de `salesByAuthor`: eles já
 * estão todos aqui: somá-los em memória custa nada e evita uma terceira ida ao
 * banco para recalcular o que a primeira já trouxe.
 */
export async function vendasDoAutor(
  painel: PainelDoAutor | null,
): Promise<VendaDoAutor[]> {
  if (!painel) return [];

  const [pedidos, fotos] = await Promise.all([
    ordersByAuthor(painel.photographer.id),
    photosOfAuthor(painel.photographer.id, { includeRemoved: true }),
  ]);

  const agregado = new Map<string, { sales: number; revenue: number }>();
  for (const pedido of pedidos) {
    const atual = agregado.get(pedido.photoId) ?? { sales: 0, revenue: 0 };
    atual.sales += 1;
    atual.revenue += pedido.pricePaid;
    agregado.set(pedido.photoId, atual);
  }

  const porId = new Map(
    fotos.map((foto) => [
      foto.id,
      {
        ...foto,
        sales: agregado.get(foto.id)?.sales ?? 0,
        revenue: agregado.get(foto.id)?.revenue ?? 0,
      },
    ]),
  );

  return pedidos.flatMap((order) => {
    const photo = porId.get(order.photoId);
    // Pedido sem foto correspondente não deveria existir — a chave estrangeira
    // de `orders` garante isso. Pular em vez de derrubar a tela de vendas.
    return photo ? [{ order, photo }] : [];
  });
}
