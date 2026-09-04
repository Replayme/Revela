/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // `mssql`/`tedious` carregam módulos por `require` calculado em tempo de
  // execução (o driver nativo opcional, entre outros). O empacotador não
  // enxerga essas chamadas: ou o build quebra, ou o bundle sai sem um arquivo
  // que só falta na primeira consulta em produção. Fora do bundle, o pacote é
  // resolvido pelo Node normalmente, do `node_modules`.
  serverExternalPackages: ['mssql'],
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
