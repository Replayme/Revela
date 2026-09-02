import { Suspense } from 'react';
import BuscaFiltros from '@/components/busca-filtros';

export default function ExplorarPage() {
  return (
    <Suspense fallback={null}>
      <BuscaFiltros />
    </Suspense>
  );
}
