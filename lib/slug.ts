/**
 * "Arquitetura e imóveis" → "arquitetura-e-imoveis".
 *
 * Num arquivo só, sem dependência nenhuma, porque tanto o armazenamento (que
 * deriva as categorias do acervo) quanto as telas precisam dele. Duas cópias
 * divergiriam no dia em que uma delas ganhasse um caractere a mais.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
