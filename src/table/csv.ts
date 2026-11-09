import type { CellMap } from './engine';
import type { ColumnDef, Row } from './types';

/** CSV that opens correctly in Excel (UTF-8 BOM, ";" separator for ru/uz locales). */
export function exportCsv(filename: string, rows: Row[], cols: ColumnDef[], cells: CellMap) {
  const esc = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [
    cols.map((c) => esc(c.label)).join(';'),
    ...rows.map((r) => cols.map((c) => esc(cells.get(r.__key)![c.id].text)).join(';')),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
