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

/**
 * A foto vista pelo autor — a outra face do `PhotoCard`.
 *
 * O card do acervo é uma vitrine: fotograma, preço, favoritar. Este é uma
 * ficha de trabalho, e por isso é uma linha e não um quadro — quem administra
 * trinta fotos precisa varrer a lista, não admirar cada uma. Mesma proporção e
 * mesmo espaçamento da lista de licenças do `/dashboard`, para as duas telas
 * do painel se lerem como uma só.
 *
 * **Cada ação só aparece se alguém a atende.** É a regra que o botão de
 * favoritar já segue no card do acervo: um controle que anuncia estado e não
 * muda nada ao clique é pior que controle nenhum. Enquanto não houver
 * `PATCH /api/fotos/{id}`, esta lista abre sem os botões — e a tela continua
 * verdadeira.
 */
export function PhotographerPhotoCard({
  photo,
  editHref,
  onToggleStatus,
  onDelete,
  busy = false,
}: {
  photo: PhotographerPhoto;
  /** Sem endereço de edição, o lápis não entra. */
  editHref?: string;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Trava as ações enquanto a alteração anterior não voltou do servidor. */
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
            {/*
              O título leva ao acervo só quando a foto está lá. Rascunho não tem
              página pública: o link daria 404 no próprio painel de quem
              escreveu a foto.
            */}
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

        {/*
          A régua de baixo só entra se houver o que pôr nela. Enquanto as
          rotas do painel não existem, nenhuma ação é passada — e uma linha
          divisória sobre o vazio anuncia um rodapé que não há.
        */}
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

/**
 * Remover em dois toques, sem `window.confirm`.
 *
 * O diálogo nativo interrompe a página inteira e não tem a voz do site — mas o
 * motivo de ele não servir aqui é outro: apagar uma foto que já vendeu não
 * apaga as licenças emitidas, e essa frase precisa caber na pergunta. No
 * diálogo do navegador, não cabe.
 *
 * O foco vai para o botão de confirmar quando a pergunta aparece, senão quem
 * navega por teclado continua no botão que acabou de sumir.
 */
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

/**
 * Mesma estrutura da ficha, sem conteúdo — é o que evita o salto de layout
 * quando a lista chega.
 */
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
