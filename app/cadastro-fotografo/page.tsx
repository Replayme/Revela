'use client';

import { Fragment, Suspense, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { FilmFrame } from '@/components/film-frame';
import {
  Alert,
  Checkbox,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/form';
import { useLocale } from '@/components/locale-provider';
import { IconLock } from '@/components/icons';
import type { MessageKey } from '@/lib/i18n';
import {
  validateConfirmation,
  validateEmail,
  validateName,
  validatePassword,
} from '@/lib/validation';

type ServerError = { key: MessageKey; vars?: Record<string, string | number> };

/** Só caminhos internos: `next` com host próprio viraria trampolim de phishing. */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** `useSearchParams` precisa de um limite de Suspense para a página prerenderizar. */
export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const { t } = useLocale();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Um campo só mostra erro depois que a pessoa saiu dele (ou tentou enviar).
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirm: false,
    terms: false,
  });

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'pending'
  >('idle');
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const nameErrorKey = validateName(name);
  const emailErrorKey = validateEmail(email);
  const passwordErrorKey = validatePassword(password);
  const confirmErrorKey = validateConfirmation(password, confirmation);

  const busy = status !== 'idle';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setTouched({
      name: true,
      email: true,
      password: true,
      confirm: true,
      terms: true,
    });
    setServerError(null);

    // Foco no primeiro campo que precisa de correção, na ordem da tela.
    if (nameErrorKey) return nameRef.current?.focus();
    if (emailErrorKey) return emailRef.current?.focus();
    if (passwordErrorKey) return passwordRef.current?.focus();
    if (confirmErrorKey) return confirmRef.current?.focus();
    if (!acceptedTerms) return termsRef.current?.focus();

    setStatus('loading');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          passwordConfirmation: confirmation,
          acceptedTerms,
        }),
      });

      const data = await response.json().catch(() => ({}));

      // 202: modo sem enumeração — a resposta é a mesma com ou sem conta.
      if (response.status === 202) {
        setStatus('pending');
        return;
      }

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          router.push(next ?? data.redirectTo ?? '/dashboard');
        }, 900);
        return;
      }

      setStatus('idle');

      if (response.status === 429) {
        const seconds: number = data.retryAfterSeconds ?? 900;
        setServerError({
          key: data.error === 'IP_BLOCKED' ? 'error.IP_BLOCKED' : 'error.RATE_LIMITED',
          vars: { minutes: Math.max(1, Math.ceil(seconds / 60)) },
        });
        return;
      }

      const map: Record<string, MessageKey> = {
        EMAIL_TAKEN: 'error.EMAIL_TAKEN',
        VALIDATION: 'error.UNKNOWN',
      };
      setServerError({ key: map[data.error] ?? 'error.UNKNOWN' });

      if (data.error === 'EMAIL_TAKEN') emailRef.current?.select();
    } catch {
      setStatus('idle');
      setServerError({ key: 'error.NETWORK' });
    }
  }

  return (
    <AuthShell>
      <FilmFrame frameNumber="11A" className="anim-reveal">
        <div className="px-5 py-8 sm:px-10 sm:py-11">
          <p className="font-mono text-[10px] tracking-[0.24em] text-prussia-600 uppercase">
            {t('signup.eyebrow')}
          </p>
          <h2 className="mt-2.5 font-serif text-[clamp(1.6rem,3.4vw,2.15rem)] leading-tight font-medium tracking-[-0.015em] text-prussia-900">
            {status === 'pending' ? t('signup.pending') : t('signup.title')}
          </h2>

          {status !== 'pending' && (
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-prussia-700/85">
              {t('signup.subtitle')}
            </p>
          )}

          <div className="my-6 h-px bg-prussia-800/12" />

          {status === 'pending' ? (
            <div className="space-y-5">
              <Alert tone="success">
                {t('forgot.sentBody', { email: email.trim() })}
              </Alert>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-prussia-800 underline decoration-amber decoration-2 underline-offset-4"
              >
                {t('signup.signIn')}
              </Link>
            </div>
          ) : (
            <>
              {status === 'success' && (
                <div className="mb-5">
                  <Alert tone="success">{t('signup.success')}</Alert>
                </div>
              )}

              {serverError && status !== 'success' && (
                <div className="mb-5">
                  <Alert tone="error" shake>
                    <p className="font-medium">
                      {t(serverError.key, serverError.vars)}
                    </p>
                    {serverError.key === 'error.EMAIL_TAKEN' && (
                      <p className="mt-1.5 text-xs">
                        <Link
                          href="/login"
                          className="font-semibold underline decoration-2 underline-offset-4"
                        >
                          {t('signup.signIn')}
                        </Link>
                        {' · '}
                        <Link
                          href="/esqueci-senha"
                          className="font-semibold underline decoration-2 underline-offset-4"
                        >
                          {t('login.forgot')}
                        </Link>
                      </p>
                    )}
                  </Alert>
                </div>
              )}

              {/* method="post" é a rede de segurança: se o JavaScript ainda não
                  hidratou quando a pessoa aperta Criar conta, o navegador faz
                  um envio nativo — e num GET a senha iria parar na URL. */}
              <form onSubmit={handleSubmit} method="post" noValidate>
                <TextField
                  ref={nameRef}
                  name="name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  required
                  label={t('signup.name')}
                  placeholder={t('signup.namePlaceholder')}
                  hint={t('signup.nameHint')}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() =>
                    name && setTouched((prev) => ({ ...prev, name: true }))
                  }
                  error={touched.name && nameErrorKey ? t(nameErrorKey) : null}
                />

                <TextField
                  ref={emailRef}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  label={t('login.email')}
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() =>
                    email && setTouched((prev) => ({ ...prev, email: true }))
                  }
                  error={
                    touched.email && emailErrorKey ? t(emailErrorKey) : null
                  }
                  success={
                    touched.email && !emailErrorKey
                      ? t('validation.emailValid')
                      : null
                  }
                />

                <PasswordField
                  ref={passwordRef}
                  name="new-password"
                  autoComplete="new-password"
                  required
                  showStrength
                  label={t('signup.password')}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() =>
                    password &&
                    setTouched((prev) => ({ ...prev, password: true }))
                  }
                  error={
                    touched.password && passwordErrorKey
                      ? t(passwordErrorKey)
                      : null
                  }
                />

                <PasswordField
                  ref={confirmRef}
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  label={t('signup.confirm')}
                  placeholder={t('login.passwordPlaceholder')}
                  value={confirmation}
                  disabled={busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                  onBlur={() =>
                    confirmation &&
                    setTouched((prev) => ({ ...prev, confirm: true }))
                  }
                  error={
                    touched.confirm && confirmErrorKey
                      ? t(confirmErrorKey)
                      : null
                  }
                  success={
                    touched.confirm && !confirmErrorKey && confirmation
                      ? t('field.valid')
                      : null
                  }
                />

                <div className="mt-1 mb-6">
                  <Checkbox
                    ref={termsRef}
                    name="terms"
                    checked={acceptedTerms}
                    disabled={busy}
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      setTouched((prev) => ({ ...prev, terms: true }));
                    }}
                    aria-invalid={touched.terms && !acceptedTerms}
                    label={<TermsLabel />}
                  />
                  {touched.terms && !acceptedTerms && (
                    <p
                      role="alert"
                      className="mt-2 text-xs text-signal-error"
                    >
                      {t('signup.termsRequired')}
                    </p>
                  )}
                </div>

                <SubmitButton
                  loading={status === 'loading'}
                  loadingLabel={t('signup.submitting')}
                  disabled={status === 'success'}
                >
                  {t('signup.submit')}
                </SubmitButton>
              </form>

              <div className="mt-7 border-t border-prussia-800/12 pt-5">
                <p className="text-sm text-prussia-700/85">
                  {t('signup.haveAccount')}{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-prussia-900 underline decoration-amber decoration-2 underline-offset-4"
                  >
                    {t('signup.signIn')}
                  </Link>
                </p>
                <p className="mt-4 flex items-start gap-2 bg-prussia-800/6 px-3 py-2.5 text-[11px] leading-relaxed text-prussia-600">
                  <IconLock width={13} height={13} className="mt-0.5 shrink-0" />
                  {t('signup.secure')}
                </p>
              </div>
            </>
          )}
        </div>
      </FilmFrame>
    </AuthShell>
  );
}

/**
 * A frase do aceite muda de ordem entre os idiomas, então os links entram nos
 * marcadores `{terms}` e `{privacy}` do texto traduzido em vez de serem
 * concatenados em volta dele.
 */
function TermsLabel() {
  const { t } = useLocale();
  const partes = t('signup.terms').split(/(\{terms\}|\{privacy\})/);

  return (
    <>
      {partes.map((parte, indice) => {
        if (parte === '{terms}') {
          return (
            <Link
              key={indice}
              href="/termos"
              className="font-medium underline decoration-amber decoration-2 underline-offset-4"
            >
              {t('signup.termsLink')}
            </Link>
          );
        }
        if (parte === '{privacy}') {
          return (
            <Link
              key={indice}
              href="/privacidade"
              className="font-medium underline decoration-amber decoration-2 underline-offset-4"
            >
              {t('signup.privacyLink')}
            </Link>
          );
        }
        return <Fragment key={indice}>{parte}</Fragment>;
      })}
    </>
  );
}
