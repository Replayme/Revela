/**
 * Acervo de demonstração da home. Substituir por `GET /api/fotos` quando o
 * back-end existir — a interface `Photo` já é o formato esperado na resposta.
 */

export interface Photo {
  id: string;
  title: string;
  photographer: { id: string; name: string };
  price: number;
  rating: number;
  thumbnailUrl: string;
  category: string;
  orientation: 'horizontal' | 'vertical';
  isFavorited: boolean;
}

/** Imagem determinística por id — o mesmo id devolve sempre a mesma foto. */
function thumbnailFor(id: string): string {
  return `https://picsum.photos/seed/${id}/800/600`;
}

const CATALOG: Omit<Photo, 'thumbnailUrl'>[] = [
  {
    id: 'p-01',
    title: 'Véu ao vento na Praia da Pipa',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 89.9,
    rating: 4.9,
    category: 'Casamento',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-02',
    title: 'Feira de São José ao amanhecer',
    photographer: { id: 'joao-benicio', name: 'João Benício' },
    price: 54,
    rating: 4.7,
    category: 'Documental e rua',
    orientation: 'horizontal',
    isFavorited: true,
  },
  {
    id: 'p-03',
    title: 'Retrato em luz de janela',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 120,
    rating: 5,
    category: 'Retrato',
    orientation: 'vertical',
    isFavorited: false,
  },
  {
    id: 'p-04',
    title: 'Dunas de Genipabu no fim da tarde',
    photographer: { id: 'rafael-drumond', name: 'Rafael Drumond' },
    price: 67.5,
    rating: 4.6,
    category: 'Documental e rua',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-05',
    title: 'Moqueca servida na panela de barro',
    photographer: { id: 'leticia-sa', name: 'Letícia Sá' },
    price: 45,
    rating: 4.8,
    category: 'Gastronomia',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-06',
    title: 'Escadaria do casarão restaurado',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 98,
    rating: 4.5,
    category: 'Arquitetura e imóveis',
    orientation: 'vertical',
    isFavorited: false,
  },
  {
    id: 'p-07',
    title: 'Mãos da avó sovando o pão',
    photographer: { id: 'clara-nobrega', name: 'Clara Nóbrega' },
    price: 72,
    rating: 4.9,
    category: 'Família e infantil',
    orientation: 'horizontal',
    isFavorited: true,
  },
  {
    id: 'p-08',
    title: 'Cerâmica no torno, oficina do centro',
    photographer: { id: 'joao-benicio', name: 'João Benício' },
    price: 39.9,
    rating: 4.4,
    category: 'Produto e e-commerce',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-09',
    title: 'Primeiro banho de mar',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 84,
    rating: 4.8,
    category: 'Família e infantil',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-10',
    title: 'Congresso na abertura da plenária',
    photographer: { id: 'rafael-drumond', name: 'Rafael Drumond' },
    price: 110,
    rating: 4.3,
    category: 'Eventos corporativos',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-11',
    title: 'Aliança sobre renda renascença',
    photographer: { id: 'leticia-sa', name: 'Letícia Sá' },
    price: 63,
    rating: 4.7,
    category: 'Casamento',
    orientation: 'vertical',
    isFavorited: false,
  },
  {
    id: 'p-12',
    title: 'Café coado no fim do expediente',
    photographer: { id: 'clara-nobrega', name: 'Clara Nóbrega' },
    price: 41.5,
    rating: 4.6,
    category: 'Gastronomia',
    orientation: 'horizontal',
    isFavorited: false,
  },
  {
    id: 'p-13',
    title: 'Fachada modernista em contraluz',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 132,
    rating: 4.9,
    category: 'Arquitetura e imóveis',
    orientation: 'vertical',
    isFavorited: false,
  },
  {
    id: 'p-14',
    title: 'Ensaio de gestante no manguezal',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 95,
    rating: 4.8,
    category: 'Retrato',
    orientation: 'horizontal',
    isFavorited: false,
  },
];

export const mockPhotos: Photo[] = CATALOG.map((photo) => ({
  ...photo,
  thumbnailUrl: thumbnailFor(photo.id),
}));
