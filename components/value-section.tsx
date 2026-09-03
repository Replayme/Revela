'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconChat, IconLicense, IconPercent, IconShield } from './icons';

const DIFERENCIAIS = [
  {
    Icone: IconPercent,
    titulo: 'Taxa menor',
    descricao:
      '85% do valor de cada venda vai para quem fotografou. O resto paga a plataforma, e só.',
    // O diferencial que sustenta os outros três: marcado com um filete âmbar,
    // como os números da seção "Sobre". Um marcador, não enfeite.
    destaque: true,
  },
  {
    Icone: IconShield,
    titulo: 'Pagamento seguro',
    descricao:
      'Compra processada em ambiente cifrado e repasse na sua conta no ciclo seguinte.',
    destaque: false,
  },
  {
    Icone: IconLicense,
    titulo: 'Licenças flexíveis',
    descricao:
      'Pessoal, comercial ou editorial: o uso permitido é você quem define, foto a foto.',
    destaque: false,
  },
  {
    Icone: IconChat,
    titulo: 'Suporte rápido',
    descricao:
      'Dúvida de licença, repasse ou envio? Resposta de gente, em até um dia útil.',
    destaque: false,
  },
];

/**
 * Fecho da home: por que publicar aqui, e o convite para criar conta.
 *
 * Fundo escuro de propósito. As seções acima são papel, e a virada para o azul
 * separa o bloco sem precisar de borda nem sombra — de quebra, é o contraste em
 * que o âmbar do botão rende mais. Sobre esse fundo, o texto secundário sai em
 * `paper-300`, não em `prussia-600`: azul escuro sobre azul escuro não se lê.
 */
export function ValueSection() {
  const { ref, animar } = useRevelarNaViewport<HTMLElement>();

  return (
    <section ref={ref} className="tex-cyanotype bg-prussia-900 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <h2 className="font-serif text-[2rem] leading-tight font-normal tracking-[-0.01em] text-paper">
          Por que vender no Revela
        </h2>
        <p className="mt-2 max-w-[58ch] text-paper-300">
          Você publica, define a licença e recebe. A plataforma fica com o
          mínimo para se manter de pé.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DIFERENCIAIS.map(({ Icone, titulo, descricao, destaque }, index) => (
            <li
              key={titulo}
              className={`border-t-2 pt-5 ${
                destaque ? 'border-amber' : 'border-paper/12'
              } ${animar ? 'anim-reveal' : ''}`}
              style={animar ? { animationDelay: `${index * 60}ms` } : undefined}
            >
              <Icone
                width={22}
                height={22}
                className={destaque ? 'text-paper' : 'text-paper-500'}
              />
              <h3 className="mt-3.5 font-serif text-lg leading-tight font-medium text-paper">
                {titulo}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-300">
                {descricao}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-col gap-5 border-t border-paper/12 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-xl leading-tight text-paper">
            Comece a vender suas fotos hoje.
          </p>
          <Link
            href="/cadastro-fotografo"
            // Só o fundo faz transição: `transition-colors` incluiria
            // `outline-color`, e aí o anel de foco entraria desbotando em vez
            // de aparecer inteiro na hora.
            className="inline-block shrink-0 bg-amber px-6 py-3.5 text-center text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
          >
            Criar conta de fotógrafo
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Marca o momento de animar a entrada — a seção fica no fim da página, então
 * animar na montagem seria animar fora da tela, sem ninguém ver.
 *
 * Antes de disparar, os itens ficam visíveis: se o JavaScript não rodar, a
 * seção continua legível em vez de sumir esperando um observador que não veio.
 */
function useRevelarNaViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof IntersectionObserver === 'undefined') return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setAnimar(true);
        observador.disconnect();
      },
      // Dispara um pouco antes da seção aparecer: a animação começa do zero em
      // vez de piscar por cima de conteúdo que já estava à vista.
      { rootMargin: '0px 0px 120px 0px' },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return { ref, animar };
}
