'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale } from './locale-provider';

export function LogoutButton() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
      className="border border-amber/60 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:bg-amber hover:text-prussia-950 disabled:opacity-60"
    >
      {t('dashboard.logout')}
    </button>
  );
}
