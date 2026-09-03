'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/* ------------------------------------------------------------------
   Tokens visuais — um único lugar pra ajustar a identidade
------------------------------------------------------------------ */
const t = {
  canvas: '#EEF0F2',
  surface: '#FFFFFF',
  ink: '#12151A',
  muted: '#697280',
  line: '#DCE0E5',
  accent: '#C8102E',
  accentSoft: '#FCEAED',
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ------------------------------------------------------------------
   Vocabulário dos filtros
------------------------------------------------------------------ */
const CATEGORIAS = [
  'Natureza', 'Negócios', 'Viagens', 'Pessoas', 'Comida',
  'Tecnologia', 'Arquitetura', 'Esportes', 'Abstrato',
];

const CORES = [
  { id: 'vermelho', nome: 'Vermelho', hex: '#D93025' },
  { id: 'laranja', nome: 'Laranja', hex: '#E8710A' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#F2C230' },
  { id: 'verde', nome: 'Verde', hex: '#1E8E3E' },
  { id: 'azul', nome: 'Azul', hex: '#1A73E8' },
  { id: 'roxo', nome: 'Roxo', hex: '#7B3FA0' },
  { id: 'rosa', nome: 'Rosa', hex: '#E255A1' },
  { id: 'marrom', nome: 'Marrom', hex: '#8B5E3C' },
  { id: 'preto', nome: 'Preto', hex: '#1B1B1B' },
  { id: 'branco', nome: 'Branco', hex: '#F5F5F5' },
];

const ORIENTACOES = [
  { id: 'horizontal', nome: 'Horizontal', w: 20, h: 13 },
  { id: 'vertical', nome: 'Vertical', w: 13, h: 20 },
  { id: 'quadrada', nome: 'Quadrada', w: 16, h: 16 },
];

// larguraMin em pixels — casa com o campo `largura` do acervo
const RESOLUCOES = [
  { id: 'hd', nome: 'HD', detalhe: 'a partir de 1280px', larguraMin: 1280 },
  { id: 'fullhd', nome: 'Full HD', detalhe: 'a partir de 1920px', larguraMin: 1920 },
  { id: '2k', nome: '2K', detalhe: 'a partir de 2560px', larguraMin: 2560 },
  { id: '4k', nome: '4K ou maior', detalhe: 'a partir de 3840px', larguraMin: 3840 },
];

const ORDENACOES = [
  { id: 'relevancia', nome: 'Mais relevantes' },
  { id: 'recentes', nome: 'Mais recentes' },
  { id: 'downloads', nome: 'Mais baixadas' },
  { id: 'preco_asc', nome: 'Menor preço' },
];

const PRECO_MAX = 200;

const FILTROS_INICIAIS = {
  termo: '',
  categorias: [],
  cores: [],
  orientacoes: [],
  resolucao: null,
  precoMax: PRECO_MAX,
  somenteGratis: false,
  ordenar: 'relevancia',
};

/* ------------------------------------------------------------------
   Acervo de exemplo — troque por dados da API
------------------------------------------------------------------ */
const TAMANHOS = [
  { largura: 1280, altura: 853 }, { largura: 1920, altura: 1280 },
  { largura: 2560, altura: 1707 }, { largura: 4096, altura: 2731 },
  { largura: 1280, altura: 1920 }, { largura: 2000, altura: 2000 },
];

const ACERVO = Array.from({ length: 36 }, (_, i) => {
  const base = TAMANHOS[i % TAMANHOS.length];
  const vertical = i % 5 === 0;
  const largura = vertical ? base.altura : base.largura;
  const altura = vertical ? base.largura : base.altura;
  const cor = CORES[i % CORES.length];
  const gratis = i % 7 === 0;
  return {
    id: i + 1,
    titulo: `${CATEGORIAS[i % CATEGORIAS.length]} ${String(i + 1).padStart(3, '0')}`,
    categoria: CATEGORIAS[i % CATEGORIAS.length],
    cor: cor.id,
    hex: cor.hex,
    largura,
    altura,
    orientacao: largura === altura ? 'quadrada' : largura > altura ? 'horizontal' : 'vertical',
    preco: gratis ? 0 : 15 + ((i * 13) % 160),
    downloads: (i * 137) % 4000,
    criadoEm: 2026 - (i % 4),
    tags: [CATEGORIAS[i % CATEGORIAS.length].toLowerCase(), cor.nome.toLowerCase(), 'foto'],
  };
});

/* ------------------------------------------------------------------
   Lógica de busca
------------------------------------------------------------------ */
function useDebounce(valor, ms = 300) {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return debounced;
}

const normalizar = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// É isso que você manda pro backend: GET /api/fotos?termo=...&categorias=...
export function montarQuery(f, pagina = 1) {
  const p = new URLSearchParams();
  if (f.termo.trim()) p.set('termo', f.termo.trim());
  if (f.categorias.length) p.set('categorias', f.categorias.join(','));
  if (f.cores.length) p.set('cores', f.cores.join(','));
  if (f.orientacoes.length) p.set('orientacoes', f.orientacoes.join(','));
  if (f.resolucao) p.set('larguraMin', String(f.resolucao.larguraMin));
  if (f.somenteGratis) p.set('gratis', '1');
  else if (f.precoMax < PRECO_MAX) p.set('precoMax', String(f.precoMax));
  if (f.ordenar !== 'relevancia') p.set('ordenar', f.ordenar);
  p.set('pagina', String(pagina));
  return p.toString();
}

// Filtro local — espelha o que o backend deve fazer
function aplicarFiltros(itens, f) {
  const termo = normalizar(f.termo);
  let out = itens.filter((it) => {
    if (termo) {
      const alvo = normalizar(`${it.titulo} ${it.categoria} ${it.tags.join(' ')}`);
      if (!termo.split(/\s+/).every((palavra) => alvo.includes(palavra))) return false;
    }
    if (f.categorias.length && !f.categorias.includes(it.categoria)) return false;
    if (f.cores.length && !f.cores.includes(it.cor)) return false;
    if (f.orientacoes.length && !f.orientacoes.includes(it.orientacao)) return false;
    if (f.resolucao && it.largura < f.resolucao.larguraMin) return false;
    if (f.somenteGratis) return it.preco === 0;
    if (it.preco > f.precoMax) return false;
    return true;
  });

  const ordem = {
    recentes: (a, b) => b.criadoEm - a.criadoEm,
    downloads: (a, b) => b.downloads - a.downloads,
    preco_asc: (a, b) => a.preco - b.preco,
  }[f.ordenar];
  if (ordem) out = [...out].sort(ordem);
  return out;
}

const precoFmt = (v) =>
  v === 0 ? 'Grátis' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ------------------------------------------------------------------
   Peças de UI
------------------------------------------------------------------ */
function Grupo({ titulo, children, aberto = true }) {
  const [open, setOpen] = useState(aberto);
  return (
    <section style={{ borderTop: `1px solid ${t.line}`, padding: '18px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between"
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: t.ink }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{titulo}</span>
        <span style={{ color: t.muted, fontSize: 18, lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Chip({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        fontSize: 13,
        padding: '7px 13px',
        borderRadius: 999,
        cursor: 'pointer',
        color: ativo ? t.accent : t.ink,
        background: ativo ? t.accentSoft : t.surface,
        border: `1px solid ${ativo ? t.accent : t.line}`,
        fontWeight: ativo ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
   Componente principal
------------------------------------------------------------------ */
export default function BuscaFiltros() {
  const searchParams = useSearchParams();
  const termoInicial = searchParams.get('termo') ?? '';
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIAIS, termo: termoInicial });
  const [rascunho, setRascunho] = useState(termoInicial);
  const [painelAberto, setPainelAberto] = useState(false);
  const termoDebounced = useDebounce(rascunho, 300);
  const inputRef = useRef(null);

  useEffect(() => {
    setFiltros((f) => (f.termo === termoDebounced ? f : { ...f, termo: termoDebounced }));
  }, [termoDebounced]);

  const set = (patch) => setFiltros((f) => ({ ...f, ...patch }));
  const alternar = (campo, valor) =>
    setFiltros((f) => ({
      ...f,
      [campo]: f[campo].includes(valor)
        ? f[campo].filter((v) => v !== valor)
        : [...f[campo], valor],
    }));

  const resultados = useMemo(() => aplicarFiltros(ACERVO, filtros), [filtros]);

  // Quando plugar na API, é aqui que a chamada acontece:
  // useEffect(() => { fetch(`/api/fotos?${montarQuery(filtros)}`)... }, [filtros]);

  const ativos = [
    ...filtros.categorias.map((v) => ({ rotulo: v, remover: () => alternar('categorias', v) })),
    ...filtros.cores.map((id) => ({
      rotulo: CORES.find((c) => c.id === id).nome,
      remover: () => alternar('cores', id),
    })),
    ...filtros.orientacoes.map((id) => ({
      rotulo: ORIENTACOES.find((o) => o.id === id).nome,
      remover: () => alternar('orientacoes', id),
    })),
    ...(filtros.resolucao
      ? [{ rotulo: filtros.resolucao.nome, remover: () => set({ resolucao: null }) }]
      : []),
    ...(filtros.somenteGratis
      ? [{ rotulo: 'Grátis', remover: () => set({ somenteGratis: false }) }]
      : filtros.precoMax < PRECO_MAX
      ? [{ rotulo: `Até ${precoFmt(filtros.precoMax)}`, remover: () => set({ precoMax: PRECO_MAX }) }]
      : []),
  ];

  const limparTudo = () => {
    setRascunho('');
    setFiltros(FILTROS_INICIAIS);
  };

  return (
    <div style={{ background: t.canvas, color: t.ink, fontFamily: t.font, minHeight: '100%' }}>
      <div className="mx-auto px-5 py-10" style={{ maxWidth: 1180 }}>
        {/* Busca */}
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          Encontre a imagem certa
        </h1>
        <p style={{ color: t.muted, fontSize: 15, margin: '8px 0 22px' }}>
          {ACERVO.length} fotos no acervo. Busque por assunto ou refine pelos filtros.
        </p>

        <div
          className="flex items-center gap-3"
          style={{
            background: t.surface,
            border: `1px solid ${t.line}`,
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <span aria-hidden style={{ color: t.muted }}>⌕</span>
          <input
            ref={inputRef}
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setRascunho('')}
            placeholder="praia ao amanhecer, reunião de equipe, café..."
            aria-label="Buscar imagens por palavra-chave"
            className="flex-1"
            style={{ border: 0, outline: 'none', fontSize: 16, color: t.ink, background: 'transparent' }}
          />
          {rascunho && (
            <button
              onClick={() => { setRascunho(''); inputRef.current?.focus(); }}
              aria-label="Limpar busca"
              style={{ border: 0, background: 'none', color: t.muted, cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Sugestões rápidas */}
        <div className="mt-3 flex flex-wrap gap-2">
          {['praia', 'escritório', 'comida', 'montanha', 'startup'].map((s) => (
            <button
              key={s}
              onClick={() => setRascunho(s)}
              style={{
                fontSize: 13, color: t.muted, background: 'none',
                border: 0, cursor: 'pointer', textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-8" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* Painel de filtros */}
          <aside style={{ flex: '1 1 240px', maxWidth: 280 }}>
            <button
              onClick={() => setPainelAberto((v) => !v)}
              className="mb-2"
              style={{
                fontSize: 14, fontWeight: 600, background: 'none', border: 0,
                padding: 0, cursor: 'pointer', color: t.ink,
              }}
            >
              Filtros {ativos.length > 0 && `(${ativos.length})`}
            </button>

            <div style={{ display: 'block' }} hidden={false}>
              <Grupo titulo="Categoria">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((c) => (
                    <Chip key={c} ativo={filtros.categorias.includes(c)} onClick={() => alternar('categorias', c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </Grupo>

              <Grupo titulo="Cor dominante">
                <div className="flex flex-wrap gap-2">
                  {CORES.map((c) => {
                    const ativo = filtros.cores.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => alternar('cores', c.id)}
                        title={c.nome}
                        aria-label={c.nome}
                        aria-pressed={ativo}
                        style={{
                          width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                          background: c.hex,
                          border: ativo ? `2px solid ${t.ink}` : `1px solid ${t.line}`,
                          outline: ativo ? `2px solid ${t.surface}` : 'none',
                          outlineOffset: -4,
                        }}
                      />
                    );
                  })}
                </div>
              </Grupo>

              <Grupo titulo="Orientação">
                <div className="flex gap-2">
                  {ORIENTACOES.map((o) => {
                    const ativo = filtros.orientacoes.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => alternar('orientacoes', o.id)}
                        aria-pressed={ativo}
                        className="flex flex-col items-center gap-2"
                        style={{
                          flex: 1, padding: '12px 6px', borderRadius: 8, cursor: 'pointer',
                          background: ativo ? t.accentSoft : t.surface,
                          border: `1px solid ${ativo ? t.accent : t.line}`,
                          color: ativo ? t.accent : t.muted, fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            display: 'block', width: o.w, height: o.h,
                            border: `2px solid ${ativo ? t.accent : t.muted}`, borderRadius: 2,
                          }}
                        />
                        {o.nome}
                      </button>
                    );
                  })}
                </div>
              </Grupo>

              <Grupo titulo="Resolução">
                <div className="flex flex-col gap-2">
                  {RESOLUCOES.map((r) => {
                    const ativo = filtros.resolucao?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => set({ resolucao: ativo ? null : r })}
                        aria-pressed={ativo}
                        className="flex items-baseline justify-between"
                        style={{
                          padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                          background: ativo ? t.accentSoft : t.surface,
                          border: `1px solid ${ativo ? t.accent : t.line}`,
                          color: ativo ? t.accent : t.ink, fontSize: 13,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{r.nome}</span>
                        <span style={{ color: ativo ? t.accent : t.muted, fontSize: 12 }}>{r.detalhe}</span>
                      </button>
                    );
                  })}
                </div>
              </Grupo>

              <Grupo titulo="Preço">
                <label className="flex items-center gap-2" style={{ fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filtros.somenteGratis}
                    onChange={(e) => set({ somenteGratis: e.target.checked })}
                  />
                  Apenas imagens grátis
                </label>
                <div className="mt-4" style={{ opacity: filtros.somenteGratis ? 0.4 : 1 }}>
                  <div className="flex justify-between" style={{ fontSize: 13, color: t.muted }}>
                    <span>Até</span>
                    <span style={{ color: t.ink, fontWeight: 600 }}>
                      {filtros.precoMax >= PRECO_MAX ? 'Qualquer valor' : precoFmt(filtros.precoMax)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={PRECO_MAX}
                    step={5}
                    disabled={filtros.somenteGratis}
                    value={filtros.precoMax}
                    onChange={(e) => set({ precoMax: Number(e.target.value) })}
                    aria-label="Preço máximo"
                    style={{ width: '100%', marginTop: 8, accentColor: t.accent }}
                  />
                </div>
              </Grupo>
            </div>
          </aside>

          {/* Resultados */}
          <main style={{ flex: '3 1 480px' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p style={{ fontSize: 14, color: t.muted, margin: 0 }}>
                <strong style={{ color: t.ink }}>{resultados.length}</strong>{' '}
                {resultados.length === 1 ? 'imagem encontrada' : 'imagens encontradas'}
              </p>
              <select
                value={filtros.ordenar}
                onChange={(e) => set({ ordenar: e.target.value })}
                aria-label="Ordenar resultados"
                style={{
                  fontSize: 13, padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${t.line}`, background: t.surface, color: t.ink,
                }}
              >
                {ORDENACOES.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>

            {(ativos.length > 0 || filtros.termo) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {filtros.termo && (
                  <span style={{ fontSize: 13, color: t.muted }}>"{filtros.termo}"</span>
                )}
                {ativos.map((a) => (
                  <button
                    key={a.rotulo}
                    onClick={a.remover}
                    style={{
                      fontSize: 12, padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                      background: t.surface, border: `1px solid ${t.line}`, color: t.ink,
                    }}
                  >
                    {a.rotulo} ×
                  </button>
                ))}
                <button
                  onClick={limparTudo}
                  style={{
                    fontSize: 12, color: t.accent, background: 'none', border: 0,
                    cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
                  }}
                >
                  Limpar tudo
                </button>
              </div>
            )}

            {resultados.length === 0 ? (
              <div
                className="mt-6 text-center"
                style={{ background: t.surface, border: `1px dashed ${t.line}`, borderRadius: 12, padding: '56px 24px' }}
              >
                <p style={{ fontWeight: 600, margin: 0 }}>Nenhuma imagem com esses filtros.</p>
                <p style={{ color: t.muted, fontSize: 14, margin: '6px 0 16px' }}>
                  Remova a cor ou a resolução mínima para ampliar o resultado.
                </p>
                <button
                  onClick={limparTudo}
                  style={{
                    background: t.ink, color: '#fff', border: 0, borderRadius: 8,
                    padding: '10px 18px', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div
                className="mt-5"
                style={{
                  display: 'grid',
                  gap: 14,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                }}
              >
                {resultados.map((f) => (
                  <article
                    key={f.id}
                    style={{
                      background: t.surface, border: `1px solid ${t.line}`,
                      borderRadius: 10, overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: `${f.largura} / ${f.altura}`,
                        background: `linear-gradient(150deg, ${f.hex} 0%, ${f.hex}66 100%)`,
                      }}
                    />
                    <div style={{ padding: '10px 12px 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{f.titulo}</p>
                      <p style={{ fontSize: 12, color: t.muted, margin: '3px 0 0' }}>
                        {f.largura} × {f.altura}
                      </p>
                      <p
                        style={{
                          fontSize: 13, margin: '8px 0 0', fontWeight: 600,
                          color: f.preco === 0 ? '#1E8E3E' : t.ink,
                        }}
                      >
                        {precoFmt(f.preco)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
