// @ts-nocheck
import React from 'react';

/**
 * Menu item nested text.
 */
export function MenuItemNestedText({ level, text }) {
  // Coerce to a safe, non-negative integer. `level` can arrive undefined/NaN
  // (e.g. account items expose `level`, not `accountLevel`), and `Array(NaN)` or
  // `Array(-1)` throws "Invalid array length", crashing the whole select popover.
  const depth = Math.max(0, Math.floor(Number(level) || 1) - 1);
  const whitespaces = [...Array(depth)].map((e, i) => (
    <span key={i} className={'menu-item-space'}></span>
  ));

  return (
    <>
      {whitespaces} {text}
    </>
  );
}
