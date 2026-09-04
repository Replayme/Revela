'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from './session-provider';

/**
 * Os favoritos de quem está logado, para as grades de foto.
 *
 * O coração só quer dizer alguma coisa se for a lista de alguém, então a
 * origem da verdade é o servidor (`/api/favoritos`) e não o catálogo. Quem não
 * entrou não tem lista: clicar leva ao login carregando o caminho de volta,
 * como já faz o botão de comprar — em vez de guardar um estado que se perde no
 * reload e faz a pessoa achar que salvou.
 *
 * A troca é otimista: o coração vira na hora e volta atrás se o servidor
 * recusar. Esperar a resposta para pintar um coração é lento a ponto de a
 * pessoa clicar duas vezes.
 */
export function useFavorites() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    // Deslogado não tem lista para buscar, e trocar de conta não pode herdar a
    // lista da anterior — daí o estado zerar junto.
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
        /* sem favoritos na tela é melhor que a grade não carregar */
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
