import React from 'react';
import logoUrl from '@/assets/logo.png';

interface FinqoraLogoProps {
  width?: number;
  height?: number;
  className?: string;
  /** Render only the icon mark (square crop), e.g. for the collapsed sidebar. */
  markOnly?: boolean;
  /**
   * Retained for backward compatibility with prior SVG-wordmark call sites.
   * The brand logo is now a raster image and cannot be recolored, so this is
   * intentionally ignored.
   */
  color?: string;
}

/**
 * Finqora brand logo. Renders the brand image asset (`src/assets/logo.png`),
 * replacing the previous code-drawn SVG wordmark. The image is scaled with
 * `object-fit: contain` so it never distorts, regardless of the width/height
 * box the call site requests.
 */
export function FinqoraLogo({
  width = 214,
  height = 37,
  className,
  markOnly = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  color,
}: FinqoraLogoProps) {
  // Collapsed sidebar / favicon-style usage: constrain to a square box.
  const boxWidth = markOnly ? height : width;

  return (
    <img
      src={logoUrl}
      width={boxWidth}
      height={height}
      className={className}
      alt="Finqora"
      style={{ objectFit: 'contain', maxWidth: '100%' }}
    />
  );
}

export default FinqoraLogo;
