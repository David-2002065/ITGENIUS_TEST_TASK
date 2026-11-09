import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BLANK, BLANK_LABEL, compareSort, optionLabel } from '../lib/cells';
import type { CellMap } from './engine';
import type { Cell, ColumnDef, ColumnFilter, Row } from './types';
import { Popover } from './ui';

const SORT_LABELS: Record<string, [string, string]> = {
  number: ['Kichikdan kattaga', 'Kattadan kichikka'],
  money: ['Arzondan qimmatga', 'Qimmatdan arzonga'],
  date: ['Eskidan yangiga', 'Yangidan eskiga'],
  default: ['A → Z', 'Z → A'],
};

const toIsoDay = (d: Date) => d.toISOString().slice(0, 10);

interface Props {
  col: ColumnDef;
  anchor: HTMLElement | null;
  baseRows: Row[];
  cells: CellMap;
  filter?: ColumnFilter;
  sortDir?: 'asc' | 'desc';
  onApply: (f: ColumnFilter | undefined) => void;
  onSort: (dir: 'asc' | 'desc' | null) => void;
  onClose: () => void;
}

export function FilterPopover({ col, anchor, baseRows, cells, filter, sortDir, onApply, onSort, onClose }: Props) {
  const [draft, setDraft] = useState<ColumnFilter>(() => ({ ...filter }));
  const [q, setQ] = useState('');

  const options = useMemo(() => {
    const counts = new Map<string, { count: number; sample: Cell }>();
    for (const r of baseRows) {
      const cell = cells.get(r.__key)![col.id];
      for (const k of cell.keys) {
        const e = counts.get(k);
        if (e) e.count++;
        else counts.set(k, { count: 1, sample: cell });
      }
    }
    for (const k of filter?.values ?? []) if (!counts.has(k)) counts.set(k, { count: 0, sample: { raw: null, value: null, text: k, keys: [k], sort: null } });

    const enumOrder = Object.keys(col.options ?? {});
    const list = [...counts.entries()].map(([key, { count, sample }]) => ({
      key,
      count,
      label: labelFor(col, key, sample),
      sort: sample.sort,
    }));
    list.sort((a, b) => {
      if (a.key === BLANK) return 1;
      if (b.key === BLANK) return -1;
      if (col.type === 'enum' || col.type === 'tags' || col.type === 'bool') {
        const ia = enumOrder.indexOf(a.key);
        const ib = enumOrder.indexOf(b.key);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return a.label.localeCompare(b.label);
      }
      return compareSort(a.sort, b.sort);
    });
    return list;
  }, [baseRows, cells, col, filter?.values]);

  const visibleOptions = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  const selected = new Set(draft.values ?? options.map((o) => o.key));
  const allChecked = visibleOptions.every((o) => selected.has(o.key));
  const someChecked = visibleOptions.some((o) => selected.has(o.key));

  const setValues = (next: Set<string>) => {
    const all = options.every((o) => next.has(o.key));
    setDraft((d) => ({ ...d, values: all ? undefined : options.filter((o) => next.has(o.key)).map((o) => o.key) }));
  };

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setValues(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    for (const o of visibleOptions) {
      if (allChecked) next.delete(o.key);
      else next.add(o.key);
    }
    setValues(next);
  };

  /** Only this value — Excel users miss this a lot. */
  const only = (key: string) => setValues(new Set([key]));

  const apply = () => {
    const clean: ColumnFilter = {};
    if (draft.values) clean.values = draft.values;
    if (draft.text?.trim()) clean.text = draft.text.trim();
    if (draft.min !== undefined && !Number.isNaN(draft.min)) clean.min = draft.min;
    if (draft.max !== undefined && !Number.isNaN(draft.max)) clean.max = draft.max;
    if (draft.from) clean.from = draft.from;
    if (draft.to) clean.to = draft.to;
    // Searching inside the checklist and pressing "Apply" = keep only matching values (Excel behaviour).
    if (q.trim() && !draft.values) clean.values = visibleOptions.map((o) => o.key);
    onApply(Object.keys(clean).length ? clean : undefined);
    onClose();
  };

  const [ascLabel, descLabel] = SORT_LABELS[col.type] ?? SORT_LABELS.default;
  const numeric = col.type === 'number' || col.type === 'money';
  const textual = col.type === 'text' || col.type === 'phone';

  const datePreset = (days: number | 'month') => {
    const now = new Date();
    const from = days === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getTime() - days * 864e5);
    setDraft((d) => ({ ...d, from: toIsoDay(from), to: toIsoDay(now) }));
  };

  return (
    <Popover anchor={anchor} onClose={onClose} width={300}>
      <div className="fp" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && apply()}>
        <div className="fp-head">
          <span className="fp-title">{col.label}</span>
          <button className="icon-btn tiny" onClick={onClose} title="Yopish">
            <X size={14} />
          </button>
        </div>

        <div className="fp-sort">
          <button className={sortDir === 'asc' ? 'active' : ''} onClick={() => onSort(sortDir === 'asc' ? null : 'asc')}>
            <ArrowUpNarrowWide size={14} /> {ascLabel}
          </button>
          <button className={sortDir === 'desc' ? 'active' : ''} onClick={() => onSort(sortDir === 'desc' ? null : 'desc')}>
            <ArrowDownWideNarrow size={14} /> {descLabel}
          </button>
        </div>

        {textual && (
          <div className="fp-section">
            <label className="fp-label">Matn tarkibida</label>
            <input
              className="input"
              placeholder="masalan: Volvo"
              value={draft.text ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            />
          </div>
        )}

        {numeric && (
          <div className="fp-section">
            <label className="fp-label">Oraliq</label>
            <div className="fp-range">
              <input
                className="input"
                type="number"
                placeholder="dan"
                value={draft.min ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
              <span>—</span>
              <input
                className="input"
                type="number"
                placeholder="gacha"
                value={draft.max ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
            </div>
          </div>
        )}

        {col.type === 'date' && (
          <div className="fp-section">
            <label className="fp-label">Sana oralig‘i</label>
            <div className="fp-range">
              <input className="input" type="date" value={draft.from ?? ''} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))} />
              <span>—</span>
              <input className="input" type="date" value={draft.to ?? ''} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))} />
            </div>
            <div className="fp-presets">
              <button onClick={() => datePreset(7)}>7 kun</button>
              <button onClick={() => datePreset(30)}>30 kun</button>
              <button onClick={() => datePreset('month')}>Shu oy</button>
            </div>
          </div>
        )}

        <div className="fp-section grow">
          <label className="fp-label">Qiymatlar</label>
          <div className="input-icon">
            <Search size={14} />
            <input className="input" placeholder="Qiymat qidirish…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="fp-list">
            <label className="fp-item all">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = !allChecked && someChecked;
                }}
                onChange={toggleAll}
              />
              <span>{q ? 'Topilganlarni tanlash' : 'Hammasini tanlash'}</span>
            </label>
            {visibleOptions.slice(0, 400).map((o) => (
              <label key={o.key} className={`fp-item ${o.count === 0 ? 'zero' : ''}`}>
                <input type="checkbox" checked={selected.has(o.key)} onChange={() => toggle(o.key)} />
                <span className={o.key === BLANK ? 'muted' : ''}>{o.label}</span>
                <button className="fp-only" onClick={(e) => (e.preventDefault(), only(o.key))}>
                  faqat
                </button>
                <em>{o.count}</em>
              </label>
            ))}
            {visibleOptions.length === 0 && <div className="fp-empty">Hech narsa topilmadi</div>}
            {visibleOptions.length > 400 && <div className="fp-empty">… yana {visibleOptions.length - 400} ta. Qidiruvdan foydalaning</div>}
          </div>
        </div>

        <div className="fp-foot">
          <button
            className="btn ghost"
            onClick={() => {
              onApply(undefined);
              onClose();
            }}
          >
            Tozalash
          </button>
          <button className="btn primary" onClick={apply}>
            Qo‘llash
          </button>
        </div>
      </div>
    </Popover>
  );
}

function labelFor(col: ColumnDef, key: string, sample: Cell) {
  if (key === BLANK) return BLANK_LABEL;
  if (col.type === 'date') {
    const [y, m, d] = key.split('-');
    return d ? `${d}.${m}.${y}` : key;
  }
  if (col.type === 'bool') return optionLabel(col, key) !== key ? optionLabel(col, key) : key === 'true' ? 'Ha' : 'Yo‘q';
  if (col.type === 'enum' || col.type === 'tags') return optionLabel(col, key);
  return sample.invalid ? `${key} ⚠` : key;
}
