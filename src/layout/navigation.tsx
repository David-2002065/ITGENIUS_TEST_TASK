import { FileBadge, Settings, Truck, Users } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Icon tile colour (class in styles.css). */
  tile: string;
}

/** Menu structure lives in one place — both the sidebar and the dock are drawn from it. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Asosiy',
    items: [{ id: 'trips', label: 'Reyslar', icon: <Truck />, tile: 'tile-blue' }],
  },
  {
    label: 'Reestrlar',
    items: [
      { id: 'counterparties', label: 'Kontragentlar', icon: <Users />, tile: 'tile-pink' },
      { id: 'licenses', label: 'Litsenziyalar', icon: <FileBadge />, tile: 'tile-violet' },
    ],
  },
  {
    label: 'Tizim',
    items: [{ id: 'settings', label: 'Sozlamalar', icon: <Settings />, tile: 'tile-slate' }],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export interface NavBadges {
  /** Neutral total count. */
  total: Record<string, number>;
  /** Red "needs attention" count (disputed trips, expired licenses…). */
  alert: Record<string, { count: number; label: string }>;
}
