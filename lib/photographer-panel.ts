import type { PhotoStatus, StoredPhoto } from './model';

export type { PhotoStatus };

/**
 * O formato que o painel de quem vende espera receber.
 *
 * Este arquivo é só o contrato — não há dado inventado aqui. Os componentes do
 * painel recebem tudo por props, e quem os monta é que busca os números. Assim
 * a tela não passa a existir antes do que ela mostra: enquanto `GET
 * /api/minhas-fotos` não existir, o painel mostra vazio, e vazio é a verdade.
 *
 * A `Photo` do acervo é a ficha pública da foto; o que se acrescenta aqui é o
 * que só o autor pode ver — em que pé está a publicação e o que ela já rendeu.
 */

/**
 * A ficha da foto para quem a publicou: o que o armazenamento devolve
 * (`StoredPhoto` — a ficha pública mais o estado e as datas) somado ao que só
 * o autor vê, que é o que ela já rendeu.
 *
 * `PhotoStatus` mudou de casa junto com o resto do modelo, e é reexportado
 * acima porque `STATUS_LABEL` e `STATUS_CLASS`, logo abaixo, são dele.
 */
export interface PhotographerPhoto extends StoredPhoto {
  /** Licenças já emitidas desta foto. */
  sales: number;
  /**
   * Soma do que foi pago por elas, em reais.
   *
   * É o valor cheio, não uma fração: o modelo do site é licença única sem
   * comissão, e um "repasse" de 85% aqui contradiria a home — foi exatamente
   * esse tipo de número que saiu da tela no commit anterior.
   */
  revenue: number;
}

/** O rótulo de cada estado, na voz do site. */
export const STATUS_LABEL: Record<PhotoStatus, string> = {
  rascunho: 'Rascunho',
  'em-analise': 'Em análise',
  publicada: 'Publicada',
};

/**
 * A cor de cada estado.
 *
 * O âmbar é a cor de ação em todo o site, então `em-analise` não o usa: nada
 * há para clicar enquanto a curadoria não responde. Publicada leva o verde de
 * sinal, rascunho fica no cinza do papel — é ausência de estado, não alerta.
 */
export const STATUS_CLASS: Record<PhotoStatus, string> = {
  rascunho: 'border-paper/25 text-paper-400',
  'em-analise': 'border-paper/25 text-paper-300',
  publicada: 'border-signal-ok/50 text-signal-ok',
};

/** O que o painel resume no topo, somado sobre as fotos do autor. */
export interface PhotographerSummary {
  published: number;
  sales: number;
  revenue: number;
}

/**
 * O resumo sai da própria lista, e não de um campo à parte que o servidor
 * mandaria junto: dois caminhos para o mesmo número divergem no dia em que um
 * deles for corrigido.
 */
export function summarize(photos: PhotographerPhoto[]): PhotographerSummary {
  return photos.reduce<PhotographerSummary>(
    (soma, photo) => ({
      published: soma.published + (photo.status === 'publicada' ? 1 : 0),
      sales: soma.sales + photo.sales,
      revenue: soma.revenue + photo.revenue,
    }),
    { published: 0, sales: 0, revenue: 0 },
  );
}
