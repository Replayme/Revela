import Link from 'next/link';
import { BrandMark } from './icons';

export function Logo({
  size = 'md',
  href = '/',
}: {
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
}) {
  const mark = size === 'lg' ? 34 : size === 'sm' ? 22 : 28;
  const type =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl';

  const content = (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark width={mark} height={mark} className="shrink-0" />
      <span
        className={`font-serif ${type} leading-none tracking-[-0.015em] font-medium`}
      >
        Revela
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="Revela — página inicial"
      className="inline-flex transition-opacity hover:opacity-80"
    >
      {content}
    </Link>
  );
}
