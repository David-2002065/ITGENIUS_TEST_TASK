import { makeCell } from '../lib/cells';
import { buildColumns, extractRecords, toRows } from '../lib/normalize';
import type { PageConfig } from '../table/types';

/** Reads a page's file just to count records and "needs attention" rows for the menu badges. */
export async function loadBadge(config: PageConfig) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${config.file}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const rows = toRows(extractRecords(await res.json()), config.keyField);
  let alert = 0;
  if (config.alert) {
    const col = buildColumns(config, rows).find((c) => c.id === config.alert!.columnId && !c.missing);
    const set = new Set(config.alert.values);
    if (col) alert = rows.filter((r) => makeCell(col, r).keys.some((k) => set.has(k))).length;
  }
  return { total: rows.length, alert };
}
