'use client';

import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from '@/lib/i18n';
import { useLocale } from './locale-provider';
import { IconGlobe } from './icons';

/**
 * Seletor de idioma como alternador segmentado — cabe no celular e não esconde
 * a opção atrás de um clique. Com mais de três idiomas, troque por um menu.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className="inline-flex items-center gap-1.5 text-paper-500"
    >
      <IconGlobe width={14} height={14} aria-hidden />
      <div className="flex items-center border border-paper/20">
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={active}
              title={LOCALE_LABELS[code]}
              onClick={() => setLocale(code)}
              className={`px-2 py-1 text-[11px] font-semibold tracking-[0.1em] transition-colors ${
                active
                  ? 'bg-paper/90 text-prussia-950'
                  : 'text-paper-300 hover:text-amber'
              }`}
            >
              {LOCALE_SHORT[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
