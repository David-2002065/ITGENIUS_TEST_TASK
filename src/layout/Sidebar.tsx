import { ChevronsLeft, Truck } from 'lucide-react';
import { tip } from '../table/ui';
import { NAV_GROUPS, type NavBadges } from './navigation';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  active: string;
  collapsed: boolean;
  badges: NavBadges;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ active, collapsed, badges, onToggleCollapse, onNavigate }: Props) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sb-brand">
        <BrandMark />
        <div className="sb-fade">
          <b>Yuk CRM</b>
          <small>Logistika paneli</small>
        </div>
      </div>

      <nav className="sb-nav" aria-label="Asosiy menyu">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="sb-group">
            <p className="sb-group-label sb-fade">{group.label}</p>
            {group.items.map((item) => {
              const isActive = item.id === active;
              const alert = badges.alert[item.id];
              const total = badges.total[item.id];
              return (
                <a
                  key={item.id}
                  href={`#/${item.id}`}
                  className={`sb-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onNavigate}
                  {...tip(collapsed ? item.label : undefined, 'right')}
                >
                  <span className="sb-indicator" />
                  <span className={`sb-tile ${item.tile}`}>{item.icon}</span>
                  <span className="sb-label sb-fade">{item.label}</span>
                  {alert && alert.count > 0 ? (
                    <span className="sb-badge alert" title={alert.label}>
                      {alert.count}
                    </span>
                  ) : (
                    total !== undefined && !collapsed && <span className="sb-badge">{total}</span>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        {onToggleCollapse && (
          <button type="button" className="sb-collapse" onClick={onToggleCollapse} {...tip(collapsed ? 'Menyuni yoyish' : undefined, 'right')}>
            <span className="sb-tile ghost">
              <ChevronsLeft size={16} className={collapsed ? 'flip' : ''} />
            </span>
            <span className="sb-fade">Yig‘ish</span>
          </button>
        )}
        <div className="sb-user">
          <span className="sb-avatar">D</span>
          <div className="sb-fade sb-user-text">
            <b>Dispetcher</b>
            <small>Lokal rejim</small>
          </div>
          {!collapsed && <ThemeToggle className="icon-btn ghost" />}
        </div>
      </div>
    </aside>
  );
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Truck size={size / 2} />
    </span>
  );
}
