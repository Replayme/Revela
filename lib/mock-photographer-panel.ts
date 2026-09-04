import { ordersByPhoto } from './mock-db';
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
 * natureza que as contas de demonstração que já existem no `mock-db`. Ela some
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
export function painelDoAutor(email: string): PainelDoAutor | null {
  const photographerId = VINCULO_DEMO[email.trim().toLowerCase()];
  if (!photographerId) return null;

  const photographer = findPhotographer(photographerId);
  if (!photographer) return null;

  return { photographer, photos: photosByPhotographer(photographerId).map(comVendas) };
}

/**
 * As vendas saem dos pedidos de verdade, não de um número guardado na foto.
 *
 * Numa loja sem venda nenhuma isto devolve zero em tudo, e zero é a resposta
 * certa — foi por inventar número que não se podia conferir que a home perdeu
 * seis deles. Quando o acervo vier do banco, isto vira `COUNT`/`SUM` numa
 * consulta só; a forma que a tela recebe não muda.
 */
function comVendas(photo: ReturnType<typeof photosByPhotographer>[number]): PhotographerPhoto {
  const pedidos = ordersByPhoto(photo.id);

  return {
    ...photo,
    // Toda foto do catálogo já está no acervo — é o que "estar no catálogo"
    // quer dizer. Rascunho e análise só passam a existir com quem os grave.
    status: 'publicada',
    sales: pedidos.length,
    revenue: pedidos.reduce((soma, pedido) => soma + pedido.pricePaid, 0),
  };
}
