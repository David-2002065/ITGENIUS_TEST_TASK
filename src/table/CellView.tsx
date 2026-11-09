import { AlertTriangle, Copy } from 'lucide-react';
import type { Cell, ColumnDef, RenderCtx, Row } from './types';
import { Badge, Chip, Highlight, copyText } from './ui';

export function Empty() {
  return <span className="muted">—</span>;
}

export function CellView({ col, cell, row, ctx }: { col: ColumnDef; cell: Cell; row: Row; ctx: RenderCtx }) {
  if (col.render) return <>{col.render(cell, row, ctx)}</>;
  return <DefaultCell col={col} cell={cell} query={ctx.query} />;
}

export function DefaultCell({ col, cell, query }: { col: ColumnDef; cell: Cell; query: string }) {
  if (cell.value === null) return <Empty />;
  if (cell.invalid) {
    return (
      <span className="invalid" title={`Kutilmagan format: ${JSON.stringify(cell.raw)}`}>
        <AlertTriangle size={13} />
        <Highlight text={cell.text} query={query} />
      </span>
    );
  }
  switch (col.type) {
    case 'enum': {
      const key = String(cell.value);
      const opt = col.options?.[key];
      return (
        <Badge tone={opt?.tone ?? 'gray'}>
          <Highlight text={cell.text} query={query} />
        </Badge>
      );
    }
    case 'bool': {
      const opt = col.options?.[String(cell.value)];
      return <Badge tone={opt?.tone ?? (cell.value ? 'green' : 'gray')}>{cell.text}</Badge>;
    }
    case 'tags':
      return (
        <span className="chips">
          {(cell.value as string[]).map((t) => (
            <Chip key={t} tone={col.options?.[t]?.tone ?? 'violet'}>
              <Highlight text={col.options?.[t]?.label ?? t} query={query} />
            </Chip>
          ))}
        </span>
      );
    case 'number':
    case 'money':
      return (
        <span className="num">
          <Highlight text={cell.text} query={query} />
        </span>
      );
    case 'phone':
      return (
        <span className="phone">
          <a href={`tel:${String(cell.value).replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()}>
            <Highlight text={cell.text} query={query} />
          </a>
          <button
            className="icon-btn tiny copy"
            title="Nusxa olish"
            onClick={(e) => {
              e.stopPropagation();
              copyText(String(cell.value));
            }}
          >
            <Copy size={12} />
          </button>
        </span>
      );
    default:
      return <Highlight text={cell.text} query={query} />;
  }
}
