import type { Photographer, StoredPhoto } from './model';

interface FotoSemente {
  id: string;
  title: string;
  photographer: { id: string; name: string };
  price: number;
  rating: number;
  category: string;
  orientation: 'horizontal' | 'vertical';
}

interface AutorSemente {
  id: string;
  name: string;
  rating: number;
}

function medidas(orientation: FotoSemente['orientation']): [number, number] {
  return orientation === 'vertical' ? [2000, 3000] : [3000, 2000];
}

const AUTORES: AutorSemente[] = [
  { id: 'ana-vilar', name: 'Ana Vilar', rating: 4.9 },
  { id: 'joao-benicio', name: 'João Benício', rating: 4.7 },
  { id: 'marina-costa', name: 'Marina Costa', rating: 5 },
  { id: 'rafael-drumond', name: 'Rafael Drumond', rating: 4.6 },
  { id: 'leticia-sa', name: 'Letícia Sá', rating: 4.8 },
  { id: 'clara-nobrega', name: 'Clara Nóbrega', rating: 4.5 },
];

const FOTOS: FotoSemente[] = [
  {
    id: 'p-01',
    title: 'Véu ao vento na Praia da Pipa',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 89.9,
    rating: 4.9,
    category: 'Casamento',
    orientation: 'horizontal',
  },
  {
    id: 'p-02',
    title: 'Feira de São José ao amanhecer',
    photographer: { id: 'joao-benicio', name: 'João Benício' },
    price: 54,
    rating: 4.7,
    category: 'Documental e rua',
    orientation: 'horizontal',
  },
  {
    id: 'p-03',
    title: 'Retrato em luz de janela',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 120,
    rating: 5,
    category: 'Retrato',
    orientation: 'vertical',
  },
  {
    id: 'p-04',
    title: 'Dunas de Genipabu no fim da tarde',
    photographer: { id: 'rafael-drumond', name: 'Rafael Drumond' },
    price: 67.5,
    rating: 4.6,
    category: 'Documental e rua',
    orientation: 'horizontal',
  },
  {
    id: 'p-05',
    title: 'Moqueca servida na panela de barro',
    photographer: { id: 'leticia-sa', name: 'Letícia Sá' },
    price: 45,
    rating: 4.8,
    category: 'Gastronomia',
    orientation: 'horizontal',
  },
  {
    id: 'p-06',
    title: 'Escadaria do casarão restaurado',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 98,
    rating: 4.5,
    category: 'Arquitetura e imóveis',
    orientation: 'vertical',
  },
  {
    id: 'p-07',
    title: 'Mãos da avó sovando o pão',
    photographer: { id: 'clara-nobrega', name: 'Clara Nóbrega' },
    price: 72,
    rating: 4.9,
    category: 'Família e infantil',
    orientation: 'horizontal',
  },
  {
    id: 'p-08',
    title: 'Cerâmica no torno, oficina do centro',
    photographer: { id: 'joao-benicio', name: 'João Benício' },
    price: 39.9,
    rating: 4.4,
    category: 'Produto e e-commerce',
    orientation: 'horizontal',
  },
  {
    id: 'p-09',
    title: 'Primeiro banho de mar',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 84,
    rating: 4.8,
    category: 'Família e infantil',
    orientation: 'horizontal',
  },
  {
    id: 'p-10',
    title: 'Congresso na abertura da plenária',
    photographer: { id: 'rafael-drumond', name: 'Rafael Drumond' },
    price: 110,
    rating: 4.3,
    category: 'Eventos corporativos',
    orientation: 'horizontal',
  },
  {
    id: 'p-11',
    title: 'Aliança sobre renda renascença',
    photographer: { id: 'leticia-sa', name: 'Letícia Sá' },
    price: 63,
    rating: 4.7,
    category: 'Casamento',
    orientation: 'vertical',
  },
  {
    id: 'p-12',
    title: 'Café coado no fim do expediente',
    photographer: { id: 'clara-nobrega', name: 'Clara Nóbrega' },
    price: 41.5,
    rating: 4.6,
    category: 'Gastronomia',
    orientation: 'horizontal',
  },
  {
    id: 'p-13',
    title: 'Fachada modernista em contraluz',
    photographer: { id: 'ana-vilar', name: 'Ana Vilar' },
    price: 132,
    rating: 4.9,
    category: 'Arquitetura e imóveis',
    orientation: 'vertical',
  },
  {
    id: 'p-14',
    title: 'Ensaio de gestante no manguezal',
    photographer: { id: 'marina-costa', name: 'Marina Costa' },
    price: 95,
    rating: 4.8,
    category: 'Retrato',
    orientation: 'horizontal',
  },
];

const NASCIMENTO = Date.UTC(2026, 8, 3);

export const seedPhotographers: Photographer[] = AUTORES.map((autor) => ({
  ...autor,
  avatarUrl: `https://picsum.photos/seed/${autor.id}-avatar/200/200`,
  coverPhotoUrl: `https://picsum.photos/seed/${autor.id}-cover/800/600`,

  photoCount: 0,
}));

export const seedPhotos: StoredPhoto[] = FOTOS.map((foto) => {
  const [width, height] = medidas(foto.orientation);
  return {
    ...foto,
    thumbnailUrl: `https://picsum.photos/seed/${foto.id}/800/600`,
    fullUrl: `https://picsum.photos/seed/${foto.id}/${width}/${height}`,
    width,
    height,
    status: 'publicada' as const,
    createdAt: NASCIMENTO,
  };
});

export const SEED_AUTOR_DA_ANA = 'ana-vilar';
