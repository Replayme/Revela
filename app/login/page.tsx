'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
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
import { IconMail } from '@/components/icons';
import type { MessageKey } from '@/lib/i18n';
import { validateEmail, validatePassword } from '@/lib/validation';

type ServerError = { key: MessageKey; vars?: Record<string, string | number> };

function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const [touched, setTouched] = useState({ email: false, password: false });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailErrorKey = validateEmail(email);
  const passwordErrorKey = validatePassword(password);
  const emailValid = !emailErrorKey && email.length > 0;

  useEffect(() => {
    if (!blockedUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [blockedUntil]);

  const remainingMs = blockedUntil ? blockedUntil - now : 0;
  const blocked = remainingMs > 0;

  useEffect(() => {
    if (blockedUntil && remainingMs <= 0) {
      setBlockedUntil(null);
      setServerError(null);
    }
  }, [blockedUntil, remainingMs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'loading' || blocked) return;

    setTouched({ email: true, password: true });
    setServerError(null);

    if (emailErrorKey) {
      emailRef.current?.focus();
      return;
    }
    if (passwordErrorKey) {
      passwordRef.current?.focus();
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          router.push(next ?? data.redirectTo ?? '/dashboard');
        }, 900);
        return;
      }

      setStatus('idle');

      if (response.status === 429) {
        const seconds: number = data.retryAfterSeconds ?? 600;
        setBlockedUntil(Date.now() + seconds * 1000);
        setNow(Date.now());
        setAttemptsLeft(null);
        setServerError({
          key: data.error === 'IP_BLOCKED' ? 'error.IP_BLOCKED' : 'error.RATE_LIMITED',
          vars: { minutes: Math.max(1, Math.ceil(seconds / 60)) },
        });
        return;
      }

      setAttemptsLeft(
        typeof data.attemptsLeft === 'number' ? data.attemptsLeft : null,
      );

      const map: Record<string, MessageKey> = {
        EMAIL_NOT_FOUND: 'error.EMAIL_NOT_FOUND',
        INVALID_PASSWORD: 'error.INVALID_PASSWORD',
        INVALID_CREDENTIALS: 'error.INVALID_CREDENTIALS',
        ACCOUNT_DISABLED: 'error.ACCOUNT_DISABLED',
      };
      setServerError({ key: map[data.error] ?? 'error.UNKNOWN' });

      if (data.error === 'EMAIL_NOT_FOUND') emailRef.current?.focus();
      if (data.error === 'INVALID_PASSWORD') passwordRef.current?.select();
    } catch {
      setStatus('idle');
      setServerError({ key: 'error.NETWORK' });
    }
  }

  const countdown = formatCountdown(remainingMs);

  return (
    <AuthShell>
      <FilmFrame frameNumber="12A" className="anim-reveal">
        <div className="px-5 py-8 sm:px-10 sm:py-11">
          <p className="font-mono text-[10px] tracking-[0.24em] text-prussia-600 uppercase">
            {t('login.eyebrow')}
          </p>
          <h2 className="mt-2.5 font-serif text-[clamp(1.6rem,3.4vw,2.15rem)] leading-tight font-medium tracking-[-0.015em] text-prussia-900">
            {t('login.title')}
          </h2>
          <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-prussia-700/85">
            {t('login.subtitle')}
          </p>

          <div className="my-6 h-px bg-prussia-800/12" />

          {status === 'success' && (
            <div className="mb-5">
              <Alert tone="success">{t('login.success')}</Alert>
            </div>
          )}

          {serverError && status !== 'success' && (
            <div className="mb-5">
              <Alert tone="error" shake>
                <p className="font-medium">{t(serverError.key, serverError.vars)}</p>
                {blocked && (
                  <p className="mt-1 font-mono text-xs tabular-nums opacity-80">
                    {countdown}
                  </p>
                )}
                {!blocked && attemptsLeft !== null && attemptsLeft <= 2 && (
                  <p className="mt-1 text-xs opacity-80">
                    {t('error.attemptsLeft', { count: attemptsLeft })}
                  </p>
                )}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} method="post" noValidate>
            <TextField
              ref={emailRef}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              label={t('login.email')}
              placeholder={t('login.emailPlaceholder')}
              value={email}
              disabled={status !== 'idle'}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() =>
                email &&
                setTouched((prev) => ({ ...prev, email: true }))
              }
              error={
                touched.email && emailErrorKey ? t(emailErrorKey) : null
              }
              success={
                touched.email && emailValid ? t('validation.emailValid') : null
              }
            />

            <PasswordField
              ref={passwordRef}
              name="password"
              autoComplete="current-password"
              required
              showStrength
              label={t('login.password')}
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              disabled={status !== 'idle'}
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

            <div className="mt-1 mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <Checkbox
                name="remember"
                checked={remember}
                disabled={status !== 'idle'}
                onChange={(event) => setRemember(event.target.checked)}
                label={t('login.remember')}
                hint={t('login.rememberHint')}
              />
              <Link
                href="/esqueci-senha"
                className="text-sm font-medium text-prussia-700 underline decoration-amber decoration-2 underline-offset-4 transition-colors hover:text-prussia-900"
              >
                {t('login.forgot')}
              </Link>
            </div>

            <SubmitButton
              loading={status === 'loading'}
              loadingLabel={t('login.submitting')}
              disabled={blocked || status === 'success'}
            >
              {blocked ? t('login.wait', { time: countdown }) : t('login.submit')}
            </SubmitButton>
          </form>

          <div className="mt-7 border-t border-prussia-800/12 pt-5">
            <p className="text-sm text-prussia-700/85">
              {t('login.noAccount')}{' '}
              <Link
                href="/cadastro-fotografo"
                className="font-semibold text-prussia-900 underline decoration-amber decoration-2 underline-offset-4"
              >
                {t('login.createAccount')}
              </Link>
            </p>
            <p className="mt-4 flex items-start gap-2 bg-prussia-800/6 px-3 py-2.5 text-[11px] leading-relaxed text-prussia-600">
              <IconMail width={13} height={13} className="mt-0.5 shrink-0" />
              {t('login.demoHint')}
            </p>
          </div>
        </div>
      </FilmFrame>
    </AuthShell>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
