/**
 * O endereço público do site.
 *
 * Precisa ser absoluto em três lugares que não têm como adivinhar o host:
 * `metadataBase` (que resolve as URLs de Open Graph), o `sitemap.ts` e o
 * `robots.ts`. Deixar cada um montar a sua string é como as três divergem.
 *
 * Na Vercel a `VERCEL_PROJECT_PRODUCTION_URL` vem sem esquema e aponta sempre
 * para o domínio de produção — é o que se quer no `og:image`, para o preview
 * não anunciar a si mesmo. `NEXT_PUBLIC_SITE_URL` tem prioridade porque é o
 * único jeito de acertar um domínio próprio.
 */
export function siteUrl(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicito) return explicito.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}
