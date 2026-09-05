import type { NewPhoto, PhotoPatch, PhotoStatus } from './model';

export const TITULO_MIN = 5;
export const TITULO_MAX = 120;

export const PRECO_MAX = 1_000_000;

export const LADO_MINIMO = 1600;

const LADO_MAXIMO = 60_000;

const STATUS: PhotoStatus[] = ['rascunho', 'em-analise', 'publicada'];

export type CampoInvalido = 'title' | 'category' | 'price' | 'status';

export interface PatchLido {
  patch: PhotoPatch;
  invalidos: CampoInvalido[];
}

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

    if (!Number.isFinite(price) || price <= 0 || price > PRECO_MAX) invalidos.push('price');

    else patch.price = Math.round(price * 100) / 100;
  }

  if (body.status !== undefined) {
    const status = body.status as PhotoStatus;
    if (!STATUS.includes(status)) invalidos.push('status');
    else patch.status = status;
  }

  return { patch, invalidos };
}

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

  if (width !== null && height !== null && Math.max(width, height) < LADO_MINIMO) {
    invalidos.push('width', 'height');
  }

  const urls = (['thumbnailUrl', 'fullUrl'] as const).map((campo) => {
    const valor = typeof body[campo] === 'string' ? (body[campo] as string) : '';

    if (!valor.startsWith('https://')) invalidos.push(campo);
    return valor;
  });

  const storageKey = typeof body.storageKey === 'string' ? body.storageKey : '';

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
