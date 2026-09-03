'use client';

import { Suspense, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { FilmFrame } from '@/components/film-frame';
import { Alert, PasswordField, SubmitButton } from '@/components/form';
import { useLocale } from '@/components/locale-provider';
import type { MessageKey } from '@/lib/i18n';
import { validateConfirmation, validatePassword } from '@/lib/validation';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const { t } = useLocale();
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const passwordErrorKey = validatePassword(password);
  const confirmErrorKey = validateConfirmation(password, confirmation);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ password: true, confirm: true });
    setErrorKey(null);

    if (passwordErrorKey) return passwordRef.current?.focus();
    if (confirmErrorKey) return confirmRef.current?.focus();

    setStatus('loading');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmation }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus('idle');
        const map: Record<string, MessageKey> = {
          TOKEN_INVALID: 'error.TOKEN_INVALID',
          TOKEN_EXPIRED: 'error.TOKEN_EXPIRED',
        };
        setErrorKey(map[data.error] ?? 'error.UNKNOWN');
        return;
      }

      setStatus('done');
    } catch {
      setStatus('idle');
      setErrorKey('error.NETWORK');
    }
  }

  return (
    <AuthShell>
      <FilmFrame frameNumber="14A" className="anim-reveal">
        <div className="px-5 py-8 sm:px-10 sm:py-11">
          <p className="font-mono text-[10px] tracking-[0.24em] text-prussia-600 uppercase">
            {t('reset.eyebrow')}
          </p>
          <h2 className="mt-2.5 font-serif text-[clamp(1.6rem,3.4vw,2.15rem)] leading-tight font-medium tracking-[-0.015em] text-prussia-900">
            {status === 'done' ? t('reset.doneTitle') : t('reset.title')}
          </h2>

          <div className="my-6 h-px bg-prussia-800/12" />

          {status === 'done' ? (
            <div className="space-y-6">
              <Alert tone="success">{t('reset.doneBody')}</Alert>
              <Link
                href="/login"
                className="inline-block bg-amber px-5 py-3 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-colors hover:bg-amber-light"
              >
                {t('reset.goLogin')}
              </Link>
            </div>
          ) : !token ? (
            <div className="space-y-6">
              <Alert tone="error">{t('reset.missingToken')}</Alert>
              <Link
                href="/esqueci-senha"
                className="inline-block bg-amber px-5 py-3 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-colors hover:bg-amber-light"
              >
                {t('forgot.submit')}
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm leading-relaxed text-prussia-700/85">
                {t('reset.subtitle')}
              </p>

              {errorKey && (
                <div className="mb-5">
                  <Alert tone="error" shake>
                    {t(errorKey)}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} method="post" noValidate>
                <PasswordField
                  ref={passwordRef}
                  name="new-password"
                  autoComplete="new-password"
                  required
                  showStrength
                  autoFocus
                  label={t('reset.password')}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  disabled={status === 'loading'}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() =>
                    password && setTouched((prev) => ({ ...prev, password: true }))
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
                  label={t('reset.confirm')}
                  placeholder={t('login.passwordPlaceholder')}
                  value={confirmation}
                  disabled={status === 'loading'}
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

                <SubmitButton
                  loading={status === 'loading'}
                  loadingLabel={t('reset.submitting')}
                >
                  {t('reset.submit')}
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </FilmFrame>
    </AuthShell>
  );
}
