'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, translate, type MessageKey } from '@/lib/i18n';

/**
 * O idioma da interface — hoje, um só.
 *
 * **O alternador PT/EN saiu da tela, e este provedor deixou de trocar de
 * idioma junto.** O motivo é o mesmo que já tinha tirado daqui a detecção pelo
 * navegador: só o header, as telas de acesso e este formulário estão
 * traduzidos. Home, acervo, ficha da foto, perfil, recibo, licença e o painel
 * de quem vende são texto fixo em português.
 *
 * Escolher "EN" entregava, então, um header em inglês sobre um site em
 * português. Da primeira vez isso foi tratado como aceitável porque a escolha
 * era manual — a pessoa tinha pedido. Não era: ninguém que clica em "EN" está
 * pedindo o cabeçalho em inglês, está pedindo o site. Um controle que não
 * entrega o que promete é o mesmo caso do botão de favoritar que anunciava
 * estado e não mudava nada, e a regra que vale para ele vale para este.
 *
 * **Nada da tradução foi jogado fora.** `lib/i18n.ts` continua com as duas
 * línguas e as chaves de sempre, e `t()` segue sendo por onde o texto do header
 * e das telas de acesso passa — é o começo do trabalho, não um resto dele.
 * Quando o conteúdo estiver traduzido, voltam três coisas: o estado do idioma
 * aqui, o `<LanguageSwitcher />` no header, e a detecção pelo navegador.
 */

interface LocaleContextValue {
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

// Valor constante e fora do componente: sem idioma para trocar, um `useMemo`
// aqui dentro seria cerimônia em volta de um objeto que nunca muda.
const FIXED: LocaleContextValue = {
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <LocaleContext.Provider value={FIXED}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale precisa estar dentro de <LocaleProvider>');
  }
  return context;
}
