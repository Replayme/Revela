'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconCheck, IconLock } from './icons';
import { formatPrice } from '@/lib/format';

type Estado = 'idle' | 'loading' | 'owned' | 'error';

export function BuyButton({
  photoId,
  price,
  isSignedIn,
  orderId: orderIdInicial = null,
}: {
  photoId: string;
  price: number;
  isSignedIn: boolean;
  orderId?: string | null;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(
    orderIdInicial ? 'owned' : 'idle',
  );
  const [orderId, setOrderId] = useState<string | null>(orderIdInicial);

  if (!isSignedIn) {
    return (
      <div>
        <Link
          href={`/login?next=${encodeURIComponent(`/foto/${photoId}`)}`}
          className="block w-full bg-amber px-6 py-4 text-center text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
        >
          Entrar para comprar
        </Link>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-paper-300">
          <IconLock width={13} height={13} className="mt-0.5 shrink-0" />
          <span>
            A licença é emitida no nome de quem compra, então a compra precisa
            de uma conta.{' '}
            <Link
              href={`/cadastro-fotografo?next=${encodeURIComponent(`/foto/${photoId}`)}`}
              className="font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
            >
              Criar conta
            </Link>
          </span>
        </p>
      </div>
    );
  }

  if (estado === 'owned') {
    return (
      <div className="border-2 border-signal-ok/40 bg-signal-ok/10 px-5 py-4">
        <p className="flex items-center gap-2 font-medium text-paper">
          <IconCheck width={16} height={16} className="text-signal-ok" />
          Licença emitida no seu nome
        </p>
        <p className="mt-2 text-sm text-paper-300">
          Esta foto já é sua, para sempre. Comprar de novo não emite outra
          licença nem cobra outra vez.
        </p>
        {orderId && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-signal-ok/25 pt-3.5">
            <a
              href={`/api/pedidos/${orderId}/arquivo`}
              className="text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:text-amber-light"
            >
              Baixar arquivo
            </a>
            <Link
              href={`/pedido/${orderId}`}
              className="text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-paper"
            >
              Recibo e licença
            </Link>
          </div>
        )}
      </div>
    );
  }

  async function comprar() {
    setEstado('loading');
    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/foto/${photoId}`)}`);
        return;
      }
      if (!response.ok) {
        setEstado('error');
        return;
      }
      const data = (await response.json()) as { order?: { id?: string } };
      setOrderId(data.order?.id ?? null);
      setEstado('owned');
      router.refresh();
    } catch {
      setEstado('error');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={comprar}
        disabled={estado === 'loading'}
        aria-busy={estado === 'loading'}
        className="w-full bg-amber px-6 py-4 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light disabled:opacity-70"
      >
        {estado === 'loading'
          ? 'Emitindo licença…'
          : `Comprar por ${formatPrice(price)}`}
      </button>

      {estado === 'error' && (
        <p role="alert" className="mt-3 text-sm text-signal-error">
          Não foi possível emitir a licença. Tente novamente.
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-paper-500">
        Demonstração: o pedido é registrado com o preço e a versão da licença,
        mas ainda não há cobrança.
      </p>
    </div>
  );
}
