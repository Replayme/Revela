import type { NewPhoto, PhotoPatch, PhotoStatus } from './model';

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
/**
 * O mesmo piso do formulário: o acervo entrega arquivo grande, e uma imagem de
 * 800px no lado maior não é o que a licença promete. O cliente já recusa —
 * isto é a barreira, aquilo é a conveniência.
 */
export const LADO_MINIMO = 1600;
/** Teto de sanidade: nenhuma câmera entrega isto, e evita `width` absurdo no banco. */
const LADO_MAXIMO = 60_000;

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


/* --------------------------- envio de foto nova --------------------------- */

export type CampoDeFicha =
  | CampoInvalido
  | 'width'
  | 'height'
  | 'thumbnailUrl'
  | 'fullUrl'
  | 'storageKey';

export interface FichaLida {
  ficha: Omit<NewPhoto, 'photographerId'> | null;
  invalidos: CampoDeFicha[];
}

const inteiroPositivo = (valor: unknown, teto: number): number | null => {
  if (typeof valor !== 'number' || !Number.isInteger(valor)) return null;
  return valor > 0 && valor <= teto ? valor : null;
};

/**
 * Lê o corpo de `POST /api/fotos`.
 *
 * Diferente do PATCH, aqui **todo campo é obrigatório**: uma foto nova sem
 * título ou sem medida não é um registro pela metade, é um registro que não
 * deveria existir.
 *
 * As medidas vêm do cliente porque é lá que a imagem foi aberta — o arquivo
 * nunca passa pelo servidor (ver `app/api/fotos/route.ts`). Conferi-las aqui
 * não prova que batem com o arquivo; o que impede é que uma medida absurda
 * entre no banco e a ficha da foto passe a mentir sobre o que se está
 * comprando.
 */
export function lerFichaDeFoto(body: Record<string, unknown>): FichaLida {
  const invalidos: CampoDeFicha[] = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < TITULO_MIN || title.length > TITULO_MAX) invalidos.push('title');

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) invalidos.push('category');

  const precoBruto = typeof body.price === 'number' ? body.price : Number.NaN;
  if (!Number.isFinite(precoBruto) || precoBruto <= 0 || precoBruto > PRECO_MAX) {
    invalidos.push('price');
  }

  const width = inteiroPositivo(body.width, LADO_MAXIMO);
  const height = inteiroPositivo(body.height, LADO_MAXIMO);
  if (width === null) invalidos.push('width');
  if (height === null) invalidos.push('height');
  // O lado maior é o que a regra do acervo mede, e ela vale para as duas
  // orientações — daí o `Math.max` em vez de um limite por eixo.
  if (width !== null && height !== null && Math.max(width, height) < LADO_MINIMO) {
    invalidos.push('width', 'height');
  }

  const urls = (['thumbnailUrl', 'fullUrl'] as const).map((campo) => {
    const valor = typeof body[campo] === 'string' ? (body[campo] as string) : '';
    // Só https: um endereço `http` no acervo vira aviso de conteúdo misto no
    // navegador, e `javascript:` num atributo de imagem é pior que isso.
    if (!valor.startsWith('https://')) invalidos.push(campo);
    return valor;
  });

  const storageKey = typeof body.storageKey === 'string' ? body.storageKey : '';
  // O prefixo por autor é conferido na rota, que é quem sabe de quem é a
  // sessão; aqui só se garante que é um caminho, e não uma URL inteira.
  if (!storageKey || storageKey.startsWith('http') || storageKey.includes('..')) {
    invalidos.push('storageKey');
  }

  if (invalidos.length > 0) return { ficha: null, invalidos };

  return {
    ficha: {
      title,
      category,
      price: Math.round(precoBruto * 100) / 100,
      width: width!,
      height: height!,
      thumbnailUrl: urls[0],
      fullUrl: urls[1],
      storageKey,
    },
    invalidos: [],
  };
}
