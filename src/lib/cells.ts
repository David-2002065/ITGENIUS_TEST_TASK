import type { Cell, ColumnDef, Row } from '../table/types';
import { parseDate, parseNumber } from './normalize';

export const BLANK = '__blank__';
export const BLANK_LABEL = '(Bo‘sh)';

const nf = new Map<number, Intl.NumberFormat>();
export function fmtNumber(n: number, digits?: number) {
  const key = digits ?? -1;
  if (!nf.has(key)) {
    nf.set(
      key,
      new Intl.NumberFormat('ru-RU', digits === undefined ? { maximumFractionDigits: 2 } : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    );
  }
  return nf.get(key)!.format(n);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtDate(ms: number, withTime: boolean) {
  const d = new Date(ms);
  if (!withTime) return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Calendar day key (yyyy-mm-dd) used by date range filters. */
export function dayKey(ms: number, withTime: boolean) {
  const d = new Date(ms);
  return withTime
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fmtPhone(s: string) {
  const digits = s.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return s;
}

export function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(stringify).filter(Boolean).join(', ');
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const isEmpty = (v: unknown) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const empty = (raw: unknown): Cell => ({ raw, value: null, text: '', keys: [BLANK], sort: null });

/** Fallback when a value does not match the column type: keep it visible as text. */
const invalid = (raw: unknown): Cell => {
  const text = stringify(raw);
  return { raw, value: text, text, keys: [text], sort: [1, text.toLowerCase()], invalid: true };
};

export function optionLabel(col: ColumnDef, key: string) {
  if (key === BLANK) return BLANK_LABEL;
  return col.options?.[key]?.label ?? key;
}

export function makeCell(col: ColumnDef, row: Row): Cell {
  let raw: unknown;
  try {
    raw = col.get ? col.get(row) : row[col.id];
  } catch {
    raw = undefined;
  }
  if (isEmpty(raw)) return empty(raw);

  switch (col.type) {
    case 'number': {
      const n = parseNumber(raw);
      if (n === null) return invalid(raw);
      const text = fmtNumber(n, col.digits);
      return { raw, value: n, text, keys: [text], sort: [0, n] };
    }
    case 'money': {
      const n = parseNumber(raw);
      if (n === null) return invalid(raw);
      const cur = col.currencyId ? stringify(row[col.currencyId]) : '';
      const text = cur ? `${fmtNumber(n)} ${cur}` : fmtNumber(n);
      // Different currencies are not comparable — group by currency, then amount.
      return { raw, value: n, text, keys: [text], sort: [0, cur || '~', n] };
    }
    case 'date': {
      const ms = parseDate(raw);
      if (ms === null) return invalid(raw);
      const withTime = !!col.withTime && typeof raw === 'string' && raw.includes('T');
      const text = fmtDate(ms, withTime);
      return { raw, value: ms, text, keys: [dayKey(ms, withTime)], sort: [0, ms] };
    }
    case 'bool': {
      const b = raw === true || raw === 'true' || raw === 1 ? true : raw === false || raw === 'false' || raw === 0 ? false : null;
      if (b === null) return invalid(raw);
      const key = String(b);
      const text = optionLabel(col, key) === key ? (b ? 'Ha' : 'Yo‘q') : optionLabel(col, key);
      return { raw, value: b, text, keys: [key], sort: [0, b ? 1 : 0] };
    }
    case 'tags': {
      const list = (Array.isArray(raw) ? raw : String(raw).split(/[,;]/)).map((x) => stringify(x).trim()).filter(Boolean);
      if (!list.length) return empty(raw);
      const labels = list.map((k) => optionLabel(col, k));
      return { raw, value: list, text: labels.join(', '), keys: list, sort: [0, labels.join(', ').toLowerCase()] };
    }
    case 'enum': {
      const key = stringify(raw);
      const text = optionLabel(col, key);
      return { raw, value: key, text, keys: [key], sort: [0, text.toLowerCase()] };
    }
    case 'phone': {
      const s = stringify(raw);
      const text = fmtPhone(s);
      return { raw, value: s, text, keys: [text], sort: [0, s.replace(/\D/g, '')] };
    }
    default: {
      const text = stringify(raw);
      return { raw, value: text, text, keys: [text], sort: [0, text.toLowerCase()] };
    }
  }
}

const collator = new Intl.Collator('uz', { numeric: true, sensitivity: 'base' });

export function compareSort(a: Cell['sort'], b: Cell['sort']) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return collator.compare(String(x), String(y));
  }
  return 0;
}

/** Normalizes text for search: case, apostrophe variants, and a whitespace-free variant for phones/plates. */
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .trim();
}
