'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconPencil, IconStar, IconTrash } from './icons';
import { formatCount, formatDate, formatPrice, formatRating } from '@/lib/format';
import {
  STATUS_CLASS,
  STATUS_LABEL,
  type PhotographerPhoto,
} from '@/lib/photographer-panel';

export function PhotographerPhotoCard({
  photo,
  editHref,
  onToggleStatus,
  onDelete,
  busy = false,
}: {
  photo: PhotographerPhoto;
  editHref?: string;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  busy?: boolean;
}) {
  return (
    <article className="grid grid-cols-[88px_1fr] gap-4 border border-paper/12 bg-prussia-950/50 p-3 transition-colors hover:border-amber/40 sm:grid-cols-[132px_1fr] sm:gap-6 sm:p-4">
      <div className="relative aspect-[4/3] overflow-hidden bg-prussia-800">
        <Image
          src={photo.thumbnailUrl}
          alt=""
          fill
          sizes="132px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h3 className="font-serif text-lg leading-snug font-medium text-paper">
            {photo.status === 'publicada' ? (
              <Link
                href={`/foto/${photo.id}`}
                className="transition-colors hover:text-amber"
              >
                {photo.title}
              </Link>
            ) : (
              photo.title
            )}
          </h3>
          <StatusBadge status={photo.status} />
        </div>

        <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-paper-500 uppercase">
          {photo.category}
          <span aria-hidden> · </span>
          {formatPrice(photo.price)}
          <span aria-hidden> · </span>
          {photo.width}×{photo.height}
        </p>

        <p className="mt-2 text-sm text-paper-300">
          {photo.sales === 0 ? (
            'Nenhuma licença emitida ainda'
          ) : (
            <>
              {formatCount(photo.sales)}{' '}
              {photo.sales === 1 ? 'licença' : 'licenças'}
              <span aria-hidden> · </span>
              <span className="font-mono tabular-nums text-paper">
                {formatPrice(photo.revenue)}
              </span>
            </>
          )}
          {photo.sales > 0 && photo.rating > 0 && (
            <span className="ml-3 inline-flex items-center gap-1.5 tabular-nums text-paper-400">
              {formatRating(photo.rating)}
              <IconStar width={12} height={12} />
            </span>
          )}
        </p>

        {(photo.updatedAt || editHref || onToggleStatus || onDelete) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper/10 pt-3">
          {photo.updatedAt && (
            <span className="font-mono text-[11px] tracking-[0.12em] text-paper-500 uppercase">
              {formatDate(photo.updatedAt)}
            </span>
          )}

          {editHref && (
            <Link
              href={editHref}
              className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-paper"
            >
              <IconPencil width={14} height={14} />
              Editar
            </Link>
          )}

          {onToggleStatus && photo.status !== 'em-analise' && (
            <button
              type="button"
              onClick={() => onToggleStatus(photo.id)}
              disabled={busy}
              className="text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:text-amber-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {photo.status === 'publicada' ? 'Despublicar' : 'Publicar'}
            </button>
          )}

          {onDelete && (
            <DeleteAction photo={photo} onDelete={onDelete} busy={busy} />
          )}
        </div>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: PhotographerPhoto['status'] }) {
  return (
    <span
      className={`shrink-0 border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function DeleteAction({
  photo,
  onDelete,
  busy,
}: {
  photo: PhotographerPhoto;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy}
        className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-signal-error disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IconTrash width={14} height={14} />
        Remover
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span role="alert" className="text-[11px] text-paper-300">
        Tirar “{photo.title}” do acervo?
        {photo.sales > 0 && ' As licenças já emitidas continuam valendo.'}
      </span>
      <button
        ref={confirmRef}
        type="button"
        onClick={() => onDelete(photo.id)}
        disabled={busy}
        className="text-[11px] font-semibold tracking-[0.16em] text-signal-error uppercase transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Remover
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
      >
        Cancelar
      </button>
    </span>
  );
}

export function PhotographerPhotoCardSkeleton() {
  return (
    <div
      className="grid animate-pulse grid-cols-[88px_1fr] gap-4 border border-paper/12 bg-prussia-950/50 p-3 motion-reduce:animate-none sm:grid-cols-[132px_1fr] sm:gap-6 sm:p-4"
      aria-hidden
    >
      <div className="aspect-[4/3] bg-paper/10" />
      <div className="flex min-w-0 flex-col">
        <div className="h-5 w-3/5 bg-paper/10" />
        <div className="mt-3 h-3 w-2/5 bg-paper/8" />
        <div className="mt-3 h-3.5 w-1/3 bg-paper/8" />
        <div className="mt-auto h-3 w-1/2 border-t border-paper/10 pt-3" />
      </div>
    </div>
  );
}
