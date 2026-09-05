import { HomeScreen } from '@/components/home-screen';
import { listCategories, listPhotographers, listPhotos } from '@/lib/repository';

export default async function HomePage() {
  const [photos, categories, photographers] = await Promise.all([
    listPhotos(),
    listCategories(),
    listPhotographers(),
  ]);

  return (
    <HomeScreen photos={photos} categories={categories} photographers={photographers} />
  );
}
