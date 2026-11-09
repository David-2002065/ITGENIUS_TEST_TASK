import { Braces, ChevronDown, ChevronUp, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CellView } from './CellView';
import type { CellMap } from './engine';
import type { ColumnDef, Row } from './types';
import { copyText } from './ui';

interface Props {
  row: Row;
  title: string;
  cols: ColumnDef[];
  cells: CellMap;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function RowDrawer({ row, title, cols, cells, position, total, onPrev, onNext, onClose }: Props) {
  const [raw, setRaw] = useState(false);
  const rc = cells.get(row.__key)!;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'j') (e.preventDefault(), onNext());
      if (e.key === 'ArrowUp' || e.key === 'k') (e.preventDefault(), onPrev());
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, onNext, onPrev]);

  const json = JSON.stringify(row.__raw, null, 2);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={title}>
        <header className="drawer-head">
          <div>
            <div className="drawer-kicker">
              {position + 1} / {total}
            </div>
            <h3>{title}</h3>
          </div>
          <div className="drawer-nav">
            <button className="icon-btn" onClick={onPrev} disabled={position === 0} title="Oldingi (↑)">
              <ChevronUp size={16} />
            </button>
            <button className="icon-btn" onClick={onNext} disabled={position >= total - 1} title="Keyingi (↓)">
              <ChevronDown size={16} />
            </button>
            <button className="icon-btn" onClick={onClose} title="Yopish (Esc)">
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="drawer-tabs">
          <button className={!raw ? 'active' : ''} onClick={() => setRaw(false)}>
            Maydonlar
          </button>
          <button className={raw ? 'active' : ''} onClick={() => setRaw(true)}>
            <Braces size={13} /> Asl JSON
          </button>
        </div>
        <div className="drawer-body">
          {raw ? (
            <div className="json">
              <button className="btn ghost sm json-copy" onClick={() => copyText(json)}>
                <Copy size={12} /> Nusxa
              </button>
              <pre>{json}</pre>
            </div>
          ) : (
            <dl className="fields">
              {cols.map((c) => (
                <div key={c.id} className="field">
                  <dt>
                    {c.label}
                    {c.auto && <span className="tag-new">yangi</span>}
                  </dt>
                  <dd>
                    <CellView col={c} cell={rc[c.id]} row={row} ctx={{ query: '', cellOf: (r, id) => cells.get(r.__key)![id] }} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </aside>
    </>
  );
}
