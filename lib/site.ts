export function siteUrl(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicito) return explicito.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}
