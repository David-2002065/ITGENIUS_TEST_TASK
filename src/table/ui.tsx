import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { normalizeSearch } from '../lib/cells';
import type { Tone } from './types';

export function Badge({ tone = 'gray', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`badge tone-${tone}`}>
      {dot && <i className="badge-dot" />}
      {children}
    </span>
  );
}

export function Chip({ children, tone = 'violet' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`chip tone-${tone}`}>{children}</span>;
}

/** Highlights search tokens inside plain text. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = normalizeSearch(query).split(/\s+/).filter((t) => t.length > 0);
  if (!tokens.length || !text) return <>{text}</>;
  const lower = text.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
  const marks: [number, number][] = [];
  for (const t of tokens) {
    let i = lower.indexOf(t);
    while (i !== -1) {
      marks.push([i, i + t.length]);
      i = lower.indexOf(t, i + t.length);
    }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  marks.forEach(([s, e], i) => {
    if (s < pos) s = pos;
    if (e <= s) return;
    if (s > pos) out.push(text.slice(pos, s));
    out.push(<mark key={i}>{text.slice(s, e)}</mark>);
    pos = e;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}

/** Floating panel anchored to an element, rendered in a portal; closes on outside click / Esc. */
export function Popover({
  anchor,
  onClose,
  children,
  width = 300,
  align = 'left',
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      let left = align === 'right' ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = r.bottom + 6;
      setPos({ top, left, maxH: window.innerHeight - top - 12 });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, width, align]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [anchor, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={ref}
      className="popover"
      style={{ top: pos.top, left: pos.left, width, maxHeight: Math.max(240, pos.maxH) }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

let toastTimer: number | undefined;
export function toast(message: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 1800);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Nusxa olindi: ${text}`);
  } catch {
    toast('Nusxa olib bo‘lmadi');
  }
}

/* ---------------------------------------------------------------- Tooltip */

let bubble: HTMLDivElement | null = null;
const GAP = 8;

function showTip(target: HTMLElement, text: string, side: 'top' | 'right' | 'bottom') {
  bubble ??= document.body.appendChild(document.createElement('div'));
  bubble.className = 'tip';
  bubble.textContent = text;
  bubble.style.display = 'block';
  const r = target.getBoundingClientRect();
  const { width, height } = bubble.getBoundingClientRect();
  let left: number;
  let top: number;
  if (side === 'right') {
    left = r.right + GAP + 4;
    top = r.top + r.height / 2 - height / 2;
  } else {
    left = r.left + r.width / 2 - width / 2;
    top = side === 'bottom' || r.top - height - GAP < GAP ? r.bottom + GAP : r.top - height - GAP;
  }
  bubble.style.left = `${Math.min(Math.max(left, GAP), innerWidth - width - GAP)}px`;
  bubble.style.top = `${top}px`;
  bubble.animate(
    [{ opacity: 0, transform: side === 'right' ? 'translateX(-3px)' : 'translateY(3px)' }, { opacity: 1, transform: 'none' }],
    { duration: 120, easing: 'ease-out' },
  );
}

export function hideTip() {
  if (bubble) bubble.style.display = 'none';
}

/** Spread onto an element: `<button {...tip('Matn')}>`. Rendered in body, so it is never clipped. */
export function tip(text: string | undefined, side: 'top' | 'right' | 'bottom' = 'top') {
  if (!text) return {};
  const show = (e: { currentTarget: EventTarget }) => showTip(e.currentTarget as HTMLElement, text, side);
  return { 'aria-label': text, onMouseEnter: show, onFocus: show, onMouseLeave: hideTip, onBlur: hideTip, onMouseDown: hideTip };
}
