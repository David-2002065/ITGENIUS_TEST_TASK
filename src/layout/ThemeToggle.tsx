import { Moon, Sun } from 'lucide-react';
import { setTheme, useIsDark } from './prefs';
import { tip } from '../table/ui';

export function ThemeToggle({ className = 'icon-btn lg' }: { className?: string }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      className={`${className} theme-toggle`}
      {...tip(dark ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu', 'bottom')}
      onClick={(e) => setTheme(dark ? 'light' : 'dark', e)}
    >
      <span key={String(dark)} className="theme-icon">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
}
