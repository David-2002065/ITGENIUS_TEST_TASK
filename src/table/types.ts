import type { ReactNode } from 'react';

/** Flattened record: nested objects become dotted paths ("driver.name"). */
export interface Row {
  __key: string;
  __index: number;
  __raw: unknown;
  [path: string]: unknown;
}

export type ColType = 'text' | 'number' | 'money' | 'date' | 'enum' | 'tags' | 'bool' | 'phone';

export type Tone = 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'teal' | 'pink';

export interface EnumOption {
  label: string;
  tone: Tone;
}

/** Normalized value of one cell — computed once, used by sort/filter/search/render. */
export interface Cell {
  /** Original value from JSON (may be any type). */
  raw: unknown;
  /** Typed value: number for number/money/date(ms), boolean, string[] for tags, string otherwise. null = empty. */
  value: unknown;
  /** Human readable text (search, CSV, tooltip). */
  text: string;
  /** Keys for the Excel-like value checklist. Tags produce several keys. */
  keys: string[];
  /** Sort key, compared lexicographically. null = empty (always last). */
  sort: (string | number)[] | null;
  /** Value existed but could not be parsed as the column type. */
  invalid?: boolean;
}

export interface ColumnDef {
  id: string;
  label: string;
  type: ColType;
  /** Extract raw value from a row. Defaults to row[id]. */
  get?: (row: Row) => unknown;
  width?: number;
  hidden?: boolean;
  pinned?: boolean;
  /** For enum/tags/bool: translated labels and badge colours. Unknown values are still shown as-is. */
  options?: Record<string, EnumOption>;
  /** money: path of the currency field. */
  currencyId?: string;
  /** date: show time as well. */
  withTime?: boolean;
  /** Number formatting fraction digits. */
  digits?: number;
  /** Optional custom cell renderer. */
  render?: (cell: Cell, row: Row, ctx: RenderCtx) => ReactNode;
  /** Short hint shown in the header tooltip. */
  hint?: string;
  /** Auto-discovered from data (not in page config). */
  auto?: boolean;
  /** Configured column whose path is absent in every row. */
  missing?: boolean;
}

export interface RenderCtx {
  query: string;
  cellOf: (row: Row, colId: string) => Cell;
}

export interface ColumnFilter {
  /** Included checklist keys. undefined = no restriction. */
  values?: string[];
  /** "contains" text condition. */
  text?: string;
  min?: number;
  max?: number;
  /** yyyy-mm-dd */
  from?: string;
  to?: string;
}

export interface SortRule {
  id: string;
  dir: 'asc' | 'desc';
}

export interface TableState {
  order: string[];
  hidden: string[];
  pinned: string[];
  widths: Record<string, number>;
  sort: SortRule[];
  filters: Record<string, ColumnFilter>;
  density: 'compact' | 'cozy';
}

export interface QuickStat {
  label: string;
  tone: Tone;
  icon: ReactNode;
  /** Applies this column filter when the card is clicked. Omit for "total". */
  columnId?: string;
  values?: string[];
}

export interface PageConfig {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  icon: ReactNode;
  /** Field used as stable row key if present. */
  keyField?: string;
  columns: ColumnDef[];
  /** Overrides for auto-discovered columns (label/type) by path. */
  knownExtras?: Record<string, Partial<ColumnDef>>;
  stats?: QuickStat[];
  /** Red badge in the menu: rows needing attention. */
  alert?: { columnId: string; values: string[]; label: string };
}
