import { HomeScreen } from '@/components/home-screen';
import { listCategories, listPhotographers, listPhotos } from '@/lib/repository';

/**
 * A home, agora servida pelo servidor.
 *
 * Ela era um componente de cliente que importava `mockPhotos` direto: o
 * catálogo inteiro ia para o navegador dentro do bundle, e o "carregando" era
 * um `setTimeout` de 800ms fingindo uma ida ao back-end que não existia. As
 * três consultas abaixo são essa ida, de verdade — e o `HomeScreen` continua
 * sendo cliente, porque ele tem menu, busca e favoritos.
 *
 * As três em paralelo: são independentes, e enfileirá-las somaria três idas ao
 * banco na latência da primeira pintura da página mais vista do site.
 */
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
