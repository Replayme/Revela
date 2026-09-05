import type { ReactNode } from 'react';

export function FilmFrame({
  children,
  edgeCode = 'REVELA 400',
  frameNumber = '12A',
  markings = true,
  className = '',
}: {
  children: ReactNode;
  edgeCode?: string;
  frameNumber?: string;
  markings?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`relative flex flex-col bg-prussia-950 shadow-[0_28px_60px_-24px_rgba(3,10,18,0.85)] ${className}`}
    >
      <Perforation side="left" />
      <Perforation side="right" />

      <div className="mx-5 flex flex-1 flex-col border-x border-prussia-800/25 sm:mx-9">
        {markings ? (
          <div className="flex items-center justify-between px-5 py-1.5 font-mono text-[9px] tracking-[0.22em] text-paper-500 uppercase sm:px-8">
            <span>{edgeCode}</span>
            <span aria-hidden>▸ {frameNumber}</span>
          </div>
        ) : (
          <div aria-hidden className="h-2" />
        )}

        <div className="tex-paper flex-1 bg-paper text-prussia-900">
          {children}
        </div>

        {markings ? (
          <div className="flex items-center justify-between px-5 py-1.5 font-mono text-[9px] tracking-[0.22em] text-paper-500 uppercase sm:px-8">
            <span aria-hidden>{frameNumber} ◂</span>
            <span>{edgeCode}</span>
          </div>
        ) : (
          <div aria-hidden className="h-2" />
        )}
      </div>
    </section>
  );
}

function Perforation({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 flex w-5 flex-col items-center justify-center gap-3 overflow-hidden sm:w-9 ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {Array.from({ length: 26 }).map((_, index) => (
        <span
          key={index}
          className="h-5 w-2.5 shrink-0 rounded-[3px] bg-prussia-900 ring-1 ring-prussia-800/60 sm:h-6 sm:w-4"
        />
      ))}
    </div>
  );
}
