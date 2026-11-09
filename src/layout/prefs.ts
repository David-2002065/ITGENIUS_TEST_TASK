import { useSyncExternalStore } from 'react';

export type NavStyle = 'sidebar' | 'dock';
export type ThemeMode = 'light' | 'dark' | 'system';

interface Prefs {
  navStyle: NavStyle;
  theme: ThemeMode;
  collapsed: boolean;
}

const KEY = 'crm-prefs';

function read(): Prefs {
  const base: Prefs = { navStyle: 'sidebar', theme: 'system', collapsed: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return base;
    return {
      navStyle: saved.navStyle === 'dock' ? 'dock' : 'sidebar',
      theme: ['light', 'dark', 'system'].includes(saved.theme) ? saved.theme : 'system',
      collapsed: saved.collapsed === true,
    };
  } catch {
    return base;
  }
}

// Module-level store: Settings page changes it, the layout re-renders immediately.
let prefs = read();
const listeners = new Set<() => void>();

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — the choice still applies for this session */
  }
  listeners.forEach((l) => l());
}

export function usePrefs() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => prefs,
  );
}

/* ------------------------------------------------------------------ Theme */

const media = window.matchMedia('(prefers-color-scheme: dark)');
const resolveDark = (mode: ThemeMode) => (mode === 'system' ? media.matches : mode === 'dark');

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

media.addEventListener('change', () => {
  if (prefs.theme !== 'system') return;
  applyDark(media.matches);
  prefs = { ...prefs }; // new snapshot so subscribers re-render
  listeners.forEach((l) => l());
});
applyDark(resolveDark(prefs.theme));

export const isDarkNow = () => document.documentElement.classList.contains('dark');

/**
 * Switches the theme. With a click point the new theme spreads from there as a circle
 * (View Transitions API); without support it just switches.
 */
export function setTheme(mode: ThemeMode, event?: { clientX: number; clientY: number }) {
  const nextDark = resolveDark(mode);
  const commit = () => {
    applyDark(nextDark);
    setPrefs({ theme: mode });
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!event || nextDark === isDarkNow() || !document.startViewTransition || reduced) {
    commit();
    return;
  }
  const { clientX: x, clientY: y } = event;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(commit);
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
}

export function useIsDark() {
  usePrefs();
  return isDarkNow();
}
