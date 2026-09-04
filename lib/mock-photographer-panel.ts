import { ordersByPhoto } from './repository';
import type { Order } from './model';
import { photosByPhotographer } from './mock-photos';
import { findPhotographer, type Photographer } from './mock-photographers';
import type { PhotographerPhoto } from './photographer-panel';

/**
 * De quem é o painel — a ponte entre a conta logada e o autor no catálogo.
 *
 * **Esse vínculo não existe no modelo.** `User` não sabe de qual fotógrafo é,
 * e `Photographer` não sabe de qual conta: são duas listas que nunca se
 * falaram, porque até agora ninguém precisou disso. Quem grava o vínculo é o
 * cadastro, e o cadastro ainda é o mesmo `POST /api/auth/register` de quem só
 * compra.
 *
 * Enquanto isso, uma tabela de demonstração, do mesmo tamanho e da mesma
 * natureza que as contas de demonstração que já existem no armazenamento. Some
 * no dia em que `User` ganhar o campo — e some inteira, não meio.
 *
 * Quem não está aqui vê o painel vazio. É o estado honesto: a conta existe,
 * não publicou nada, e a tela diz isso em vez de fingir um acervo.
 */
const VINCULO_DEMO: Record<string, string> = {
  'ana@revela.com': 'ana-vilar',
};

export interface PainelDoAutor {
  photographer: Photographer;
  photos: PhotographerPhoto[];
}

/**
 * O painel de quem está logado, ou `null` se a conta não é de um autor.
 *
 * **Só de leitura.** Publicar, despublicar e remover não passam por aqui
 * porque não passam por lugar nenhum ainda: a tela mostra o que existe e não
 * oferece botão que não tenha quem o atenda.
 */
export async function painelDoAutor(email: string): Promise<PainelDoAutor | null> {
  const photographerId = VINCULO_DEMO[email.trim().toLowerCase()];
  if (!photographerId) return null;

  const photographer = findPhotographer(photographerId);
  if (!photographer) return null;

  // `Promise.all` e não um laço com `await` dentro: são N consultas
  // independentes, e enfileirá-las multiplicaria a latência do painel pelo
  // número de fotos do acervo do autor. Quando `dbo.photos` existir, as N
  // viram uma só, com GROUP BY (ver `comVendas`).
  const photos = await Promise.all(
    photosByPhotographer(photographerId).map(comVendas),
  );

  return { photographer, photos };
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
 * Existe para as telas de editar e de remover não escreverem cada uma a sua
 * versão desta conferência.
 *
 * Recebe o painel em vez do e-mail porque as duas telas já precisam dele para
 * distinguir "não é autor" de "não é sua foto". Buscar de novo aqui dobraria
 * as consultas do acervo inteiro para responder uma pergunta que a lista já
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
 */
export async function vendasDoAutor(
  painel: PainelDoAutor | null,
): Promise<VendaDoAutor[]> {
  if (!painel) return [];

  const porFoto = await Promise.all(
    painel.photos.map(async (photo) =>
      (await ordersByPhoto(photo.id)).map((order) => ({ order, photo })),
    ),
  );

  return porFoto.flat().sort((a, b) => b.order.createdAt - a.order.createdAt);
}

/**
 * As vendas saem dos pedidos de verdade, não de um número guardado na foto.
 *
 * Numa loja sem venda nenhuma isto devolve zero em tudo, e zero é a resposta
 * certa — foi por inventar número que não se podia conferir que a home perdeu
 * seis deles. Quando o acervo vier do banco, isto vira `COUNT`/`SUM` numa
 * consulta só; a forma que a tela recebe não muda.
 */
async function comVendas(
  photo: ReturnType<typeof photosByPhotographer>[number],
): Promise<PhotographerPhoto> {
  const pedidos = await ordersByPhoto(photo.id);

  return {
    ...photo,
    // Toda foto do catálogo já está no acervo — é o que "estar no catálogo"
    // quer dizer. Rascunho e análise só passam a existir com quem os grave.
    status: 'publicada',
    sales: pedidos.length,
    revenue: pedidos.reduce((soma, pedido) => soma + pedido.pricePaid, 0),
  };
}
