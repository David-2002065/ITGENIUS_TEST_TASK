import { GripVertical, Pin, PinOff, RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef, TableState } from './types';
import { Popover } from './ui';

interface Props {
  anchor: HTMLElement | null;
  cols: ColumnDef[];
  state: TableState;
  setState: (fn: (s: TableState) => TableState) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ColumnsPanel({ anchor, cols, state, setState, onReset, onClose }: Props) {
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const byId = new Map(cols.map((c) => [c.id, c]));
  const ordered = state.order.map((id) => byId.get(id)).filter((c): c is ColumnDef => !!c);
  const list = q ? ordered.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())) : ordered;
  const visibleCount = ordered.filter((c) => !c.missing && !state.hidden.includes(c.id)).length;

  const toggle = (id: string) =>
    setState((s) => ({ ...s, hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] }));
  const pin = (id: string) =>
    setState((s) => ({ ...s, pinned: s.pinned.includes(id) ? s.pinned.filter((x) => x !== id) : [...s.pinned, id] }));
  const move = (from: string, to: string) =>
    setState((s) => {
      const order = s.order.filter((x) => x !== from);
      order.splice(order.indexOf(to), 0, from);
      return { ...s, order };
    });

  return (
    <Popover anchor={anchor} onClose={onClose} width={320} align="right">
      <div className="cp">
        <div className="fp-head">
          <span className="fp-title">
            Ustunlar <em className="muted">{visibleCount}/{ordered.length}</em>
          </span>
          <button className="btn ghost sm" onClick={onReset} title="Ustunlar, filtrlar va saralashni boshlang‘ich holatga qaytarish">
            <RotateCcw size={13} /> Asl holat
          </button>
        </div>
        <div className="input-icon">
          <Search size={14} />
          <input className="input" placeholder="Ustun qidirish…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="cp-actions">
          <button onClick={() => setState((s) => ({ ...s, hidden: [] }))}>Hammasini ko‘rsatish</button>
          <span className="muted">Tartibni sudrab o‘zgartiring</span>
        </div>
        <div className="cp-list">
          {list.map((c) => {
            const hidden = state.hidden.includes(c.id);
            const pinned = state.pinned.includes(c.id);
            return (
              <div
                key={c.id}
                className={`cp-item ${overId === c.id && dragId !== c.id ? 'over' : ''} ${dragId === c.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragId(c.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverId(c.id);
                }}
                onDrop={() => {
                  if (dragId && dragId !== c.id) move(dragId, c.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <GripVertical size={14} className="grip" />
                <label>
                  <input type="checkbox" checked={!hidden && !c.missing} disabled={c.missing} onChange={() => toggle(c.id)} />
                  <span>{c.label}</span>
                </label>
                {c.auto && (
                  <span className="tag-new" title="Bu maydon faylda topildi, lekin sahifa sozlamasida yo‘q — avtomatik qo‘shildi">
                    yangi
                  </span>
                )}
                {c.missing && (
                  <span className="tag-missing" title="Bu maydon hozirgi faylda yo‘q">
                    faylda yo‘q
                  </span>
                )}
                <button className={`icon-btn tiny ${pinned ? 'on' : ''}`} title={pinned ? 'Mahkamlashni bekor qilish' : 'Chapga mahkamlash'} onClick={() => pin(c.id)}>
                  {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
