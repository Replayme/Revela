'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const PERFIS = [
  { slug: 'ana-vilar', nome: 'Ana Vilar', cidade: 'Natal' },
  { slug: 'joao-benicio', nome: 'João Benício', cidade: 'Recife' },
  { slug: 'marina-costa', nome: 'Marina Costa', cidade: 'Parnamirim' },
  { slug: 'rafael-drumond', nome: 'Rafael Drumond', cidade: 'João Pessoa' },
  { slug: 'leticia-sa', nome: 'Letícia Sá', cidade: 'Fortaleza' },
];

const CATEGORIAS = [
  { slug: 'casamento', nome: 'Casamento', total: '412 profissionais' },
  { slug: 'familia', nome: 'Família e infantil', total: '287 profissionais' },
  { slug: 'retrato', nome: 'Retrato', total: '354 profissionais' },
  { slug: 'produto', nome: 'Produto e e-commerce', total: '163 profissionais' },
  { slug: 'gastronomia', nome: 'Gastronomia', total: '91 profissionais' },
  { slug: 'imoveis', nome: 'Arquitetura e imóveis', total: '128 profissionais' },
  { slug: 'eventos', nome: 'Eventos corporativos', total: '205 profissionais' },
  { slug: 'documental', nome: 'Documental e rua', total: '77 profissionais' },
];

const POSTS = [
  {
    slug: 'luz-de-janela',
    data: '28 ago · 6 min',
    titulo: 'Luz de janela: como usar a única fonte que você já tem',
    resumo:
      'Distância, ângulo e um pedaço de papel branco resolvem quase todo ensaio dentro de casa.',
  },
  {
    slug: 'perguntas-antes-do-ensaio',
    data: '21 ago · 4 min',
    titulo: 'Sete perguntas para fazer ao cliente antes do ensaio',
    resumo:
      'A maior parte das reclamações depois da entrega começa numa conversa que não aconteceu.',
  },
  {
    slug: 'montar-pacote',
    data: '14 ago · 9 min',
    titulo: 'Por hora ou por entrega? Como montar seu pacote',
    resumo:
      'Duas formas de cobrar, com planilha de custo por foto tratada para você adaptar.',
  },
];

/**
 * Home do Revela — marketplace de fotógrafos. Substitui o placeholder
 * anterior (adaptado do mockup revela.html enviado para o projeto).
 */
export default function HomePage() {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState('');

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

            <div className={styles.acessos}>
              <Link className={styles.entrar} href="/login">
                Entrar
              </Link>
              <Link className={styles.cta} href="/cadastro-fotografo">
                Cadastre-se como fotógrafo
              </Link>
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
              <li>
                <Link href="/categorias">Categorias</Link>
              </li>
              <li>
                <Link href="/sobre">Sobre</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link> <span className={styles.dica}>dicas de fotografia</span>
              </li>
              <li>
                <Link className={`${styles.cta} ${styles.ctaMovel}`} href="/cadastro-fotografo">
                  Cadastre-se como fotógrafo
                </Link>
              </li>
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
              <Link href="/explorar?t=casamento">casamento</Link>
              <Link href="/explorar?t=gestante">gestante</Link>
              <Link href="/explorar?t=produto">produto para loja</Link>
              <Link href="/explorar?t=formatura">formatura</Link>
            </div>

            <div className={styles.perfuracao} aria-hidden="true">
              {Array.from({ length: 16 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className={styles.filme}>
              {PERFIS.map((perfil) => (
                <Link key={perfil.slug} className={styles.quadro} href={`/perfil/${perfil.slug}`}>
                  <div className={styles.imagem} />
                  <div className={styles.rotulo}>
                    <b>{perfil.nome}</b>
                    <em>{perfil.cidade}</em>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.bloco}>
          <div className={styles.wrap}>
            <h2 className={styles.titulo}>Categorias</h2>
            <p className={styles.sub}>
              Cada fotógrafo escolhe até três especialidades. É por elas que a busca ordena os
              resultados.
            </p>
            <div className={styles.categorias}>
              {CATEGORIAS.map((categoria) => (
                <Link key={categoria.slug} href={`/categorias/${categoria.slug}`}>
                  <strong>{categoria.nome}</strong>
                  <em>{categoria.total}</em>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.bloco}>
          <div className={styles.wrap}>
            <h2 className={styles.titulo}>Do blog</h2>
            <p className={styles.sub}>Textos práticos para quem fotografa e para quem vai contratar.</p>
            <div className={styles.posts}>
              {POSTS.map((post) => (
                <Link key={post.slug} className={styles.post} href={`/blog/${post.slug}`}>
                  <span className={styles.marcaTempo}>{post.data}</span>
                  <h3>{post.titulo}</h3>
                  <p>{post.resumo}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.bloco}>
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
            <div className={styles.numeros}>
              <div>
                <b>1.940</b>
                <span>fotógrafos com portfólio publicado</span>
              </div>
              <div>
                <b>214</b>
                <span>cidades atendidas</span>
              </div>
              <div>
                <b>0%</b>
                <span>de comissão sobre o cachê</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.rodape}>
            <div>
              <h4>Navegar</h4>
              <ul>
                <li>
                  <Link href="/explorar">Explorar</Link>
                </li>
                <li>
                  <Link href="/categorias">Categorias</Link>
                </li>
                <li>
                  <Link href="/blog">Blog</Link>
                </li>
                <li>
                  <Link href="/sobre">Sobre</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Para fotógrafos</h4>
              <ul>
                <li>
                  <Link href="/cadastro-fotografo">Criar perfil</Link>
                </li>
                <li>
                  <Link href="/precos">Planos</Link>
                </li>
                <li>
                  <Link href="/ajuda">Central de ajuda</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Contato</h4>
              <ul>
                <li>
                  <a href="mailto:oi@revela.com.br">oi@revela.com.br</a>
                </li>
                <li>
                  <Link href="/imprensa">Imprensa</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                <li>
                  <Link href="/termos">Termos de uso</Link>
                </li>
                <li>
                  <Link href="/privacidade">Privacidade</Link>
                </li>
                <li>
                  <Link href="/direitos">Direitos de imagem</Link>
                </li>
              </ul>
            </div>
          </div>
          <p className={styles.creditos}>
            Revela · Natal, RN · As fotos exibidas pertencem aos seus autores.
          </p>
        </div>
      </footer>
    </div>
  );
}
