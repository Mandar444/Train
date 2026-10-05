import type { ReactNode } from 'react';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const KEEP = new Set(['A', 'B', 'RIR', 'OK', 'HC', '1RM']);

/** Turn legacy ALL-CAPS labels into easy-to-read sentence case. */
export function nice(s: ReactNode): ReactNode {
  if (typeof s !== 'string' || !/[A-Z]/.test(s) || s !== s.toUpperCase()) return s;
  const out = s.toLowerCase().split(/(\s+|·|\/|\(|\))/).map((w) => {
    const up = w.toUpperCase();
    if (KEEP.has(up)) return up;
    if (MONTHS.includes(w)) return w[0].toUpperCase() + w.slice(1);
    return w;
  }).join('');
  return out.charAt(0).toUpperCase() + out.slice(1);
}
