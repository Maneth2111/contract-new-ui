/** Sticky table header aligned with brand colors. */
export const tableTheadClass =
  'sticky top-0 z-10 bg-primary/10 text-brand-navy border-b border-primary/20 rounded-md'

/** Row hover: primary-tinted background and navy text on all cells (data rows only). */
export const tableRowHover =
  '[&_tbody>tr:not([data-empty])]:transition-colors [&_tbody>tr:not([data-empty]):hover]:bg-primary/15 [&_tbody>tr:not([data-empty]):hover>td]:text-brand-navy'
