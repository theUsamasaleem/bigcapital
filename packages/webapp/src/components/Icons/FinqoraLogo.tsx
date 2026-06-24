import React from 'react';

interface FinqoraLogoProps {
  width?: number;
  height?: number;
  className?: string;
  /** Render only the icon mark (no wordmark), e.g. for the collapsed sidebar. */
  markOnly?: boolean;
  /** Wordmark color; defaults to the current text color so it adapts to themes. */
  color?: string;
}

/**
 * Finqora brand logo. Text-based wordmark (plus a small mark) so it renders
 * crisply at any size and is trivially themeable, replacing the legacy
 * outline-path "bigcapital" icon.
 */
export function FinqoraLogo({
  width = 214,
  height = 37,
  className,
  markOnly = false,
  color = 'currentColor',
}: FinqoraLogoProps) {
  if (markOnly) {
    const size = height;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className={className}
        role="img"
        aria-label="Finqora"
      >
        <rect x="3" y="3" width="34" height="34" rx="8" fill="#2d95fd" />
        <path
          d="M14 12h13v4h-9v5h8v4h-8v8h-4z"
          fill="#fff"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 40"
      className={className}
      role="img"
      aria-label="Finqora"
    >
      <rect x="1" y="6" width="28" height="28" rx="7" fill="#2d95fd" />
      <path d="M9 13h11v3.4h-7.4v4h6.6v3.4h-6.6V32H9z" fill="#fff" />
      <text
        x="40"
        y="29"
        fill={color}
        fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
        fontSize="27"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        Finqora
      </text>
    </svg>
  );
}

export default FinqoraLogo;
