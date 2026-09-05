import {
  ordersByAuthor,
  photographerOfUser,
  photosOfAuthor,
  salesByAuthor,
} from './repository';
import type { Order, Photographer } from './model';
import type { PhotographerPhoto } from './photographer-panel';

export interface PainelDoAutor {
  photographer: Photographer;
  photos: PhotographerPhoto[];
}

export async function painelDoAutor(userId: string): Promise<PainelDoAutor | null> {
  const photographer = await photographerOfUser(userId);
  if (!photographer) return null;

  const [fotos, vendas] = await Promise.all([
    photosOfAuthor(photographer.id),
    salesByAuthor(photographer.id),
  ]);

  return {
    photographer,
    photos: fotos.map((foto) => ({
      ...foto,

      sales: vendas[foto.id]?.sales ?? 0,
      revenue: vendas[foto.id]?.revenue ?? 0,
    })),
  };
}

export function fotoDoAutor(
  painel: PainelDoAutor | null,
  photoId: string,
): PhotographerPhoto | undefined {
  return painel?.photos.find((photo) => photo.id === photoId);
}

export interface VendaDoAutor {
  order: Order;
  photo: PhotographerPhoto;
}

export async function vendasDoAutor(
  painel: PainelDoAutor | null,
): Promise<VendaDoAutor[]> {
  if (!painel) return [];

  const [pedidos, fotos] = await Promise.all([
    ordersByAuthor(painel.photographer.id),
    photosOfAuthor(painel.photographer.id, { includeRemoved: true }),
  ]);

  const agregado = new Map<string, { sales: number; revenue: number }>();
  for (const pedido of pedidos) {
    const atual = agregado.get(pedido.photoId) ?? { sales: 0, revenue: 0 };
    atual.sales += 1;
    atual.revenue += pedido.pricePaid;
    agregado.set(pedido.photoId, atual);
  }

  const porId = new Map(
    fotos.map((foto) => [
      foto.id,
      {
        ...foto,
        sales: agregado.get(foto.id)?.sales ?? 0,
        revenue: agregado.get(foto.id)?.revenue ?? 0,
      },
    ]),
  );

  return pedidos.flatMap((order) => {
    const photo = porId.get(order.photoId);

    return photo ? [{ order, photo }] : [];
  });
}
