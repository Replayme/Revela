export interface Photographer {
  id: string;
  name: string;
  avatarUrl: string;
  coverPhotoUrl: string;
  photoCount: number;
  rating: number;
}

const CATALOG: Omit<Photographer, 'avatarUrl' | 'coverPhotoUrl'>[] = [
  { id: 'ana-vilar', name: 'Ana Vilar', photoCount: 284, rating: 4.9 },
  { id: 'joao-benicio', name: 'João Benício', photoCount: 176, rating: 4.7 },
  { id: 'marina-costa', name: 'Marina Costa', photoCount: 231, rating: 5 },
  { id: 'rafael-drumond', name: 'Rafael Drumond', photoCount: 98, rating: 4.6 },
  { id: 'leticia-sa', name: 'Letícia Sá', photoCount: 143, rating: 4.8 },
  { id: 'clara-nobrega', name: 'Clara Nóbrega', photoCount: 52, rating: 4.5 },
];

export const mockPhotographers: Photographer[] = CATALOG.map(
  (photographer) => ({
    ...photographer,
    avatarUrl: `https://picsum.photos/seed/${photographer.id}-avatar/200/200`,
    coverPhotoUrl: `https://picsum.photos/seed/${photographer.id}-cover/800/600`,
  }),
);

export function findPhotographer(id: string): Photographer | undefined {
  return mockPhotographers.find((photographer) => photographer.id === id);
}
