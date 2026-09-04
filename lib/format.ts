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

const dateLong = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateShort = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "03 de setembro de 2026" — a data do recibo, por extenso. */
export function formatDateLong(value: number | Date): string {
  return dateLong.format(value);
}

/** "03/09/2026" — a data na lista, onde a linha precisa caber. */
export function formatDate(value: number | Date): string {
  return dateShort.format(value);
}

/**
 * "3,4 MB", "820 kB" — o peso de um arquivo escolhido para envio.
 *
 * Abaixo de um mega o valor sai em kB: um PNG bem comprimido apareceria como
 * "0,0 MB", e um campo que informa zero ao lado de um arquivo que existe faz
 * duvidar se ele chegou.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
