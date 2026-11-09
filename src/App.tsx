import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Menu } from 'lucide-react';
import { Dock } from './layout/Dock';
import { NAV_ITEMS, type NavBadges } from './layout/navigation';
import { setPrefs, usePrefs } from './layout/prefs';
import { BrandMark, Sidebar } from './layout/Sidebar';
import { ThemeToggle } from './layout/ThemeToggle';
import { loadBadge } from './pages/badges';
import { DataPage } from './pages/DataPage';
import { PAGES } from './pages/configs';
import { SettingsPage } from './pages/SettingsPage';
import { tip } from './table/ui';

const currentId = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return NAV_ITEMS.some((p) => p.id === id) ? id : NAV_ITEMS[0].id;
};

const SETTINGS = { title: 'Sozlamalar', subtitle: 'Interfeys ko‘rinishi, mavzu va jadval sozlamalari' };

export function App() {
  const prefs = usePrefs();
  const [pageId, setPageId] = useState(currentId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadges>({ total: {}, alert: {} });

  useEffect(() => {
    const on = () => {
      setPageId(currentId());
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // Menu badges for every page, not only the opened one.
  useEffect(() => {
    for (const p of PAGES) {
      loadBadge(p)
        .then(({ total, alert }) =>
          setBadges((b) => ({
            total: { ...b.total, [p.id]: total },
            alert: p.alert ? { ...b.alert, [p.id]: { count: alert, label: p.alert.label } } : b.alert,
          })),
        )
        .catch(() => {
          /* the page itself shows the load error */
        });
    }
  }, []);

  const onCount = useCallback(
    (id: string, n: number) => setBadges((b) => (b.total[id] === n ? b : { ...b, total: { ...b.total, [id]: n } })),
    [],
  );

  const config = PAGES.find((p) => p.id === pageId);
  const head = config ?? SETTINGS;
  const isDock = prefs.navStyle === 'dock';

  useEffect(() => {
    document.title = `${head.title} — Yuk CRM`;
  }, [head.title]);

  return (
    <div className={`shell ${isDock ? 'is-dock' : prefs.collapsed ? 'is-collapsed' : ''}`}>
      {isDock ? (
        <Dock active={pageId} badges={badges} />
      ) : (
        <>
          <div className="side-desktop">
            <Sidebar active={pageId} collapsed={prefs.collapsed} badges={badges} onToggleCollapse={() => setPrefs({ collapsed: !prefs.collapsed })} />
          </div>
          <div className={`side-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
          <div className={`side-mobile ${mobileOpen ? 'open' : ''}`}>
            <Sidebar active={pageId} collapsed={false} badges={badges} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <main className="main">
        <header className="topbar">
          {isDock ? (
            <BrandMark />
          ) : (
            <button className="icon-btn lg menu-btn" onClick={() => setMobileOpen(true)} {...tip('Menyu', 'bottom')}>
              <Menu size={20} />
            </button>
          )}
          <div className="topbar-title">
            <h1>{head.title}</h1>
            <p>{head.subtitle}</p>
          </div>
          <ThemeToggle />
        </header>

        <ErrorBoundary key={pageId}>
          <div className="page-anim" key={pageId}>
            {config ? <DataPage config={config} onCount={onCount} /> : <SettingsPage counts={badges.total} />}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-card">
        <AlertCircle size={22} />
        <div>
          <h4>Sahifani ko‘rsatishda xatolik</h4>
          <p>{this.state.error.message}</p>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            try {
              Object.keys(localStorage)
                .filter((k) => k.startsWith('crm-table:'))
                .forEach((k) => localStorage.removeItem(k));
            } catch {
              /* ignore */
            }
            location.reload();
          }}
        >
          Sozlamalarni tiklash
        </button>
      </div>
    );
  }
}
