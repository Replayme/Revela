export const PREFIXO_ORIGINAIS = 'fotos';
export const PREFIXO_PREVIEWS = 'previews';

export const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];
export const TIPOS_DE_PREVIEW = ['image/jpeg', 'image/webp'];

export const TAMANHO_MAX = 25 * 1024 * 1024;
export const PREVIEW_TAMANHO_MAX = 4 * 1024 * 1024;
export const PREVIEW_LADO_MAIOR = 1600;
export const LADO_MINIMO = 1600;

export function caminhoDoOriginal(photographerId: string, nomeDoArquivo: string): string {
  return `${PREFIXO_ORIGINAIS}/${photographerId}/${nomeDoArquivo}`;
}

export function caminhoDoPreview(photographerId: string, nomeDoArquivo: string): string {
  return `${PREFIXO_PREVIEWS}/${photographerId}/${nomeDoArquivo}`;
}

export function dentroDoPrefixo(
  caminho: string,
  prefixo: string,
  photographerId: string,
): boolean {
  if (caminho.includes('..') || caminho.startsWith('/')) return false;
  return caminho.startsWith(`${prefixo}/${photographerId}/`);
}
