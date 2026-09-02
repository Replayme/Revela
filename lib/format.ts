/**
 * Formatação de números da interface, toda em pt-BR: "R$ 89,90", "4,9",
 * "2.480". Um lugar só para os três cards não divergirem entre si.
 */

const price = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const rating = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const count = new Intl.NumberFormat('pt-BR');

export function formatPrice(value: number): string {
  return price.format(value);
}

/** Sempre com uma casa decimal: "5" viraria uma nota diferente de "4,9". */
export function formatRating(value: number): string {
  return rating.format(value);
}

/** Separador de milhar: "2.480". */
export function formatCount(value: number): string {
  return count.format(value);
}
