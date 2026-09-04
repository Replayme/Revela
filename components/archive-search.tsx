'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PhotoGrid } from './photo-grid';
import { useFavorites } from './use-favorites';
import { IconSearch } from './icons';
import { mockPhotos, type Photo } from '@/lib/mock-photos';
import { mockCategories, slugify } from '@/lib/mock-categories';
import { formatPrice } from '@/lib/format';

/**
 * A busca do acervo.
 *
 * Os filtros são os que o modelo do Revela tem de verdade: categoria,
 * orientação, teto de preço e ordenação. A versão anterior desta tela filtrava
 * por cor dominante, por resolução e por "grátis" — três coisas que não
 * existem aqui. O acervo tem preço único por arquivo e uma licença só; um
 * filtro que promete uma faceta inexistente é pior que filtro nenhum.
 *
 * O estado mora na URL, não no componente: `/explorar?termo=praia&categoria=
 * retrato` é uma busca que se manda por mensagem e que volta pelo botão de
 * voltar do navegador. É por isso que a home consegue linkar direto para uma
 * busca pronta.
 */

type Ordenacao = 'relevancia' | 'preco-asc' | 'preco-desc' | 'avaliacao';

const ORDENACOES: { id: Ordenacao; nome: string }[] = [
  { id: 'relevancia', nome: 'Mais relevantes' },
  { id: 'avaliacao', nome: 'Melhor avaliadas' },
  { id: 'preco-asc', nome: 'Menor preço' },
  { id: 'preco-desc', nome: 'Maior preço' },
];

const ORIENTACOES: { id: Photo['orientation']; nome: string }[] = [
  { id: 'horizontal', nome: 'Horizontal' },
  { id: 'vertical', nome: 'Vertical' },
];

/** Teto do controle de preço: a foto mais cara do acervo, arredondada pra cima. */
const PRECO_MAX = Math.ceil(Math.max(...mockPhotos.map((p) => p.price)) / 10) * 10;

const normalizar = (valor: string) =>
  valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * Casa todas as palavras da busca, em qualquer ordem, contra título, autor e
 * categoria. "praia ana" acha a foto da Ana na praia; a busca por substring
 * inteira não achava.
 */
function combina(photo: Photo, termo: string): boolean {
  if (!termo) return true;
  const alvo = normalizar(
    `${photo.title} ${photo.photographer.name} ${photo.category}`,
  );
  return normalizar(termo)
    .split(/\s+/)
    .every((palavra) => alvo.includes(palavra));
}

export function ArchiveSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const { favorites, toggle: alternarFavorita } = useFavorites();

  const termo = params.get('termo') ?? '';
  const categoria = params.get('categoria') ?? '';
  const orientacao = params.get('orientacao') ?? '';
  const ordenar = (params.get('ordenar') ?? 'relevancia') as Ordenacao;
  const precoMax = Number(params.get('precoMax')) || PRECO_MAX;

  // O campo é controlado localmente e só empurra para a URL depois da pausa:
  // uma entrada no histórico por tecla digitada tornaria o botão de voltar
  // inútil.
  const [rascunho, setRascunho] = useState(termo);
  const campoRef = useRef<HTMLInputElement>(null);

  const atualizar = useCallback(
    (mudancas: Record<string, string | null>) => {
      const proximo = new URLSearchParams(params.toString());
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === null || valor === '') proximo.delete(chave);
        else proximo.set(chave, valor);
      }
      const query = proximo.toString();
      router.replace(query ? `/explorar?${query}` : '/explorar', {
        scroll: false,
      });
    },
    [params, router],
  );

  // A URL pode mudar por fora (link da home, botão de voltar): o campo
  // acompanha, mas não enquanto a pessoa está digitando nele.
  useEffect(() => {
    if (document.activeElement !== campoRef.current) setRascunho(termo);
  }, [termo]);

  useEffect(() => {
    if (rascunho === termo) return;
    const id = setTimeout(() => atualizar({ termo: rascunho }), 300);
    return () => clearTimeout(id);
  }, [rascunho, termo, atualizar]);

  const resultados = useMemo(() => {
    const filtradas = mockPhotos.filter(
      (photo) =>
        combina(photo, termo) &&
        (!categoria || slugify(photo.category) === categoria) &&
        (!orientacao || photo.orientation === orientacao) &&
        photo.price <= precoMax,
    );

    // `toSorted` deixaria `filtradas` intacta, mas ela já é uma cópia do
    // `filter` — ordenar no lugar não toca no acervo.
    switch (ordenar) {
      case 'preco-asc':
        return filtradas.sort((a, b) => a.price - b.price);
      case 'preco-desc':
        return filtradas.sort((a, b) => b.price - a.price);
      case 'avaliacao':
        return filtradas.sort((a, b) => b.rating - a.rating);
      default:
        return filtradas;
    }
  }, [termo, categoria, orientacao, precoMax, ordenar]);

  const filtrando =
    Boolean(termo || categoria || orientacao) || precoMax < PRECO_MAX;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <h1 className="font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
        O acervo
      </h1>
      <p className="mt-3 max-w-[56ch] text-paper-300">
        {mockPhotos.length} fotos de fotógrafos independentes. Todas saem com a
        mesma licença — uso ilimitado, para sempre. O que muda é o preço do
        arquivo.
      </p>

      <div className="mt-8 flex min-w-0 items-stretch">
        <label htmlFor="busca-acervo" className="sr-only">
          Buscar no acervo
        </label>
        <div className="relative flex min-w-0 flex-1">
          <IconSearch
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-paper-500"
          />
          <input
            id="busca-acervo"
            ref={campoRef}
            type="search"
            value={rascunho}
            onChange={(event) => setRascunho(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setRascunho('');
            }}
            placeholder="Praia, retrato, feira, Ana Vilar…"
            className="w-full min-w-0 rounded-none border border-paper/20 bg-prussia-900/70 py-3 pr-3 pl-10 text-paper placeholder:text-paper-500 focus:border-amber focus:outline-none sm:py-3.5"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <Filtros
          categoria={categoria}
          orientacao={orientacao}
          precoMax={precoMax}
          filtrando={filtrando}
          aoMudar={atualizar}
          aoLimpar={() => {
            setRascunho('');
            router.replace('/explorar', { scroll: false });
          }}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper/12 pb-4">
            {/* `aria-live`: quem navega por leitor de tela precisa saber que a
                contagem mudou depois de mexer num filtro. */}
            <p aria-live="polite" className="text-sm text-paper-300">
              <strong className="font-mono font-semibold text-paper tabular-nums">
                {resultados.length}
              </strong>{' '}
              {resultados.length === 1 ? 'foto encontrada' : 'fotos encontradas'}
            </p>

            <label className="flex items-center gap-2.5 text-[11px] font-medium tracking-[0.16em] text-paper-500 uppercase">
              Ordenar
              <select
                value={ordenar}
                onChange={(event) => atualizar({ ordenar: event.target.value })}
                className="rounded-none border border-paper/20 bg-prussia-900 px-3 py-2 text-xs font-normal tracking-normal text-paper normal-case focus:border-amber focus:outline-none"
              >
                {ORDENACOES.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-7">
            <PhotoGrid
              photos={resultados}
              favorites={favorites}
              onToggleFavorite={alternarFavorita}
              tone="dark"
              layout="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Filtros({
  categoria,
  orientacao,
  precoMax,
  filtrando,
  aoMudar,
  aoLimpar,
}: {
  categoria: string;
  orientacao: string;
  precoMax: number;
  filtrando: boolean;
  aoMudar: (mudancas: Record<string, string | null>) => void;
  aoLimpar: () => void;
}) {
  return (
    // No celular os filtros ficam recolhidos: numa tela estreita eles
    // empurrariam as fotos para baixo da dobra, e é a foto que a pessoa veio ver.
    <details className="group border border-paper/12 lg:border-0 [&>summary]:lg:hidden [&:not([open])>div]:lg:block">
      <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold tracking-[0.16em] text-paper uppercase marker:content-none">
        Filtros
        <span aria-hidden className="float-right text-paper-500 group-open:hidden">
          +
        </span>
        <span aria-hidden className="float-right hidden text-paper-500 group-open:inline">
          −
        </span>
      </summary>

      <div className="border-t border-paper/12 px-4 py-5 lg:border-0 lg:px-0 lg:py-0">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
            Filtros
          </h2>
          {filtrando && (
            <button
              type="button"
              onClick={aoLimpar}
              className="text-[11px] font-medium tracking-[0.14em] text-amber uppercase transition-colors hover:text-amber-light"
            >
              Limpar
            </button>
          )}
        </div>

        <Secao titulo="Categoria">
          <ul className="grid gap-1.5">
            <li>
              <Opcao
                ativa={!categoria}
                onClick={() => aoMudar({ categoria: null })}
              >
                Todas
              </Opcao>
            </li>
            {mockCategories.map((item) => (
              <li key={item.slug}>
                <Opcao
                  ativa={categoria === item.slug}
                  onClick={() =>
                    aoMudar({
                      categoria: categoria === item.slug ? null : item.slug,
                    })
                  }
                >
                  {item.name}
                  <span className="ml-auto pl-3 font-mono text-[11px] text-paper-500 tabular-nums">
                    {item.photoCount}
                  </span>
                </Opcao>
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Orientação">
          <div className="flex flex-wrap gap-2">
            {ORIENTACOES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={orientacao === item.id}
                onClick={() =>
                  aoMudar({
                    orientacao: orientacao === item.id ? null : item.id,
                  })
                }
                className={`border px-3 py-1.5 text-xs transition-colors ${
                  orientacao === item.id
                    ? 'border-amber bg-amber/15 text-paper'
                    : 'border-paper/20 text-paper-300 hover:border-paper/40 hover:text-paper'
                }`}
              >
                {item.nome}
              </button>
            ))}
          </div>
        </Secao>

        <Secao titulo="Preço até">
          <input
            type="range"
            min={10}
            max={PRECO_MAX}
            step={10}
            value={precoMax}
            onChange={(event) =>
              aoMudar({
                precoMax:
                  Number(event.target.value) >= PRECO_MAX
                    ? null
                    : event.target.value,
              })
            }
            aria-label={`Preço máximo: ${formatPrice(precoMax)}`}
            className="w-full accent-[var(--color-amber)]"
          />
          <p className="mt-2 font-mono text-sm text-paper tabular-nums">
            {formatPrice(precoMax)}
            {precoMax >= PRECO_MAX && (
              <span className="ml-2 font-sans text-xs text-paper-500">
                (tudo)
              </span>
            )}
          </p>
        </Secao>
      </div>
    </details>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 border-t border-paper/12 pt-5">
      <h3 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
        {titulo}
      </h3>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Opcao({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={`flex w-full items-center border-l-2 py-1.5 pr-1 pl-3 text-left text-sm transition-colors ${
        ativa
          ? 'border-amber font-medium text-paper'
          : 'border-transparent text-paper-300 hover:border-paper/30 hover:text-paper'
      }`}
    >
      {children}
    </button>
  );
}
