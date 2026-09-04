import { ordersByPhoto, type Order } from './mock-db';
import { photosByPhotographer } from './mock-photos';
import { findPhotographer, type Photographer } from './mock-photographers';
import type { PhotographerPhoto } from './photographer-panel';

const VINCULO_DEMO: Record<string, string> = {
  'ana@revela.com': 'ana-vilar',
};

export interface PainelDoAutor {
  photographer: Photographer;
  photos: PhotographerPhoto[];
}

export function painelDoAutor(email: string): PainelDoAutor | null {
  const photographerId = VINCULO_DEMO[email.trim().toLowerCase()];
  if (!photographerId) return null;

  const photographer = findPhotographer(photographerId);
  if (!photographer) return null;

  return { photographer, photos: photosByPhotographer(photographerId).map(comVendas) };
}

export function fotoDoAutor(
  email: string,
  photoId: string,
): PhotographerPhoto | undefined {
  return painelDoAutor(email)?.photos.find((photo) => photo.id === photoId);
}

export interface VendaDoAutor {
  order: Order;
  photo: PhotographerPhoto;
}

export function vendasDoAutor(email: string): VendaDoAutor[] {
  const painel = painelDoAutor(email);
  if (!painel) return [];

  return painel.photos
    .flatMap((photo) => ordersByPhoto(photo.id).map((order) => ({ order, photo })))
    .sort((a, b) => b.order.createdAt - a.order.createdAt);
}

function comVendas(photo: ReturnType<typeof photosByPhotographer>[number]): PhotographerPhoto {
  const pedidos = ordersByPhoto(photo.id);

  return {
    ...photo,
    status: 'publicada',
    sales: pedidos.length,
    revenue: pedidos.reduce((soma, pedido) => soma + pedido.pricePaid, 0),
  };
}
