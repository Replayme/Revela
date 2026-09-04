'use client';

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { IconAlert, IconCheck, IconEye, IconEyeOff } from './icons';
import { useLocale } from './locale-provider';
import { scorePassword } from '@/lib/validation';

/* ------------------------------- campo base ------------------------------- */

/**
 * Em que fundo o campo está.
 *
 * As telas de acesso são um cartão claro; o painel da conta é fundo prussiano.
 * O campo é o mesmo — mesma marcação, mesmo `aria`, mesmo espaço reservado
 * para a mensagem — e só a paleta muda. Uma segunda cópia do campo para o
 * painel divergiria desta no dia em que uma delas ganhasse um conserto de
 * acessibilidade.
 */
type Tone = 'light' | 'dark';

const TONE = {
  light: {
    label: 'text-prussia-600',
    shell: 'bg-paper-50',
    idle: 'border-prussia-800/25 focus-within:border-prussia-700',
    input: 'text-prussia-900 placeholder:text-paper-400',
    hint: 'text-prussia-600/80',
  },
  dark: {
    label: 'text-paper-500',
    shell: 'bg-prussia-900/70',
    idle: 'border-paper/20 focus-within:border-amber',
    input: 'text-paper placeholder:text-paper-500',
    hint: 'text-paper-400',
  },
} as const satisfies Record<Tone, Record<string, string>>;

interface BaseFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  /** Mensagem de erro já traduzida. `null` quando não há erro. */
  error?: string | null;
  /** Mensagem de sucesso já traduzida, mostrada quando o campo está válido. */
  success?: string | null;
  hint?: string;
  trailing?: ReactNode;
  tone?: Tone;
  /** React 19 aceita `ref` como prop normal em componentes de função. */
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  success,
  hint,
  trailing,
  tone = 'light',
  id,
  ...inputProps
}: BaseFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hintId = `${fieldId}-hint`;
  const palette = TONE[tone];

  const state = error ? 'error' : success ? 'ok' : 'idle';

  const border =
    state === 'error'
      ? 'border-signal-error'
      : state === 'ok'
        ? 'border-signal-ok/70'
        : palette.idle;

  return (
    <div>
      <label
        htmlFor={fieldId}
        className={`mb-1.5 block text-[11px] font-semibold tracking-[0.16em] uppercase ${palette.label}`}
      >
        {label}
      </label>

      <div
        className={`flex items-stretch border transition-colors ${palette.shell} ${border}`}
      >
        <input
          id={fieldId}
          aria-invalid={state === 'error'}
          aria-describedby={`${messageId}${hint ? ` ${hintId}` : ''}`}
          className={`min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base focus:outline-none disabled:opacity-60 ${palette.input}`}
          {...inputProps}
        />

        <span className="flex items-center gap-1 pr-2.5">
          {state === 'error' && (
            <IconAlert width={17} height={17} className="text-signal-error" />
          )}
          {state === 'ok' && (
            <IconCheck width={17} height={17} className="text-signal-ok" />
          )}
          {trailing}
        </span>
      </div>

      {hint && (
        <p id={hintId} className={`mt-1.5 text-xs ${palette.hint}`}>
          {hint}
        </p>
      )}

      {/* Espaço reservado: a mensagem entra sem empurrar o formulário. */}
      <p
        id={messageId}
        role={state === 'error' ? 'alert' : undefined}
        className={`mt-1.5 min-h-[1.15rem] text-xs ${
          state === 'error'
            ? 'text-signal-error'
            : state === 'ok'
              ? 'text-signal-ok'
              : 'text-transparent'
        }`}
      >
        {error ?? success ?? ' '}
      </p>
    </div>
  );
}

/* ---------------------------- campo de senha ------------------------------ */

export function PasswordField({
  showStrength = false,
  ...props
}: BaseFieldProps & { showStrength?: boolean }) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const value = typeof props.value === 'string' ? props.value : '';

  return (
    <div>
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-pressed={visible}
            aria-label={t(visible ? 'login.hidePassword' : 'login.showPassword')}
            title={t(visible ? 'login.hidePassword' : 'login.showPassword')}
            className="grid h-8 w-8 place-items-center text-prussia-600 transition-colors hover:text-prussia-900"
          >
            {visible ? (
              <IconEyeOff width={17} height={17} />
            ) : (
              <IconEye width={17} height={17} />
            )}
          </button>
        }
      />
      {/* Com erro em cena, o medidor sai: uma mensagem por vez. */}
      {showStrength && value.length > 0 && !props.error && (
        <StrengthMeter value={value} />
      )}
    </div>
  );
}

/* ------------------------- medidor de força da senha ---------------------- */

export function StrengthMeter({ value }: { value: string }) {
  const { t } = useLocale();
  const { level, labelKey } = scorePassword(value);

  const color =
    level >= 3
      ? 'bg-signal-ok'
      : level === 2
        ? 'bg-amber-deep'
        : 'bg-signal-error';

  const textColor =
    level >= 3
      ? 'text-signal-ok'
      : level === 2
        ? 'text-amber-deep'
        : 'text-signal-error';

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={`h-[3px] flex-1 transition-colors ${
                level >= step ? color : 'bg-prussia-800/15'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${textColor}`}
        >
          {t(labelKey)}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {t('strength.label')}: {t(labelKey)}
      </p>
      {level < 3 && (
        <p className="mt-1 text-[11px] text-prussia-600/80">
          {t('strength.hint')}
        </p>
      )}
    </div>
  );
}

/* -------------------------------- checkbox -------------------------------- */

export function Checkbox({
  label,
  hint,
  id,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  /**
   * Aceita conteúdo, não só texto: o aceite dos termos precisa dos links
   * dentro da frase. Clicar num link dentro de um `<label>` navega em vez de
   * marcar a caixa — a especificação isenta conteúdo interativo.
   */
  label: ReactNode;
  hint?: string;
  /** React 19 aceita `ref` como prop normal em componentes de função. */
  ref?: Ref<HTMLInputElement>;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={fieldId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-prussia-800/35 bg-paper-50 checked:border-prussia-800 checked:bg-prussia-800 checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23E9EBE6%22 stroke-width=%222.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M3 8.5 6.2 11.7 13 4.9%22/></svg>')] checked:bg-center checked:bg-no-repeat"
        {...inputProps}
      />
      <label htmlFor={fieldId} className="cursor-pointer text-sm leading-tight">
        <span className="text-prussia-900">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] text-prussia-600/80">
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}

/* --------------------------------- alerta --------------------------------- */

export function Alert({
  tone,
  children,
  shake = false,
}: {
  tone: 'error' | 'success';
  children: ReactNode;
  shake?: boolean;
}) {
  const isError = tone === 'error';
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`anim-reveal flex items-start gap-2.5 border-l-[3px] px-3.5 py-3 text-sm ${
        isError
          ? 'border-signal-error bg-signal-error-soft text-signal-error'
          : 'border-signal-ok bg-signal-ok-soft text-signal-ok'
      } ${shake ? 'anim-shake' : ''}`}
    >
      {isError ? (
        <IconAlert width={17} height={17} className="mt-0.5 shrink-0" />
      ) : (
        <IconCheck width={17} height={17} className="mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------ botão primário ---------------------------- */

export function SubmitButton({
  loading,
  loadingLabel,
  children,
  disabled,
}: {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className="group relative w-full overflow-hidden bg-amber px-5 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-colors hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="flex items-center justify-center gap-2.5">
        {loading && (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-prussia-950/30 border-t-prussia-950"
          />
        )}
        {loading ? loadingLabel : children}
      </span>
      {loading && (
        <span aria-hidden className="anim-develop absolute inset-x-0 bottom-0 h-[3px]" />
      )}
      {/* deslocamento de luz no hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
    </button>
  );
}
