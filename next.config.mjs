/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Host das fotos de demonstração (lib/mock-photos.ts). Trocar pelo CDN do
    // acervo quando as fotos reais entrarem.
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // HTTPS obrigatório: força o navegador a nunca mais usar HTTP neste domínio.
          // Só tem efeito quando servido via HTTPS (produção).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
