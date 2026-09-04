import type { Photo } from './mock-photos';

export type PhotoStatus = 'rascunho' | 'em-analise' | 'publicada';

export interface PhotographerPhoto extends Photo {
  status: PhotoStatus;
  sales: number;
  revenue: number;
  updatedAt?: number;
}

export const STATUS_LABEL: Record<PhotoStatus, string> = {
  rascunho: 'Rascunho',
  'em-analise': 'Em análise',
  publicada: 'Publicada',
};

export const STATUS_CLASS: Record<PhotoStatus, string> = {
  rascunho: 'border-paper/25 text-paper-400',
  'em-analise': 'border-paper/25 text-paper-300',
  publicada: 'border-signal-ok/50 text-signal-ok',
};

export interface PhotographerSummary {
  published: number;
  sales: number;
  revenue: number;
}

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
