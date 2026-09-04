import type { PhotoPatch, PhotoStatus } from './model';

/**
 * As regras da ficha da foto, no servidor.
 *
 * O `components/photo-upload-form.tsx` já confere as mesmas coisas antes de
 * enviar. Isso é conveniência, não barreira: quem chama a rota direto não passa
 * pelo formulário, e uma regra que só existe no cliente é uma regra que não
 * existe. Os limites são os mesmos dos dois lados de propósito — divergir
 * significaria um campo que a tela aceita e o servidor recusa, ou pior, o
 * contrário.
 */

export const TITULO_MIN = 5;
export const TITULO_MAX = 120;
/** Teto de sanidade, não regra de negócio: R$ 1.000.000 numa foto é dedo escorregado. */
export const PRECO_MAX = 1_000_000;

const STATUS: PhotoStatus[] = ['rascunho', 'em-analise', 'publicada'];

export type CampoInvalido = 'title' | 'category' | 'price' | 'status';

export interface PatchLido {
  patch: PhotoPatch;
  invalidos: CampoInvalido[];
}

/**
 * Lê o corpo de um `PATCH` e devolve só os campos presentes e válidos.
 *
 * Campo ausente **não** é campo inválido: um PATCH parcial é a razão de ele
 * ser um PATCH. Campo presente e malformado entra em `invalidos`, e a rota
 * responde 400 sem gravar nada — nunca grava metade.
 */
export function lerPatchDeFoto(body: Record<string, unknown>): PatchLido {
  const patch: PhotoPatch = {};
  const invalidos: CampoInvalido[] = [];

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < TITULO_MIN || title.length > TITULO_MAX) invalidos.push('title');
    else patch.title = title;
  }

  if (body.category !== undefined) {
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category) invalidos.push('category');
    else patch.category = category;
  }

  if (body.price !== undefined) {
    const price = typeof body.price === 'number' ? body.price : Number.NaN;
    // `> 0` e não `>= 0`: foto de graça não é um preço, é outra decisão de
    // produto — e o site inteiro fala em licença paga.
    if (!Number.isFinite(price) || price <= 0 || price > PRECO_MAX) invalidos.push('price');
    // Duas casas: o banco guarda NUMERIC(10,2) e arredondaria calado.
    else patch.price = Math.round(price * 100) / 100;
  }

  if (body.status !== undefined) {
    const status = body.status as PhotoStatus;
    if (!STATUS.includes(status)) invalidos.push('status');
    else patch.status = status;
  }

  return { patch, invalidos };
}
