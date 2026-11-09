import { Check, Database, FileJson, Laptop, Moon, PanelLeft, RotateCcw, Sun, Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { setPrefs, setTheme, usePrefs, type NavStyle, type ThemeMode } from '../layout/prefs';
import { toast } from '../table/ui';
import { PAGES } from './configs';

const TILE_COLORS = ['tile-blue', 'tile-pink', 'tile-violet', 'tile-slate'];

export function SettingsPage({ counts }: { counts: Record<string, number> }) {
  const prefs = usePrefs();

  const navStyles: { value: NavStyle; title: string; description: string }[] = [
    { value: 'sidebar', title: 'Yon panel', description: 'Chap tomonda, bo‘limlar nomi bilan' },
    { value: 'dock', title: 'Pastki dock', description: 'macOS uslubida, ekran pastida markazda' },
  ];
  const themes: { value: ThemeMode; title: string; icon: ReactNode }[] = [
    { value: 'light', title: 'Yorug‘', icon: <Sun size={14} /> },
    { value: 'dark', title: 'Qorong‘i', icon: <Moon size={14} /> },
    { value: 'system', title: 'Tizim', icon: <Laptop size={14} /> },
  ];

  const resetTables = () => {
    if (!window.confirm('Barcha jadvallarning ustunlari, filtrlari va saralashi boshlang‘ich holatga qaytarilsinmi?')) return;
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('crm-table:'))
        .forEach((k) => localStorage.removeItem(k));
      toast('Jadval sozlamalari tiklandi');
    } catch {
      toast('Tiklab bo‘lmadi');
    }
  };

  return (
    <div className="settings">
      <div className="settings-col">
        <Card title="Ko‘rinish" subtitle="Menyu uslubi — faqat shu brauzerda saqlanadi">
          <div className="choice-grid two" role="radiogroup" aria-label="Menyu uslubi">
            {navStyles.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={prefs.navStyle === s.value}
                className={`choice ${prefs.navStyle === s.value ? 'on' : ''}`}
                onClick={() => setPrefs({ navStyle: s.value })}
              >
                <div className="preview">
                  {s.value === 'sidebar' ? (
                    <>
                      <div className="pv-side">
                        {TILE_COLORS.map((c) => (
                          <span key={c} className={c} />
                        ))}
                      </div>
                      <div className="pv-main side" />
                    </>
                  ) : (
                    <>
                      <div className="pv-main dock" />
                      <div className="pv-dock">
                        {[...TILE_COLORS, 'tile-teal'].map((c, i) => (
                          <span key={c} className={`${c} ${i === 2 ? 'big' : ''}`} />
                        ))}
                      </div>
                    </>
                  )}
                  {prefs.navStyle === s.value && (
                    <span className="choice-check">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="choice-title">{s.title}</p>
                <p className="choice-desc">{s.description}</p>
              </button>
            ))}
          </div>

          <label className={`setting-row ${prefs.navStyle === 'dock' ? 'disabled' : ''}`}>
            <span className="setting-icon tone-violet">
              <PanelLeft size={18} />
            </span>
            <span className="setting-text">
              <b>Yon panelni yig‘ish</b>
              <small>Faqat ikonkalar qoladi, nomlari kursor olib borilganda chiqadi</small>
            </span>
            <Switch
              checked={prefs.collapsed}
              disabled={prefs.navStyle === 'dock'}
              onChange={(v) => setPrefs({ collapsed: v })}
            />
          </label>
        </Card>

        <Card title="Mavzu" subtitle="Tizim — kompyuter sozlamasiga ergashadi">
          <div className="choice-grid three" role="radiogroup" aria-label="Mavzu">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={prefs.theme === t.value}
                className={`choice ${prefs.theme === t.value ? 'on' : ''}`}
                onClick={(e) => setTheme(t.value, e)}
              >
                <div className={`preview theme-pv ${t.value}`}>
                  <div className="tp-half light">
                    <span className="tp-side" />
                    <span className="tp-line w1" />
                    <span className="tp-line w2" />
                  </div>
                  <div className="tp-half dark">
                    <span className="tp-side" />
                    <span className="tp-line w1" />
                    <span className="tp-line w2" />
                  </div>
                  {prefs.theme === t.value && (
                    <span className="choice-check">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="choice-title with-icon">
                  {t.icon} {t.title}
                </p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="settings-col">
        <Card title="Jadvallar" subtitle="Ustunlar, filtrlar va saralash har sahifa uchun alohida saqlanadi">
          <div className="setting-row">
            <span className="setting-icon tone-amber">
              <Table2 size={18} />
            </span>
            <span className="setting-text">
              <b>Jadval sozlamalarini tiklash</b>
              <small>Barcha sahifalarda boshlang‘ich ko‘rinishga qaytadi</small>
            </span>
            <button className="btn sm" onClick={resetTables}>
              <RotateCcw size={13} /> Tiklash
            </button>
          </div>
        </Card>

        <Card title="Ma’lumot manbalari" subtitle="Lokal JSON fayllar — public/data papkasida">
          <div className="sources">
            {PAGES.map((p) => (
              <a key={p.id} href={`#/${p.id}`} className="source-row">
                <span className="setting-icon tone-blue">
                  <FileJson size={17} />
                </span>
                <span className="setting-text">
                  <b>{p.title}</b>
                  <small className="mono">data/{p.file}</small>
                </span>
                {counts[p.id] !== undefined ? (
                  <span className="badge tone-green">
                    <i className="badge-dot" />
                    {counts[p.id]} ta yozuv
                  </span>
                ) : (
                  <span className="badge tone-gray">
                    <Database size={11} /> yuklanmoqda
                  </span>
                )}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Switch({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
