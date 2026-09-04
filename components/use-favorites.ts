'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from './session-provider';

export function useFavorites() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!session) {
      setFavorites(new Set());
      return;
    }

    let cancelado = false;
    fetch('/api/favoritos')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { photoIds?: string[] } | null) => {
        if (!cancelado && data?.photoIds) setFavorites(new Set(data.photoIds));
      })
      .catch(() => {
      });

    return () => {
      cancelado = true;
    };
  }, [session]);

  const toggle = useCallback(
    async (photoId: string) => {
      if (!session) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const anterior = favorites;
      const otimista = new Set(anterior);
      if (otimista.has(photoId)) otimista.delete(photoId);
      else otimista.add(photoId);
      setFavorites(otimista);

      try {
        const response = await fetch('/api/favoritos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId }),
        });
        if (!response.ok) setFavorites(anterior);
      } catch {
        setFavorites(anterior);
      }
    },
    [session, favorites, router, pathname],
  );

  return { favorites, toggle };
}
