'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from '@/components/session-provider';
import { useFavorites } from '@/components/use-favorites';
import { SiteFooter } from '@/components/site-footer';
import { PhotoGrid } from '@/components/photo-grid';
import { CategoryGrid } from '@/components/category-grid';
import { PhotographerGrid } from '@/components/photographer-grid';
import { ValueSection } from '@/components/value-section';
import type { Category, Photo, Photographer } from '@/lib/model';
import styles from '@/app/page.module.css';

const PERFIS = [
  { slug: 'ana-vilar', nome: 'Ana Vilar', cidade: 'Natal' },
  { slug: 'joao-benicio', nome: 'João Benício', cidade: 'Recife' },
  { slug: 'marina-costa', nome: 'Marina Costa', cidade: 'Parnamirim' },
  { slug: 'rafael-drumond', nome: 'Rafael Drumond', cidade: 'João Pessoa' },
  { slug: 'leticia-sa', nome: 'Letícia Sá', cidade: 'Fortaleza' },
];

/**
 * Home do Revela — marketplace de fotógrafos.
 *
 * Recebe o acervo por prop em vez de importar um array. Antes o catálogo
 * inteiro era empacotado para o navegador e a "ida ao back-end" era um
 * `setTimeout` de 800ms; agora quem busca é `app/page.tsx`, no servidor, e o
 * que chega aqui já veio do banco.
 */
export function HomeScreen({
  photos,
  categories,
  photographers,
}: {
  photos: Photo[];
  categories: Category[];
  photographers: Photographer[];
}) {
  const router = useRouter();
  const sessao = useSession();
  // O favorito é do usuário, não da cópia local do catálogo: alternar aqui
  // pintava o coração e perdia tudo no reload.
  const { favorites, toggle: alternarFavorita } = useFavorites();
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState('');

  // `null` = ainda carregando, e o skeleton ainda existe: a primeira pintura
  // acontece antes da hidratação, e um quadro sem foto é melhor que um pulo.
  // O atraso de 800ms que simulava a ida ao back-end saiu — a ida é de verdade
  // agora, e acontece no servidor, antes desta tela existir.
  const [fotos, setFotos] = useState<Photo[] | null>(null);

  useEffect(() => {
    setFotos(photos);
  }, [photos]);

  function buscar(event: React.FormEvent) {
    event.preventDefault();
    const termo = busca.trim();
    router.push(termo ? `/explorar?termo=${encodeURIComponent(termo)}` : '/explorar');
  }

  return (
    <div className={styles.pagina}>
      <svg className={styles.grao} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>

      <a className={styles.pular} href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className={styles.cabecalho}>
        <div className={styles.wrap}>
          <div className={styles.faixa}>
            <Link className={styles.marca} href="/" aria-label="Revela — página inicial">
              <svg width={30} height={30} viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="14.5" stroke="#132B40" />
                <path
                  d="M16 1.5 L26 12 M30.5 16 L16.5 16 M27 24 L20 11 M16 30.5 L23 18 M2 21 L15 21 M5 8 L12 21"
                  stroke="#132B40"
                  strokeWidth={1.1}
                />
                <circle cx="16" cy="16" r="4.6" fill="#E0A32E" stroke="#132B40" />
              </svg>
              <span>Revela</span>
            </Link>

            <form className={styles.busca} role="search" onSubmit={buscar}>
              <svg className={styles.lupa} width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth={1.6} />
                <path d="M13 13l5 5" stroke="currentColor" strokeWidth={1.6} />
              </svg>
              <label className={styles.pular} htmlFor="q">
                Buscar fotógrafos
              </label>
              <input
                id="q"
                type="search"
                placeholder="Fotógrafo de casamento em Natal, RN"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </form>

            {/* A home tem header próprio (CSS module), separado do
                `SiteHeader` do resto do site — mas quem já entrou precisa
                achar a conta a partir daqui também. */}
            <div className={styles.acessos}>
              {sessao ? (
                <Link className={styles.cta} href="/dashboard">
                  Minha conta
                </Link>
              ) : (
                <>
                  <Link className={styles.entrar} href="/login">
                    Entrar
                  </Link>
                  <Link className={styles.cta} href="/cadastro-fotografo">
                    Cadastre-se como fotógrafo
                  </Link>
                </>
              )}
              <button
                className={styles.abrirMenu}
                aria-expanded={menuAberto}
                aria-controls="menu"
                onClick={() => setMenuAberto((aberto) => !aberto)}
              >
                {menuAberto ? 'Fechar' : 'Menu'}
              </button>
            </div>
          </div>
        </div>

        <nav
          className={`${styles.navegacao} ${menuAberto ? styles.aberta : ''}`}
          id="menu"
          aria-label="Principal"
        >
          <div className={styles.wrap}>
            <ul>
              <li>
                <Link href="/explorar" aria-current="page">
                  Explorar
                </Link>
              </li>
              {/* Âncoras, não rotas: as duas seções são desta página. Antes
                  eram links para /categorias e /sobre, que nunca existiram. */}
              <li>
                <Link href="/#categorias">Categorias</Link>
              </li>
              <li>
                <Link href="/#sobre">Sobre</Link>
              </li>
              {/* No celular o header esconde o "Entrar"; sem esta entrada quem
                  já tem conta não teria como fazer login pela home. */}
              {sessao ? (
                <li>
                  <Link className={`${styles.cta} ${styles.ctaMovel}`} href="/dashboard">
                    Minha conta
                  </Link>
                </li>
              ) : (
                <>
                  <li className={styles.entrarMovel}>
                    <Link href="/login">Entrar</Link>
                  </li>
                  <li>
                    <Link className={`${styles.cta} ${styles.ctaMovel}`} href="/cadastro-fotografo">
                      Cadastre-se como fotógrafo
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
      </header>

      <main id="conteudo">
        <section className={styles.abertura}>
          <div className={styles.wrap}>
            <h1>Quem vai fotografar o seu dia?</h1>
            <p>
              Compare portfólios, prazos de entrega e preços de fotógrafos independentes na sua
              cidade. Sem intermediário escolhendo por você.
            </p>
            <div className={styles.atalhos}>
              <span>Buscas frequentes:</span>
              <Link href="/explorar?termo=casamento">casamento</Link>
              <Link href="/explorar?termo=gestante">gestante</Link>
              <Link href="/explorar?termo=produto">produto para loja</Link>
              <Link href="/explorar?termo=retrato">retrato</Link>
            </div>

            <div className={styles.perfuracao} aria-hidden="true">
              {Array.from({ length: 16 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className={styles.filme}>
              {PERFIS.map((perfil) => {
                // A moldura já tinha o degradê de multiply por cima; faltava a
                // foto embaixo dele. "Compare portfólios" pede portfólio à vista.
                const capa = photographers.find((a) => a.id === perfil.slug)?.coverPhotoUrl;
                return (
                  <Link key={perfil.slug} className={styles.quadro} href={`/perfil/${perfil.slug}`}>
                    <div className={styles.imagem}>
                      {capa && (
                        <Image
                          src={capa}
                          alt=""
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className={styles.rotulo}>
                      <b>{perfil.nome}</b>
                      <em>{perfil.cidade}</em>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.bloco}>
          <div className={styles.wrap}>
            <h2 className={styles.titulo}>Em destaque</h2>
            <p className={styles.sub}>
              Fotos com licença pronta para uso, direto de quem fotografou.
            </p>
            <PhotoGrid
              photos={fotos ?? []}
              loading={fotos === null}
              favorites={favorites}
              onToggleFavorite={alternarFavorita}
            />
          </div>
        </section>

        <section className={styles.bloco}>
          <div className={styles.wrap}>
            <CategoryGrid categories={categories} />
          </div>
        </section>

        <section className={styles.bloco}>
          <div className={styles.wrap}>
            <PhotographerGrid photographers={photographers} />
          </div>
        </section>

        {/* Sem `.bloco`/`.wrap`: a faixa escura sangra de ponta a ponta e traz
            o próprio contêiner interno. */}
        <ValueSection />

        <section className={styles.bloco} id="categorias">
          <div className={styles.wrap}>
            <h2 className={styles.titulo}>Categorias</h2>
            <p className={styles.sub}>
              Cada foto entra numa especialidade. Clicar aqui abre o acervo já
              filtrado por ela.
            </p>
            {/* A lista vem das categorias derivadas das próprias
                fotos: toda categoria oferecida tem resultado. A lista escrita
                à mão que estava aqui levava para /categorias/{slug}, uma rota
                que nunca existiu. */}
            <div className={styles.categorias}>
              {categories.map((categoria) => (
                <Link
                  key={categoria.slug}
                  href={`/explorar?categoria=${categoria.slug}`}
                >
                  <strong>{categoria.name}</strong>
                  <em>
                    {categoria.photoCount}{' '}
                    {categoria.photoCount === 1 ? 'foto' : 'fotos'}
                  </em>
                </Link>
              ))}
            </div>
          </div>
        </section>


        <section className={styles.bloco} id="sobre">
          <div className={`${styles.wrap} ${styles.sobre}`}>
            <div>
              <h2 className={styles.titulo}>Sobre</h2>
              <p>
                A Revela existe porque contratar fotografia ainda depende de indicação de amigo e
                de perfil perdido no meio do feed. Aqui o portfólio vem primeiro, o preço fica
                visível antes da conversa e o contato vai direto para o fotógrafo.
              </p>
              <p>Não cobramos comissão sobre o trabalho entregue.</p>
            </div>
            {/* Aqui havia "1.940 fotógrafos" e "214 cidades" — números que
                ninguém mediu, num site que ainda roda com catorze fotos de
                demonstração. Trocados por afirmações que o próprio código
                sustenta: a licença única de `lib/license.ts` e a política de
                comissão do parágrafo ao lado. Quando houver número real
                medido, ele volta. */}
            <div className={styles.numeros}>
              <div>
                <b>Uma</b>
                <span>licença para todo uso, sem faixa por finalidade</span>
              </div>
              <div>
                <b>Sempre</b>
                <span>a licença comprada não expira</span>
              </div>
              <div>
                <b>0%</b>
                <span>de comissão sobre o cachê</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
