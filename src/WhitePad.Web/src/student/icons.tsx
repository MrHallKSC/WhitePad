// Inline stroke-based SVG icons mirroring the iPad app's SF Symbols look.
// All icons inherit color from `currentColor` and scale with font-size.
import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ children, size = 24, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const PenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-1.5" />
    <path d="M2 22l4.5-1.5L20 7l-3-3L3.5 17.5 2 22z" />
  </Svg>
);

export const EraserIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 21H8" />
    <path d="M3.6 15.6a2 2 0 0 1 0-2.8l8.8-8.8a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L11 21H9l-5.4-5.4z" />
    <path d="M9.5 7l7.5 7.5" />
  </Svg>
);

export const LineIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="5" y1="19" x2="19" y2="5" />
  </Svg>
);

export const RectangleIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="6" width="16" height="12" rx="1.5" />
  </Svg>
);

export const CircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
  </Svg>
);

export const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="20" x2="20" y2="4" />
    <path d="M11 4h9v9" />
  </Svg>
);

export const AxesLIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3v16h16" />
  </Svg>
);

export const AxesCrossIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
  </Svg>
);

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h1" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12l5 5L20 7" />
  </Svg>
);

export const QuestionIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 9a3 3 0 1 1 4 2.8c-.9.4-1.5 1.1-1.5 2.2" />
    <line x1="11.5" y1="17.5" x2="11.5" y2="17.5" />
  </Svg>
);

// Background-style icons
export const BgNoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </Svg>
);

export const BgDottedIcon = (p: IconProps) => (
  <Svg {...p} >
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.4} />
    <g strokeWidth={2.4}>
      <line x1="8" y1="8" x2="8" y2="8" />
      <line x1="12" y1="8" x2="12" y2="8" />
      <line x1="16" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="8" y2="12" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <line x1="16" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="12" y1="16" x2="12" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </g>
  </Svg>
);

export const BgLinedIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.4} />
    <line x1="6" y1="9" x2="18" y2="9" strokeWidth={1.4} />
    <line x1="6" y1="12" x2="18" y2="12" strokeWidth={1.4} />
    <line x1="6" y1="15" x2="18" y2="15" strokeWidth={1.4} />
  </Svg>
);

export const BgSquaresIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.4} />
    <line x1="9" y1="3" x2="9" y2="21" strokeWidth={1.4} />
    <line x1="15" y1="3" x2="15" y2="21" strokeWidth={1.4} />
    <line x1="3" y1="9" x2="21" y2="9" strokeWidth={1.4} />
    <line x1="3" y1="15" x2="21" y2="15" strokeWidth={1.4} />
  </Svg>
);
