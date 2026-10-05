// All dates are local calendar days stored as 'YYYY-MM-DD'.

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return iso(new Date());
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function diffDays(a: string, b: string): number {
  // a - b in whole days
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}

export function weekday(s: string): number {
  // 0 = Sunday … 6 = Saturday
  return parse(s).getDay();
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dowShort(s: string): string {
  return DOW[weekday(s)];
}
export function dowLong(s: string): string {
  return DOW_LONG[weekday(s)];
}
export function dayMonth(s: string): string {
  const d = parse(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}
export function headerDate(s: string): string {
  const d = parse(s);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].toUpperCase()}`;
}

/** Monday of the week containing s. */
export function mondayOf(s: string): string {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

export function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function clockTime(d: Date = new Date()): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const am = h < 12;
  h = h % 12 || 12;
  return `${h}:${m} ${am ? 'am' : 'pm'}`;
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
