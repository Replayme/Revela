'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { FilmFrame } from '@/components/film-frame';
import { Alert, SubmitButton, TextField } from '@/components/form';
import { useLocale } from '@/components/locale-provider';
import { IconArrowLeft } from '@/components/icons';
import type { MessageKey } from '@/lib/i18n';
import { validateEmail } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const { t } = useLocale();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const emailErrorKey = validateEmail(email);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setErrorKey(null);

    if (emailErrorKey) {
      emailRef.current?.focus();
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus('idle');
        setErrorKey(
          response.status === 429 ? 'error.RATE_LIMITED' : 'error.UNKNOWN',
        );
        return;
      }

      setDevResetUrl(data.devResetUrl ?? null);
      setStatus('sent');
    } catch {
      setStatus('idle');
      setErrorKey('error.NETWORK');
    }
  }

  return (
    <AuthShell>
      <FilmFrame frameNumber="13A" className="anim-reveal">
        <div className="px-5 py-8 sm:px-10 sm:py-11">
          <p className="font-mono text-[10px] tracking-[0.24em] text-prussia-600 uppercase">
            {t('forgot.eyebrow')}
          </p>
          <h2 className="mt-2.5 font-serif text-[clamp(1.6rem,3.4vw,2.15rem)] leading-tight font-medium tracking-[-0.015em] text-prussia-900">
            {status === 'sent' ? t('forgot.sentTitle') : t('forgot.title')}
          </h2>

          <div className="my-6 h-px bg-prussia-800/12" />

          {status === 'sent' ? (
            <div className="space-y-5">
              <Alert tone="success">
                {t('forgot.sentBody', { email: email.trim() })}
              </Alert>

              {devResetUrl && (
                <div className="border border-dashed border-prussia-800/30 bg-prussia-800/5 px-4 py-3">
                  <p className="text-[11px] tracking-wide text-prussia-600 uppercase">
                    {t('forgot.devLink')}
                  </p>
                  <Link
                    href={devResetUrl}
                    className="mt-1.5 block font-mono text-xs break-all text-prussia-800 underline decoration-amber decoration-2 underline-offset-4"
                  >
                    {devResetUrl}
                  </Link>
                </div>
              )}

              <BackLink label={t('forgot.back')} />
            </div>
          ) : (
            <>
              <p className="mb-6 max-w-[46ch] text-sm leading-relaxed text-prussia-700/85">
                {t('forgot.subtitle')}
              </p>

              {errorKey && (
                <div className="mb-5">
                  <Alert tone="error" shake>
                    {t(errorKey, { minutes: 15 })}
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
                  disabled={status === 'loading'}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => email && setTouched(true)}
                  error={touched && emailErrorKey ? t(emailErrorKey) : null}
                  success={
                    touched && !emailErrorKey && email
                      ? t('validation.emailValid')
                      : null
                  }
                />

                <SubmitButton
                  loading={status === 'loading'}
                  loadingLabel={t('forgot.submitting')}
                >
                  {t('forgot.submit')}
                </SubmitButton>
              </form>

              <div className="mt-7 border-t border-prussia-800/12 pt-5">
                <BackLink label={t('forgot.back')} />
              </div>
            </>
          )}
        </div>
      </FilmFrame>
    </AuthShell>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 text-sm font-medium text-prussia-700 transition-colors hover:text-prussia-900"
    >
      <IconArrowLeft width={15} height={15} />
      {label}
    </Link>
  );
}
