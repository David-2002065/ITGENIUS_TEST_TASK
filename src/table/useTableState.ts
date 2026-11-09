import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef, TableState } from './types';

const VERSION = 2;

function defaults(cols: ColumnDef[]): TableState {
  return {
    order: cols.map((c) => c.id),
    hidden: cols.filter((c) => c.hidden).map((c) => c.id),
    pinned: cols.filter((c) => c.pinned).map((c) => c.id),
    widths: {},
    sort: [],
    filters: {},
    density: 'cozy',
  };
}

function load(key: string): Partial<TableState> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.v === VERSION ? parsed.state : null;
  } catch {
    return null;
  }
}

/**
 * Merges saved state with the current column set: removed columns are dropped,
 * new columns (e.g. a field that appeared in the JSON) are appended and visible.
 */
function reconcile(saved: Partial<TableState> | null, cols: ColumnDef[]): TableState {
  const base = defaults(cols);
  if (!saved) return base;
  const ids = new Set(cols.map((c) => c.id));
  const known = new Set(saved.order ?? []);
  const order = (saved.order ?? []).filter((id) => ids.has(id));
  for (const c of cols) if (!known.has(c.id)) order.push(c.id);
  const keep = (list?: string[]) => (list ?? []).filter((id) => ids.has(id));
  const newlyHidden = cols.filter((c) => !known.has(c.id) && c.hidden).map((c) => c.id);
  return {
    ...base,
    ...saved,
    order,
    hidden: [...keep(saved.hidden), ...newlyHidden],
    pinned: keep(saved.pinned ?? base.pinned),
    widths: saved.widths ?? {},
    sort: (saved.sort ?? []).filter((s) => ids.has(s.id)),
    filters: Object.fromEntries(Object.entries(saved.filters ?? {}).filter(([id]) => ids.has(id))),
  };
}

export function useTableState(pageId: string, cols: ColumnDef[]) {
  const key = `crm-table:${pageId}`;
  const colSig = cols.map((c) => c.id).join('|');
  const [state, setState] = useState<TableState>(() => reconcile(load(key), cols));

  // Column set changed (new file loaded) → reconcile again.
  useEffect(() => {
    setState((s) => reconcile(s, cols));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colSig]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ v: VERSION, state }));
    } catch {
      /* storage unavailable — state just won't persist */
    }
  }, [key, state]);

  const reset = useCallback(() => setState(defaults(cols)), [cols]);

  const visibleCols = useMemo(() => {
    const byId = new Map(cols.map((c) => [c.id, c]));
    const ordered = state.order.map((id) => byId.get(id)).filter((c): c is ColumnDef => !!c);
    // Columns absent from the current file are never shown, but their saved settings are kept.
    const visible = ordered.filter((c) => !c.missing && !state.hidden.includes(c.id));
    const pinned = visible.filter((c) => state.pinned.includes(c.id));
    return [...pinned, ...visible.filter((c) => !state.pinned.includes(c.id))];
  }, [cols, state.order, state.hidden, state.pinned]);

  return { state, setState, reset, visibleCols };
}
