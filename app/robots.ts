import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * Duas camadas, com propósitos diferentes — e que precisam concordar.
 *
 * O `robots` **por página** (nos `layout.tsx` das telas de acesso e no
 * `metadata` de `/dashboard` e `/pedido/[id]`) diz "não indexe": o buscador
 * pode buscar a página, mas não a lista.
 *
 * Este arquivo diz "não rastreie": o buscador nem pede a página. É mais forte,
 * e por isso não serve sozinho — uma URL bloqueada aqui, mas linkada de fora,
 * ainda pode aparecer no índice sem título, justamente porque o buscador não
 * pôde entrar para ler o `noindex`. Daí as duas.
 *
 * Se acrescentar tela de conta, ela entra nos dois lugares.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/pedido/',
        '/login',
        '/cadastro-fotografo',
        '/esqueci-senha',
        '/redefinir-senha',
        '/api/',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
