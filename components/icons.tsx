import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5 6.2 11.7 13 4.9" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2.8 14.4 13.4H1.6L8 2.8Z" />
      <path d="M8 6.6v3.1" />
      <path d="M8 11.6h.01" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M1.4 8S3.8 3.6 8 3.6 14.6 8 14.6 8 12.2 12.4 8 12.4 1.4 8 1.4 8Z" />
      <circle cx="8" cy="8" r="2.1" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.2 5.1C1.7 5.9 1.4 8 1.4 8S3.8 12.4 8 12.4c1 0 1.9-.25 2.7-.63" />
      <path d="M13.1 10.5c.9-1 1.5-2.5 1.5-2.5S12.2 3.6 8 3.6c-.6 0-1.2.09-1.7.25" />
      <path d="M6.6 6.6a2.1 2.1 0 0 0 2.9 2.9" />
      <path d="M2 2l12 12" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.2" y="7" width="9.6" height="6.6" />
      <path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="m10.6 10.6 3 3" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12.6 8H3.4" />
      <path d="M7 3.8 3.4 8 7 12.2" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M2.4 8h11.2" />
      <path d="M8 2.4c1.5 1.7 2.2 3.6 2.2 5.6S9.5 11.9 8 13.6C6.5 11.9 5.8 10 5.8 8S6.5 4.1 8 2.4Z" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="1.8" y="3.4" width="12.4" height="9.2" />
      <path d="m1.8 4.4 6.2 4.3 6.2-4.3" />
    </svg>
  );
}

/** Marca do Revela: quadro de exposição com sol de cianotipia. */
export function BrandMark(props: IconProps) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      {...props}
    >
      <rect
        x="1.1"
        y="1.1"
        width="25.8"
        height="25.8"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="14" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.6 21.4h18.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.2 12a4.8 4.8 0 0 0 9.6 0"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
