import type { ColType, ColumnDef, PageConfig, Row } from '../table/types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const PREFERRED_KEYS = ['items', 'data', 'results', 'rows', 'records', 'list', 'content'];

/**
 * Finds the array of records inside any JSON shape:
 *   [...], { items: [...] }, { data: { licenses: [...] } }, ...
 * Prefers well-known keys, otherwise picks the largest array of objects (breadth-first).
 */
export function extractRecords(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (!isPlainObject(json)) return [];

  let best: unknown[] | null = null;
  const queue: unknown[] = [json];
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const node = queue.shift();
    if (Array.isArray(node)) {
      const objects = node.filter(isPlainObject).length;
      if (objects > 0 && (!best || node.length > best.length)) best = node;
      continue;
    }
    if (!isPlainObject(node)) continue;
    const keys = Object.keys(node).sort(
      (a, b) => rank(a) - rank(b),
    );
    for (const k of keys) {
      const v = node[k];
      if (Array.isArray(v) && v.some(isPlainObject) && PREFERRED_KEYS.includes(k.toLowerCase())) {
        return v;
      }
      queue.push(v);
    }
  }
  return best ?? [];
}

function rank(key: string) {
  const i = PREFERRED_KEYS.indexOf(key.toLowerCase());
  return i === -1 ? 99 : i;
}

/** Flattens nested plain objects into dotted paths. Arrays are kept as values. */
export function flatten(obj: unknown, prefix = '', out: Record<string, unknown> = {}) {
  if (!isPlainObject(obj)) {
    out[prefix || 'value'] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && Object.keys(v).length > 0) flatten(v, path, out);
    else out[path] = v;
  }
  return out;
}

export function toRows(records: unknown[], keyField?: string): Row[] {
  const seen = new Set<string>();
  return records.map((rec, i) => {
    const flat = flatten(rec);
    let key = keyField && flat[keyField] != null ? String(flat[keyField]) : String(flat.id ?? flat.key ?? i);
    if (seen.has(key)) key = `${key}#${i}`;
    seen.add(key);
    return { ...flat, __key: key, __index: i, __raw: rec };
  });
}

/** All leaf paths present in the data, in first-seen order. Paths that are objects elsewhere are dropped. */
export function discoverPaths(rows: Row[]): string[] {
  const paths: string[] = [];
  const set = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (k.startsWith('__') || set.has(k)) continue;
      set.add(k);
      paths.push(k);
    }
  }
  // "driver" (null in some rows) vs "driver.name" — keep only the leaves.
  return paths.filter((p) => !paths.some((q) => q.startsWith(p + '.')));
}

const DATE_RE = /^(\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?|\d{2}[./]\d{2}[./]\d{4})$/;

export function inferType(values: unknown[]): ColType {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (sample.length === 0) return 'text';
  if (sample.every((v) => typeof v === 'boolean')) return 'bool';
  if (sample.every((v) => Array.isArray(v))) return 'tags';
  if (sample.every((v) => typeof v === 'number' || (typeof v === 'string' && parseNumber(v) !== null))) {
    return sample.some((v) => typeof v === 'number') ? 'number' : 'text';
  }
  if (sample.every((v) => typeof v === 'string' && DATE_RE.test(v.trim()))) return 'date';
  if (sample.every((v) => typeof v === 'string' && /^\+?\d[\d\s()-]{8,}$/.test(v))) return 'phone';
  const unique = new Set(sample.map((v) => String(v)));
  if (sample.every((v) => typeof v === 'string') && unique.size <= 12 && unique.size < sample.length * 0.6) return 'enum';
  return 'text';
}

export function humanize(path: string) {
  const last = path.split('.').map((s) => s.replace(/_/g, ' ')).join(' · ');
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Builds the final column list: configured columns first (marked `missing` if no row has them),
 * then every other field discovered in the data — so nothing silently disappears.
 */
export function buildColumns(config: PageConfig, rows: Row[]): ColumnDef[] {
  const paths = discoverPaths(rows);
  const configured = new Set<string>();
  const cols: ColumnDef[] = config.columns.map((c) => {
    configured.add(c.id);
    if (c.currencyId) configured.add(c.currencyId);
    if (c.get) return c; // computed column
    const present = paths.includes(c.id);
    return present ? c : { ...c, missing: true, hidden: true };
  });
  for (const p of paths) {
    if (configured.has(p)) continue;
    const extra = config.knownExtras?.[p];
    cols.push({
      id: p,
      label: extra?.label ?? humanize(p),
      type: extra?.type ?? inferType(rows.map((r) => r[p])),
      width: 160,
      auto: true,
      ...extra,
    });
  }
  return cols;
}

export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Accepts ISO strings, "yyyy-mm-dd", "dd.mm.yyyy", "dd/mm/yyyy" and epoch numbers. Returns ms or null. */
export function parseDate(v: unknown): number | null {
  if (typeof v === 'number') return v > 1e11 ? v : v * 1000;
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim();
  const dmy = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(s);
  if (dmy) {
    const t = Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return Number.isNaN(t) ? null : t;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
