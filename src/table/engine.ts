import { BLANK, compareSort, normalizeSearch } from '../lib/cells';
import type { Cell, ColumnDef, ColumnFilter, Row, SortRule } from './types';

export type CellMap = Map<string, Record<string, Cell>>;

export function isFilterActive(f?: ColumnFilter) {
  if (!f) return false;
  return (
    f.values !== undefined ||
    !!f.text?.trim() ||
    f.min !== undefined ||
    f.max !== undefined ||
    !!f.from ||
    !!f.to
  );
}

export function matchFilter(col: ColumnDef, cell: Cell, f: ColumnFilter): boolean {
  if (f.values) {
    const set = new Set(f.values);
    if (!cell.keys.some((k) => set.has(k))) return false;
  }
  if (f.text?.trim()) {
    const q = normalizeSearch(f.text);
    if (!normalizeSearch(cell.text).includes(q)) return false;
  }
  if (f.min !== undefined || f.max !== undefined) {
    if (typeof cell.value !== 'number' || cell.invalid) return false;
    if (f.min !== undefined && cell.value < f.min) return false;
    if (f.max !== undefined && cell.value > f.max) return false;
  }
  if (f.from || f.to) {
    if (col.type !== 'date' || cell.invalid || cell.keys[0] === BLANK) return false;
    const day = cell.keys[0];
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
  }
  return true;
}

/** Search index: one lowercase string per row + a whitespace-free copy (phones, plates). */
export function buildSearchIndex(rows: Row[], cells: CellMap, cols: ColumnDef[]) {
  const index = new Map<string, { text: string; compact: string }>();
  for (const r of rows) {
    const rc = cells.get(r.__key)!;
    const text = normalizeSearch(cols.map((c) => rc[c.id].text).join(' \u0001 '));
    index.set(r.__key, { text, compact: text.replace(/[\s+()-]/g, '') });
  }
  return index;
}

export function matchSearch(entry: { text: string; compact: string } | undefined, query: string) {
  if (!query.trim()) return true;
  if (!entry) return false;
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => entry.text.includes(tok) || entry.compact.includes(tok.replace(/[\s+()-]/g, '')));
}

export function filterRows(
  rows: Row[],
  cells: CellMap,
  cols: ColumnDef[],
  filters: Record<string, ColumnFilter>,
  search: (r: Row) => boolean,
  exceptColId?: string,
) {
  const active = cols.filter((c) => c.id !== exceptColId && isFilterActive(filters[c.id]));
  return rows.filter((r) => {
    if (!search(r)) return false;
    const rc = cells.get(r.__key)!;
    return active.every((c) => matchFilter(c, rc[c.id], filters[c.id]));
  });
}

export function sortRows(rows: Row[], cells: CellMap, sort: SortRule[]) {
  if (!sort.length) return rows;
  return [...rows].sort((a, b) => {
    const ca = cells.get(a.__key)!;
    const cb = cells.get(b.__key)!;
    for (const s of sort) {
      const x = ca[s.id]?.sort ?? null;
      const y = cb[s.id]?.sort ?? null;
      // Empty values stay at the bottom regardless of direction (like Excel).
      if (x === null || y === null) {
        if (x === y) continue;
        return x === null ? 1 : -1;
      }
      const d = compareSort(x, y);
      if (d !== 0) return s.dir === 'asc' ? d : -d;
    }
    return a.__index - b.__index;
  });
}
