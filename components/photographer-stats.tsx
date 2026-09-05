import { formatCount, formatPrice } from '@/lib/format';
import type { PhotographerSummary } from '@/lib/photographer-panel';

export function PhotographerStats({ summary }: { summary: PhotographerSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-px border border-paper/12 bg-paper/12 sm:grid-cols-3">
      <Stat label="No acervo" value={formatCount(summary.published)} />
      <Stat
        label={summary.sales === 1 ? 'Licença emitida' : 'Licenças emitidas'}
        value={formatCount(summary.sales)}
      />
      <Stat
        label="Em licenças"
        value={formatPrice(summary.revenue)}
        className="col-span-2 sm:col-span-1"
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-prussia-950/50 px-4 py-5 sm:px-5 ${className}`}>
      <dt className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-paper">
        {value}
      </dd>
    </div>
  );
}
