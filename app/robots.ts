import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

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
