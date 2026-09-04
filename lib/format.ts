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

export function formatRating(value: number): string {
  return rating.format(value);
}

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

export function formatDateLong(value: number | Date): string {
  return dateLong.format(value);
}

export function formatDate(value: number | Date): string {
  return dateShort.format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
