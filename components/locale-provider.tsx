'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, translate, type MessageKey } from '@/lib/i18n';

interface LocaleContextValue {
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

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
