import {
  AlertOctagon,
  BadgeCheck,
  Building2,
  CircleSlash,
  Clock,
  Copy,
  FileBadge,
  FileWarning,
  Hourglass,
  Layers,
  Truck,
  User,
  UserX,
  Users,
} from 'lucide-react';
import { parseDate } from '../lib/normalize';
import { Empty } from '../table/CellView';
import type { EnumOption, PageConfig, Row } from '../table/types';
import { Badge, Chip, Highlight } from '../table/ui';

const COUNTRIES: Record<string, EnumOption> = {
  UZ: { label: 'O‘zbekiston', tone: 'violet' },
  KZ: { label: 'Qozog‘iston', tone: 'blue' },
  KG: { label: 'Qirg‘iziston', tone: 'teal' },
  TJ: { label: 'Tojikiston', tone: 'green' },
  RU: { label: 'Rossiya', tone: 'red' },
  CN: { label: 'Xitoy', tone: 'amber' },
};

/* ------------------------------------------------------------------ Trips */

export const tripsConfig: PageConfig = {
  id: 'trips',
  title: 'Reyslar',
  subtitle: 'Yuk tashish reyslari: yo‘nalish, haydovchi, transport va narx',
  file: 'trips.json',
  icon: <Truck size={18} />,
  keyField: 'id',
  columns: [
    { id: 'id', label: 'ID', type: 'text', width: 96, pinned: true },
    {
      id: 'status',
      label: 'Holat',
      type: 'enum',
      width: 150,
      options: {
        PENDING: { label: 'Kutilmoqda', tone: 'amber' },
        IN_TRANSIT: { label: 'Yo‘lda', tone: 'blue' },
        DELIVERED: { label: 'Yetkazildi', tone: 'green' },
        DISPUTED: { label: 'Nizoli', tone: 'red' },
        CANCELLED: { label: 'Bekor qilingan', tone: 'gray' },
      },
      hint: 'Noma’lum holatlar (masalan, yangi kod) ham ko‘rsatiladi — kulrang belgida',
    },
    { id: 'cargo.name', label: 'Yuk', type: 'text', width: 170 },
    { id: 'cargo.weight_t', label: 'Og‘irlik, t', type: 'number', width: 104, digits: 1 },
    {
      id: 'route.from',
      label: 'Qayerdan',
      type: 'text',
      width: 140,
      render: (cell, row, ctx) => <City text={cell.text} code={row['route.from_country']} query={ctx.query} />,
    },
    {
      id: 'route.to',
      label: 'Qayerga',
      type: 'text',
      width: 140,
      render: (cell, row, ctx) => <City text={cell.text} code={row['route.to_country']} query={ctx.query} />,
    },
    { id: 'route.from_country', label: 'Jo‘nash davlati', type: 'enum', width: 140, options: COUNTRIES, hidden: true },
    { id: 'route.to_country', label: 'Borish davlati', type: 'enum', width: 140, options: COUNTRIES, hidden: true },
    {
      id: 'driver.name',
      label: 'Haydovchi',
      type: 'text',
      width: 170,
      render: (cell, _row, ctx) =>
        cell.value === null ? (
          <Badge tone="red">Biriktirilmagan</Badge>
        ) : (
          <span className="person">
            <User size={13} />
            <Highlight text={cell.text} query={ctx.query} />
          </span>
        ),
    },
    { id: 'driver.phone', label: 'Telefon', type: 'phone', width: 170 },
    { id: 'driver.id', label: 'Haydovchi ID', type: 'text', width: 110, hidden: true },
    {
      id: 'vehicle.plate',
      label: 'Davlat raqami',
      type: 'text',
      width: 130,
      render: (cell, _r, ctx) => (cell.value === null ? <Empty /> : <span className="plate"><Highlight text={cell.text} query={ctx.query} /></span>),
    },
    { id: 'vehicle.model', label: 'Model', type: 'text', width: 120 },
    {
      id: 'vehicle.trailer_plate',
      label: 'Pritsep',
      type: 'text',
      width: 130,
      render: (cell, _r, ctx) => (cell.value === null ? <Empty /> : <span className="plate alt"><Highlight text={cell.text} query={ctx.query} /></span>),
    },
    { id: 'agreed_price', label: 'Narx', type: 'money', width: 150, currencyId: 'agreed_currency', hint: 'Valyutalar aralash bo‘lgani uchun avval valyuta, so‘ng summa bo‘yicha saralanadi' },
    {
      id: 'agreed_currency',
      label: 'Valyuta',
      type: 'enum',
      width: 100,
      options: { UZS: { label: 'UZS', tone: 'violet' }, USD: { label: 'USD', tone: 'green' } },
    },
    { id: 'created_at', label: 'Yaratilgan', type: 'date', width: 150, withTime: true },
    { id: 'completed_at', label: 'Yakunlangan', type: 'date', width: 150, withTime: true },
    {
      id: 'tags',
      label: 'Teglar',
      type: 'tags',
      width: 210,
      options: {
        ADR: { label: 'ADR', tone: 'amber' },
        TIR: { label: 'TIR', tone: 'blue' },
        xavfli: { label: 'xavfli', tone: 'red' },
        muzlatilgan: { label: 'muzlatilgan', tone: 'teal' },
        shoshilinch: { label: 'shoshilinch', tone: 'pink' },
      },
    },
  ],
  alert: { columnId: 'status', values: ['DISPUTED'], label: 'Nizoli reyslar' },
  stats: [
    { label: 'Jami reyslar', tone: 'violet', icon: <Layers size={18} /> },
    { label: 'Yo‘lda', tone: 'blue', icon: <Truck size={18} />, columnId: 'status', values: ['IN_TRANSIT'] },
    { label: 'Kutilmoqda', tone: 'amber', icon: <Clock size={18} />, columnId: 'status', values: ['PENDING'] },
    { label: 'Nizoli', tone: 'red', icon: <AlertOctagon size={18} />, columnId: 'status', values: ['DISPUTED'] },
    { label: 'Haydovchisiz', tone: 'gray', icon: <UserX size={18} />, columnId: 'driver.name', values: ['__blank__'] },
  ],
};

function City({ text, code, query }: { text: string; code: unknown; query: string }) {
  if (!text) return <Empty />;
  return (
    <span className="city">
      <Highlight text={text} query={query} />
      {typeof code === 'string' && code ? (
        <em title={COUNTRIES[code]?.label ?? code}>{code}</em>
      ) : (
        <em className="none" title="Davlat ko‘rsatilmagan">?</em>
      )}
    </span>
  );
}

/* --------------------------------------------------------- Counterparties */

const ROLES: Record<string, EnumOption> = {
  carrier: { label: 'Tashuvchi', tone: 'blue' },
  cargo_owner: { label: 'Yuk egasi', tone: 'violet' },
  vehicle_owner: { label: 'Transport egasi', tone: 'teal' },
  forwarder: { label: 'Ekspeditor', tone: 'amber' },
  driver: { label: 'Haydovchi', tone: 'pink' },
};

export const counterpartiesConfig: PageConfig = {
  id: 'counterparties',
  title: 'Kontragentlar',
  subtitle: 'Kompaniyalar va jismoniy shaxslar, ularning rollari va rekvizitlari',
  file: 'counterparties.json',
  icon: <Users size={18} />,
  keyField: 'key',
  columns: [
    {
      id: 'name',
      label: 'Nomi',
      type: 'text',
      width: 250,
      pinned: true,
      render: (cell, row, ctx) => (
        <span className="person">
          {row.kind === 'legal' ? <Building2 size={13} /> : <User size={13} />}
          <Highlight text={cell.text} query={ctx.query} />
          {row.has_duplicates === true && (
            <span className="dup" title="Bazada dublikat yozuvlari bor">
              <Copy size={11} />
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'kind',
      label: 'Turi',
      type: 'enum',
      width: 130,
      options: { legal: { label: 'Yuridik', tone: 'violet' }, physical: { label: 'Jismoniy', tone: 'teal' } },
    },
    {
      id: 'roles',
      label: 'Rollar',
      type: 'tags',
      width: 280,
      options: ROLES,
      render: (cell, _r, ctx) =>
        cell.value === null ? (
          <span className="muted">Rol belgilanmagan</span>
        ) : (
          <span className="chips">
            {(cell.value as string[]).map((r) => (
              <Chip key={r} tone={ROLES[r]?.tone ?? 'gray'}>
                <Highlight text={ROLES[r]?.label ?? r} query={ctx.query} />
              </Chip>
            ))}
          </span>
        ),
    },
    { id: 'phone', label: 'Telefon', type: 'phone', width: 170 },
    { id: 'inn', label: 'STIR (INN)', type: 'text', width: 120, hint: 'Yuridik shaxslar uchun soliq raqami' },
    { id: 'pinfl', label: 'JSHSHIR (PINFL)', type: 'text', width: 160, hint: 'Jismoniy shaxslar uchun' },
    { id: 'rows', label: 'Yozuvlar', type: 'number', width: 100, hint: 'Bog‘langan yozuvlar soni' },
    { id: 'since', label: 'Hamkorlik boshlangan', type: 'date', width: 170 },
    {
      id: 'has_duplicates',
      label: 'Dublikat',
      type: 'bool',
      width: 120,
      options: { true: { label: 'Bor', tone: 'amber' }, false: { label: 'Yo‘q', tone: 'gray' } },
    },
    { id: 'key', label: 'Kalit', type: 'text', width: 90, hidden: true },
  ],
  knownExtras: {
    'extra.note': { label: 'Izoh', type: 'enum', options: { VIP: { label: 'VIP', tone: 'amber' } } },
    'extra.score': { label: 'Reyting', type: 'number', digits: 1, width: 100 },
  },
  stats: [
    { label: 'Jami', tone: 'violet', icon: <Layers size={18} /> },
    { label: 'Yuridik', tone: 'blue', icon: <Building2 size={18} />, columnId: 'kind', values: ['legal'] },
    { label: 'Jismoniy', tone: 'teal', icon: <User size={18} />, columnId: 'kind', values: ['physical'] },
    { label: 'Dublikatli', tone: 'amber', icon: <Copy size={18} />, columnId: 'has_duplicates', values: ['true'] },
    { label: 'Telefonsiz', tone: 'gray', icon: <CircleSlash size={18} />, columnId: 'phone', values: ['__blank__'] },
  ],
};

/* --------------------------------------------------------------- Licenses */

const DAY = 864e5;
function daysLeft(row: Row): number | null {
  const ms = parseDate(row.valid_to);
  if (ms === null) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((ms - today) / DAY);
}

const EXPIRING_DAYS = 30;

export const licensesConfig: PageConfig = {
  id: 'licenses',
  title: 'Litsenziyalar',
  subtitle: 'Tashuvchilar litsenziyalari reestri va amal qilish muddatlari',
  file: 'licenses.json',
  icon: <FileBadge size={18} />,
  keyField: 'id',
  columns: [
    {
      id: '__number',
      label: 'Litsenziya',
      type: 'text',
      width: 130,
      pinned: true,
      get: (r) => [r.series, r.number].filter((x) => x != null && x !== '').join(' ') || null,
      render: (cell, _r, ctx) => (cell.value === null ? <Empty /> : <span className="mono"><Highlight text={cell.text} query={ctx.query} /></span>),
    },
    {
      id: '__status',
      label: 'Holat',
      type: 'enum',
      width: 160,
      hint: `Amal qilish muddatidan hisoblanadi: ${EXPIRING_DAYS} kundan kam qolgan bo‘lsa — «Tugayapti»`,
      get: (r) => {
        const d = daysLeft(r);
        if (d === null) return 'unknown';
        if (d < 0) return 'expired';
        if (d <= EXPIRING_DAYS) return 'expiring';
        return 'active';
      },
      options: {
        active: { label: 'Amal qiladi', tone: 'green' },
        expiring: { label: 'Tugayapti', tone: 'amber' },
        expired: { label: 'Muddati o‘tgan', tone: 'red' },
        unknown: { label: 'Muddat yo‘q', tone: 'gray' },
      },
    },
    { id: 'valid_to', label: 'Amal qilish muddati', type: 'date', width: 175 },
    {
      id: '__days',
      label: 'Qolgan kun',
      type: 'number',
      width: 140,
      get: daysLeft,
      render: (cell) => {
        if (cell.value === null) return <Empty />;
        const d = cell.value as number;
        return <span className={`num days ${d < 0 ? 'neg' : d <= EXPIRING_DAYS ? 'warn' : ''}`}>{d < 0 ? `${-d} kun o‘tdi` : `${d} kun`}</span>;
      },
    },
    { id: 'owner.name', label: 'Egasi', type: 'text', width: 180 },
    { id: 'owner.address', label: 'Manzil', type: 'text', width: 130 },
    {
      id: 'vehicle.plate',
      label: 'Davlat raqami',
      type: 'text',
      width: 130,
      render: (cell, _r, ctx) => (cell.value === null ? <Empty /> : <span className="plate"><Highlight text={cell.text} query={ctx.query} /></span>),
    },
    {
      id: 'vehicle.kind',
      label: 'Transport turi',
      type: 'enum',
      width: 140,
      options: { power: { label: 'Tortuvchi', tone: 'violet' }, trailer: { label: 'Pritsep', tone: 'blue' } },
    },
    { id: 'vehicle.model', label: 'Model', type: 'text', width: 120 },
    {
      id: 'driver.name',
      label: 'Haydovchi',
      type: 'text',
      width: 170,
      render: (cell, _r, ctx) =>
        cell.value === null ? <span className="muted">Biriktirilmagan</span> : <span className="person"><User size={13} /><Highlight text={cell.text} query={ctx.query} /></span>,
    },
    {
      id: 'files',
      label: 'Fayllar',
      type: 'tags',
      width: 220,
      render: (cell) =>
        cell.value === null ? (
          <span className="muted file-none">
            <FileWarning size={13} /> Fayl yo‘q
          </span>
        ) : (
          <span className="chips">
            {(cell.value as string[]).map((f) => (
              <Chip key={f} tone={f.endsWith('.pdf') ? 'red' : 'blue'}>
                {f}
              </Chip>
            ))}
          </span>
        ),
    },
    { id: 'issuer', label: 'Beruvchi organ', type: 'text', width: 150 },
    { id: 'series', label: 'Seriya', type: 'enum', width: 90, hidden: true },
    { id: 'number', label: 'Raqam', type: 'text', width: 100, hidden: true },
    { id: 'id', label: 'ID', type: 'text', width: 80, hidden: true },
  ],
  alert: { columnId: '__status', values: ['expired'], label: 'Muddati o‘tgan litsenziyalar' },
  stats: [
    { label: 'Jami', tone: 'violet', icon: <Layers size={18} /> },
    { label: 'Amal qiladi', tone: 'green', icon: <BadgeCheck size={18} />, columnId: '__status', values: ['active'] },
    { label: 'Tugayapti', tone: 'amber', icon: <Hourglass size={18} />, columnId: '__status', values: ['expiring'] },
    { label: 'Muddati o‘tgan', tone: 'red', icon: <AlertOctagon size={18} />, columnId: '__status', values: ['expired'] },
    { label: 'Faylsiz', tone: 'gray', icon: <FileWarning size={18} />, columnId: 'files', values: ['__blank__'] },
  ],
};

export const PAGES = [tripsConfig, counterpartiesConfig, licensesConfig];
