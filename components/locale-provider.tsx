'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  translate,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';

const STORAGE_KEY = 'revela.locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Começa sempre no padrão para que servidor e cliente rendam igual;
  // a preferência salva é aplicada logo depois da hidratação.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && (LOCALES as readonly string[]).includes(saved)) {
        setLocaleState(saved as Locale);
        return;
      }
    } catch {
      /* localStorage indisponível (modo privado): segue com o padrão */
    }
    const browser = navigator.language.slice(0, 2);
    if ((LOCALES as readonly string[]).includes(browser)) {
      setLocaleState(browser as Locale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preferência não persiste, mas a troca funciona nesta sessão */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale precisa estar dentro de <LocaleProvider>');
  }
  return context;
}
