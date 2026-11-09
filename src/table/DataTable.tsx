import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Download,
  FilterX,
  ListFilter,
  Rows3,
  Rows4,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BLANK, optionLabel } from '../lib/cells';
import { CellView } from './CellView';
import { ColumnsPanel } from './ColumnsPanel';
import { exportCsv } from './csv';
import { buildSearchIndex, filterRows, isFilterActive, matchSearch, sortRows, type CellMap } from './engine';
import { FilterPopover } from './FilterPopover';
import { RowDrawer } from './RowDrawer';
import type { ColumnDef, ColumnFilter, RenderCtx, Row, TableState } from './types';

interface Props {
  pageId: string;
  rows: Row[];
  cols: ColumnDef[];
  cells: CellMap;
  table: {
    state: TableState;
    setState: React.Dispatch<React.SetStateAction<TableState>>;
    reset: () => void;
    visibleCols: ColumnDef[];
  };
  rowTitle: (row: Row) => string;
  toolbarExtra?: ReactNode;
  footerExtra?: ReactNode;
  /** Data is being reloaded: current rows stay visible under an overlay. */
  loading?: boolean;
  onFilteredChange?: (rows: Row[]) => void;
}

const SELECT_W = 44;
const DEFAULT_W = 150;
const MIN_W = 60;
/** Fixed row heights make virtualization exact (cells never wrap). */
const ROW_H = { cozy: 44, compact: 34 } as const;
const HEAD_H = 42;
const OVERSCAN = 8;

export function DataTable({ pageId, rows, cols, cells, table, rowTitle, toolbarExtra, footerExtra, loading, onFilteredChange }: Props) {
  const { state, setState, reset, visibleCols } = table;
  const [query, setQuery] = useState('');
  const dq = useDeferredValue(query);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  const [openFilter, setOpenFilter] = useState<{ id: string; el: HTMLElement } | null>(null);
  const [colsAnchor, setColsAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // "/" or Ctrl+F focuses the table search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if ((e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') || ((e.ctrlKey || e.metaKey) && e.key === 'f')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const index = useMemo(() => buildSearchIndex(rows, cells, cols), [rows, cells, cols]);
  const search = useCallback((r: Row) => matchSearch(index.get(r.__key), dq), [index, dq]);

  const filtered = useMemo(
    () => filterRows(rows, cells, cols, state.filters, search),
    [rows, cells, cols, state.filters, search],
  );
  const sorted = useMemo(() => sortRows(filtered, cells, state.sort), [filtered, cells, state.sort]);

  useEffect(() => {
    onFilteredChange?.(filtered);
  }, [filtered, onFilteredChange]);

  // ---- Row virtualization: render only the rows inside the viewport (+ overscan) ----
  const rowH = ROW_H[state.density];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setScroll({ top: el.scrollTop, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);
  const bodyTop = Math.max(0, scroll.top - HEAD_H);
  const start = Math.max(0, Math.floor(bodyTop / rowH) - OVERSCAN);
  const end = Math.min(sorted.length, Math.ceil((bodyTop + scroll.height) / rowH) + OVERSCAN);
  const windowRows = sorted.slice(start, end);
  const padTop = start * rowH;
  const padBottom = (sorted.length - end) * rowH;

  // New query / filters / sort → back to the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [dq, state.filters, state.sort]);

  const activeFilters = cols.filter((c) => isFilterActive(state.filters[c.id]));

  const setFilter = (id: string, f: ColumnFilter | undefined) =>
    setState((s) => {
      const filters = { ...s.filters };
      if (f) filters[id] = f;
      else delete filters[id];
      return { ...s, filters };
    });

  /** Click = sort by this column only; Shift+click = add as secondary sort. */
  const cycleSort = (id: string, multi: boolean) =>
    setState((s) => {
      const cur = s.sort.find((x) => x.id === id);
      const nextDir = !cur ? 'asc' : cur.dir === 'asc' ? 'desc' : null;
      let sort = multi ? s.sort.filter((x) => x.id !== id) : [];
      if (nextDir) sort = multi ? [...sort, { id, dir: nextDir }] : [{ id, dir: nextDir }];
      if (multi && cur && nextDir) sort = s.sort.map((x) => (x.id === id ? { id, dir: nextDir } : x));
      return { ...s, sort };
    });

  const setSort = (id: string, dir: 'asc' | 'desc' | null) =>
    setState((s) => ({ ...s, sort: dir ? [{ id, dir }] : s.sort.filter((x) => x.id !== id) }));

  // Column widths + sticky offsets for pinned columns.
  const widthOf = (c: ColumnDef) => state.widths[c.id] ?? c.width ?? DEFAULT_W;
  const pinnedOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let left = SELECT_W;
    for (const c of visibleCols) {
      if (!state.pinned.includes(c.id)) break;
      map.set(c.id, left);
      left += state.widths[c.id] ?? c.width ?? DEFAULT_W;
    }
    return map;
  }, [visibleCols, state.pinned, state.widths]);
  const lastPinned = [...pinnedOffsets.keys()].pop();

  const startResize = (e: React.MouseEvent, c: ColumnDef) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widthOf(c);
    const move = (ev: MouseEvent) => {
      const w = Math.max(MIN_W, startW + ev.clientX - startX);
      setState((s) => ({ ...s, widths: { ...s.widths, [c.id]: w } }));
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.classList.remove('resizing');
    };
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const autoFit = (c: ColumnDef) => {
    const longest = Math.max(c.label.length + 4, ...sorted.slice(0, 300).map((r) => cells.get(r.__key)![c.id].text.length));
    setState((s) => ({ ...s, widths: { ...s.widths, [c.id]: Math.min(420, Math.max(MIN_W, longest * 7.4 + 36)) } }));
  };

  const moveCol = (from: string, to: string) =>
    setState((s) => {
      const order = s.order.filter((x) => x !== from);
      order.splice(order.indexOf(to), 0, from);
      return { ...s, order };
    });

  const ctx: RenderCtx = useMemo(() => ({ query: dq, cellOf: (r, id) => cells.get(r.__key)![id] }), [dq, cells]);

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.__key));
  const someSelected = !allSelected && sorted.some((r) => selected.has(r.__key));
  const toggleRow = (key: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  /** Header checkbox selects every row that passes the current search/filters. */
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      for (const r of sorted) {
        if (allSelected) n.delete(r.__key);
        else n.add(r.__key);
      }
      return n;
    });

  const exportRows = (onlySelected: boolean) => {
    const list = onlySelected ? sorted.filter((r) => selected.has(r.__key)) : sorted;
    const date = new Date().toISOString().slice(0, 10);
    exportCsv(`${pageId}-${date}.csv`, list, visibleCols, cells);
  };

  const drawerPos = drawerKey ? sorted.findIndex((r) => r.__key === drawerKey) : -1;
  const drawerRow = drawerPos >= 0 ? sorted[drawerPos] : null;

  // Keep the row opened in the drawer visible while navigating with ↑/↓.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || drawerPos < 0) return;
    const top = HEAD_H + drawerPos * rowH;
    if (top < el.scrollTop + HEAD_H) el.scrollTop = top - HEAD_H;
    else if (top + rowH > el.scrollTop + el.clientHeight) el.scrollTop = top + rowH - el.clientHeight;
  }, [drawerPos, rowH]);

  const filterDesc = (c: ColumnDef, f: ColumnFilter) => {
    const parts: string[] = [];
    if (f.values) {
      const labels = f.values.map((k) => (k === BLANK ? '(Bo‘sh)' : c.type === 'date' ? k.split('-').reverse().join('.') : optionLabel(c, k)));
      parts.push(labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', '));
    }
    if (f.text) parts.push(`“${f.text}”`);
    if (f.min !== undefined || f.max !== undefined) parts.push(`${f.min ?? '…'} – ${f.max ?? '…'}`);
    if (f.from || f.to) parts.push(`${f.from?.split('-').reverse().join('.') ?? '…'} – ${f.to?.split('-').reverse().join('.') ?? '…'}`);
    return parts.join(' · ');
  };

  const hasAnything = activeFilters.length > 0 || query.trim() !== '';
  const totalWidth = SELECT_W + visibleCols.reduce((s, c) => s + widthOf(c), 0);

  return (
    <section className={`table-card density-${state.density}`} aria-busy={loading || undefined}>
      <div className={`table-overlay ${loading ? 'show' : ''}`} aria-hidden={!loading}>
        <div className="overlay-card">
          <span className="spinner" />
          <span>
            <b>Yangilanmoqda…</b>
            <small>Fayl qayta o‘qilmoqda</small>
          </span>
        </div>
        <span className="overlay-bar" />
      </div>
      <div className="toolbar">
        <div className="input-icon search">
          <Search size={16} />
          <input
            ref={searchRef}
            className="input"
            placeholder="Barcha ustunlar bo‘yicha qidirish…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          />
          {query ? (
            <button className="icon-btn tiny clear" onClick={() => setQuery('')} title="Tozalash">
              <X size={14} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
        <div className="toolbar-right">
          {toolbarExtra}
          <div className="seg" title="Qator zichligi">
            <button className={state.density === 'cozy' ? 'active' : ''} onClick={() => setState((s) => ({ ...s, density: 'cozy' }))}>
              <Rows3 size={15} />
            </button>
            <button className={state.density === 'compact' ? 'active' : ''} onClick={() => setState((s) => ({ ...s, density: 'compact' }))}>
              <Rows4 size={15} />
            </button>
          </div>
          <button className={`btn ${colsAnchor ? 'active' : ''}`} onClick={(e) => setColsAnchor(colsAnchor ? null : e.currentTarget)}>
            <Columns3 size={15} /> Ustunlar
            {state.hidden.length > 0 && <span className="count">{visibleCols.length}/{cols.length}</span>}
          </button>
          <button className="btn" onClick={() => exportRows(false)} title="Filtrlangan qatorlarni Excel uchun CSV qilib yuklash">
            <Download size={15} /> Eksport
          </button>
        </div>
      </div>

      {(activeFilters.length > 0 || state.sort.length > 0) && (
        <div className="filterbar">
          {activeFilters.map((c) => (
            <span key={c.id} className="fchip" onClick={(e) => setOpenFilter({ id: c.id, el: e.currentTarget })}>
              <ListFilter size={12} />
              <b>{c.label}:</b> {filterDesc(c, state.filters[c.id])}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter(c.id, undefined);
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {state.sort.map((s, i) => {
            const c = cols.find((x) => x.id === s.id);
            if (!c) return null;
            return (
              <span key={s.id} className="fchip sort">
                {s.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {state.sort.length > 1 && <sup>{i + 1}</sup>}
                {c.label}
                <button onClick={() => setSort(s.id, null)}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
          {(activeFilters.length > 0 || state.sort.length > 0) && (
            <button
              className="link"
              onClick={() => setState((s) => ({ ...s, filters: {}, sort: [] }))}
            >
              Hammasini tozalash
            </button>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="selbar">
          <span>
            <b>{selected.size}</b> ta qator tanlandi
          </span>
          <button className="btn sm" onClick={() => exportRows(true)}>
            <Download size={13} /> Tanlanganlarni eksport
          </button>
          <button className="link" onClick={() => setSelected(new Set())}>
            Bekor qilish
          </button>
        </div>
      )}

      <div className="table-scroll" ref={scrollRef}>
        <table className="grid" style={{ width: totalWidth }}>
          <colgroup>
            <col style={{ width: SELECT_W }} />
            {visibleCols.map((c) => (
              <col key={c.id} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sel sticky" style={{ left: 0 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  title="Filtrlangan barcha qatorlarni tanlash"
                />
              </th>
              {visibleCols.map((c) => {
                const sortIdx = state.sort.findIndex((s) => s.id === c.id);
                const sort = state.sort[sortIdx];
                const filtered = isFilterActive(state.filters[c.id]);
                const left = pinnedOffsets.get(c.id);
                return (
                  <th
                    key={c.id}
                    className={[
                      left !== undefined ? 'sticky' : '',
                      c.id === lastPinned ? 'pin-edge' : '',
                      isRight(c) ? 'right' : '',
                      overCol === c.id && dragCol !== c.id ? 'drop' : '',
                      sort ? 'sorted' : '',
                    ].join(' ')}
                    style={left !== undefined ? { left } : undefined}
                    draggable
                    onDragStart={(e) => {
                      setDragCol(c.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!dragCol) return;
                      e.preventDefault();
                      setOverCol(c.id);
                    }}
                    onDrop={() => {
                      if (dragCol && dragCol !== c.id) moveCol(dragCol, c.id);
                      setDragCol(null);
                      setOverCol(null);
                    }}
                    onDragEnd={() => {
                      setDragCol(null);
                      setOverCol(null);
                    }}
                    title={c.hint ?? (c.auto ? `Faylda topilgan yangi maydon: ${c.id}` : undefined)}
                  >
                    <div className="th">
                      <button className="th-label" onClick={(e) => cycleSort(c.id, e.shiftKey)}>
                        <span>{c.label}</span>
                        {c.auto && <i className="dot-new" />}
                        {sort && (
                          <span className="sort-ind">
                            {sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                            {state.sort.length > 1 && <sup>{sortIdx + 1}</sup>}
                          </span>
                        )}
                      </button>
                      <button
                        className={`th-filter ${filtered ? 'on' : ''} ${openFilter?.id === c.id ? 'open' : ''}`}
                        title="Filtr va saralash"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilter(openFilter?.id === c.id ? null : { id: c.id, el: e.currentTarget });
                        }}
                      >
                        <ListFilter size={14} />
                      </button>
                    </div>
                    <span className="resizer" onMouseDown={(e) => startResize(e, c)} onDoubleClick={() => autoFit(c)} title="Kengligini o‘zgartirish (2 marta bosing — avtomatik)" />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {padTop > 0 && <tr className="spacer" style={{ height: padTop }} />}
            {windowRows.map((r) => {
              const rc = cells.get(r.__key)!;
              const isSel = selected.has(r.__key);
              return (
                <tr key={r.__key} style={{ height: rowH }} className={`${isSel ? 'selected' : ''} ${drawerKey === r.__key ? 'current' : ''}`} onClick={() => setDrawerKey(r.__key)}>
                  <td className="sel sticky" style={{ left: 0 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleRow(r.__key)} />
                  </td>
                  {visibleCols.map((c) => {
                    const left = pinnedOffsets.get(c.id);
                    const cell = rc[c.id];
                    return (
                      <td
                        key={c.id}
                        className={[left !== undefined ? 'sticky' : '', c.id === lastPinned ? 'pin-edge' : '', isRight(c) ? 'right' : ''].join(' ')}
                        style={left !== undefined ? { left } : undefined}
                        title={cell.text || undefined}
                      >
                        <div className="cell">
                          <CellView col={c} cell={cell} row={r} ctx={ctx} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {padBottom > 0 && <tr className="spacer" style={{ height: padBottom }} />}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <FilterX size={26} />
            </div>
            <h4>{rows.length === 0 ? 'Faylda yozuvlar topilmadi' : 'Hech narsa topilmadi'}</h4>
            <p>{rows.length === 0 ? 'JSON faylida ma’lumotlar massivi yo‘q yoki u bo‘sh.' : 'Qidiruv yoki filtr shartlarini o‘zgartirib ko‘ring.'}</p>
            {hasAnything && (
              <button
                className="btn primary"
                onClick={() => {
                  setQuery('');
                  setState((s) => ({ ...s, filters: {} }));
                }}
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="pager">
        <div className="pager-info">
          {footerExtra}
          {sorted.length !== rows.length ? (
            <span>
              Topildi: <b>{sorted.length}</b> <span className="muted">/ jami {rows.length}</span>
            </span>
          ) : (
            <span>
              Jami: <b>{rows.length}</b> ta yozuv
            </span>
          )}
        </div>
        <div className="pager-info muted" title="Virtualizatsiya: DOM'da faqat ko'rinib turgan qatorlar bor">
          {sorted.length > 0 && (
            <>
              {start + 1}–{end} qatorlar chizilgan
            </>
          )}
        </div>
      </footer>

      {openFilter && (() => {
        const col = cols.find((c) => c.id === openFilter.id);
        if (!col) return null;
        return (
          <FilterPopover
            key={col.id}
            col={col}
            anchor={openFilter.el}
            cells={cells}
            baseRows={filterRows(rows, cells, cols, state.filters, search, col.id)}
            filter={state.filters[col.id]}
            sortDir={state.sort.find((s) => s.id === col.id)?.dir}
            onApply={(f) => setFilter(col.id, f)}
            onSort={(dir) => setSort(col.id, dir)}
            onClose={() => setOpenFilter(null)}
          />
        );
      })()}

      {colsAnchor && (
        <ColumnsPanel
          anchor={colsAnchor}
          cols={cols}
          state={state}
          setState={setState}
          onReset={() => {
            reset();
            setColsAnchor(null);
          }}
          onClose={() => setColsAnchor(null)}
        />
      )}

      {drawerRow && (
        <RowDrawer
          row={drawerRow}
          title={rowTitle(drawerRow)}
          cols={[...visibleCols, ...cols.filter((c) => !visibleCols.includes(c) && !c.missing)]}
          cells={cells}
          position={drawerPos}
          total={sorted.length}
          onPrev={() => drawerPos > 0 && setDrawerKey(sorted[drawerPos - 1].__key)}
          onNext={() => drawerPos < sorted.length - 1 && setDrawerKey(sorted[drawerPos + 1].__key)}
          onClose={() => setDrawerKey(null)}
        />
      )}
    </section>
  );
}

const isRight = (c: ColumnDef) => c.type === 'number' || c.type === 'money';
