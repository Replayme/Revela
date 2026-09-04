/**
 * Tela de conta: fora dos buscadores.
 *
 * A página é um componente de cliente e não pode exportar `metadata`; o
 * layout, que é de servidor, exporta por ela. O `noindex` era global no
 * layout raiz e escondia o site inteiro — agora vale só onde deve valer.
 */
export const metadata = {
  title: 'Recuperar senha',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
