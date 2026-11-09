import { Moon, Sun } from 'lucide-react';
import { NAV_ITEMS, type NavBadges } from './navigation';
import { setTheme, useIsDark } from './prefs';

/** macOS-style bottom dock: the hovered icon grows, its neighbours a little, the label pops above. */
export function Dock({ active, badges }: { active: string; badges: NavBadges }) {
  const dark = useIsDark();
  return (
    <nav className="dock-wrap" aria-label="Asosiy menyu">
      <div className="dock">
        {NAV_ITEMS.map((item) => {
          const alert = badges.alert[item.id];
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              aria-label={item.label}
              aria-current={item.id === active ? 'page' : undefined}
              className={`dock-item ${item.tile}`}
            >
              {item.icon}
              <span className="dock-label">{item.label}</span>
              {alert && alert.count > 0 && <span className="dock-badge">{alert.count}</span>}
              <span className={`dock-dot ${item.id === active ? 'on' : ''}`} />
            </a>
          );
        })}
        <span className="dock-sep" />
        <button
          type="button"
          className="dock-item dock-plain"
          aria-label={dark ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu'}
          onClick={(e) => setTheme(dark ? 'light' : 'dark', e)}
        >
          {dark ? <Sun /> : <Moon />}
          <span className="dock-label">{dark ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu'}</span>
        </button>
      </div>
    </nav>
  );
}
