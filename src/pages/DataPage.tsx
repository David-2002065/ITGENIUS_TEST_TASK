import { AlertCircle, FileJson, RefreshCw, Sparkles, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeCell, stringify } from '../lib/cells';
import { buildColumns, extractRecords, toRows } from '../lib/normalize';
import { DataTable } from '../table/DataTable';
import type { CellMap } from '../table/engine';
import type { Cell, PageConfig, Row } from '../table/types';
import { useTableState } from '../table/useTableState';
import { tip, toast } from '../table/ui';

const minDelay = (started: number, ms = 450) =>
  new Promise((r) => setTimeout(r, Math.max(0, ms - (performance.now() - started))));

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; json: unknown; source: string; loadedAt: Date };

export function DataPage({ config, onCount }: { config: PageConfig; onCount: (id: string, n: number) => void }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * First load shows the skeleton. A reload keeps the current table on screen (with search,
   * filters and scroll) under a loading overlay, then swaps the data in place.
   */
  const fetchData = useCallback(async () => {
    const soft = hasData.current;
    if (soft) setRefreshing(true);
    else setLoad({ status: 'loading' });
    const started = performance.now();
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${config.file}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fayl topilmadi (${res.status}): data/${config.file}`);
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`data/${config.file} — JSON formati buzilgan`);
      }
      // Keep the overlay up long enough to read as feedback, even when the file is local and instant.
      if (soft) await minDelay(started);
      hasData.current = true;
      setLoad({ status: 'ready', json, source: `data/${config.file}`, loadedAt: new Date() });
      if (soft) toast('Ma’lumotlar yangilandi');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // On reload failure the old data stays visible — only say what went wrong.
      if (soft) toast(`Yangilab bo‘lmadi: ${message}`);
      else setLoad({ status: 'error', message });
    } finally {
      setRefreshing(false);
    }
  }, [config.file]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openLocalFile = async (file: File) => {
    setRefreshing(true);
    const started = performance.now();
    try {
      const json = JSON.parse(await file.text());
      await minDelay(started);
      hasData.current = true;
      setLoad({ status: 'ready', json, source: file.name, loadedAt: new Date() });
      toast(`${file.name} yuklandi`);
    } catch {
      toast('Bu fayl to‘g‘ri JSON emas');
    } finally {
      setRefreshing(false);
    }
  };

  if (load.status === 'loading') return <PageSkeleton config={config} />;
  if (load.status === 'error') {
    return (
      <div className="page">
        <div className="error-card">
          <AlertCircle size={22} />
          <div>
            <h4>Ma’lumotni yuklab bo‘lmadi</h4>
            <p>{load.message}</p>
          </div>
          <button className="btn primary" onClick={fetchData}>
            <RefreshCw size={14} /> Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <Loaded
      config={config}
      refreshing={refreshing}
      json={load.json}
      source={load.source}
      onReload={fetchData}
      onPickFile={() => fileInput.current?.click()}
      onCount={onCount}
      fileInput={
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) openLocalFile(f);
            e.target.value = '';
          }}
        />
      }
    />
  );
}

function Loaded({
  config,
  refreshing,
  json,
  source,
  onReload,
  onPickFile,
  onCount,
  fileInput,
}: {
  config: PageConfig;
  refreshing: boolean;
  json: unknown;
  source: string;
  onReload: () => void;
  onPickFile: () => void;
  onCount: (id: string, n: number) => void;
  fileInput: React.ReactNode;
}) {
  const rows = useMemo(() => toRows(extractRecords(json).filter((r) => r !== null && r !== undefined), config.keyField), [json, config.keyField]);
  const cols = useMemo(() => buildColumns(config, rows), [config, rows]);
  const cells: CellMap = useMemo(() => {
    const map: CellMap = new Map();
    for (const r of rows) {
      const rc: Record<string, Cell> = {};
      for (const c of cols) rc[c.id] = makeCell(c, r);
      map.set(r.__key, rc);
    }
    return map;
  }, [rows, cols]);
  const table = useTableState(config.id, cols);
  const [bannerClosed, setBannerClosed] = useState(false);

  useEffect(() => {
    onCount(config.id, rows.length);
  }, [config.id, rows.length, onCount]);

  const autoCols = cols.filter((c) => c.auto);
  const missingCols = cols.filter((c) => c.missing);
  const invalidCount = useMemo(() => {
    let n = 0;
    for (const rc of cells.values()) for (const c of Object.values(rc)) if (c.invalid) n++;
    return n;
  }, [cells]);

  const stats = (config.stats ?? [])
    // A card whose column is missing from the file would show a misleading number — skip it.
    .filter((s) => !s.columnId || cols.some((c) => c.id === s.columnId && !c.missing))
    .map((s) => {
    if (!s.columnId) return { ...s, count: rows.length, active: false, clickable: !s.columnId };
    const set = new Set(s.values);
    const count = rows.filter((r) => cells.get(r.__key)![s.columnId!].keys.some((k) => set.has(k))).length;
    const f = table.state.filters[s.columnId];
    const active = !!f?.values && f.values.length === s.values!.length && f.values.every((v) => set.has(v));
    return { ...s, count, active, clickable: true };
  });

  const titleOf = (r: Row) => {
    const first = cols.find((c) => c.pinned) ?? cols[0];
    return first ? cells.get(r.__key)![first.id].text || stringify(r.__key) : r.__key;
  };

  return (
    <div className="page">
      {stats.length > 0 && (
        <div className="stats">
          {stats.map((s) => (
            <button
              key={s.label}
              className={`stat tone-${s.tone} ${s.active ? 'active' : ''}`}
              disabled={!s.clickable}
              onClick={() =>
                table.setState((st) => {
                  if (!s.columnId) return { ...st, filters: {} };
                  const filters = { ...st.filters };
                  if (s.active) delete filters[s.columnId];
                  else filters[s.columnId] = { values: s.values };
                  return { ...st, filters };
                })
              }
              title={s.columnId ? (s.active ? 'Filtrni olib tashlash' : 'Shu bo‘yicha filtrlash') : 'Barcha filtrlarni tozalash'}
            >
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-body">
                <span className="stat-value">{s.count}</span>
                <span className="stat-label">{s.label}</span>
              </span>
              {rows.length > 0 && s.columnId && <span className="stat-bar" style={{ width: `${(s.count / rows.length) * 100}%` }} />}
            </button>
          ))}
        </div>
      )}

      {!bannerClosed && (autoCols.length > 0 || missingCols.length > 0 || invalidCount > 0) && (
        <div className="banner">
          <Sparkles size={16} />
          <div>
            {autoCols.length > 0 && (
              <span>
                Faylda kutilmagan <b>{autoCols.length}</b> ta maydon topildi va jadvalga qo‘shildi:{' '}
                {autoCols.map((c) => c.label).join(', ')}.{' '}
              </span>
            )}
            {missingCols.length > 0 && (
              <span>
                Faylda yo‘q maydonlar yashirildi: {missingCols.map((c) => c.label).join(', ')}.{' '}
              </span>
            )}
            {invalidCount > 0 && (
              <span>
                <b>{invalidCount}</b> ta qiymat kutilgan formatda emas — ular <span className="invalid-inline">⚠ belgi</span> bilan ko‘rsatilgan.
              </span>
            )}
          </div>
          <button className="icon-btn tiny" onClick={() => setBannerClosed(true)} title="Yopish">
            <X size={14} />
          </button>
        </div>
      )}

      <DataTable
        pageId={config.id}
        rows={rows}
        cols={cols}
        cells={cells}
        table={table}
        loading={refreshing}
        rowTitle={titleOf}
        footerExtra={
          <span className="source" title="Ma’lumot manbasi">
            <FileJson size={13} /> {source}
          </span>
        }
        toolbarExtra={
          <>
            {fileInput}
            <button className="icon-btn" onClick={onReload} disabled={refreshing} {...tip('Fayldan qayta yuklash', 'bottom')}>
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
            <button className="icon-btn" onClick={onPickFile} disabled={refreshing} {...tip('Boshqa JSON faylni ochish', 'bottom')}>
              <Upload size={15} />
            </button>
          </>
        }
      />
    </div>
  );
}

function PageSkeleton({ config }: { config: PageConfig }) {
  return (
    <div className="page">
      <div className="stats">
        {Array.from({ length: config.stats?.length ?? 4 }).map((_, i) => (
          <div key={i} className="stat skeleton" />
        ))}
      </div>
      <div className="table-card">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="sk-row" />
        ))}
      </div>
    </div>
  );
}
