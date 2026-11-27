export interface Match {
  id: string;
  date: string; // ISO yyyy-mm-dd
  year: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  stadium: string;
  city: string;
  country: string;
  neutral: boolean;
  worldCup: boolean;
  /** true when the match was added by the user (stored in the browser) */
  local?: boolean;
}

export interface TeamInfo {
  name: string; // name as found in the dataset
  display: string; // name shown in the app
  flag: string;
  /** Six Nations + Rugby Championship */
  tier1?: boolean;
  /** qualified for the 2027 Men's Rugby World Cup */
  rwc2027?: boolean;
}

/** Every nation that has played a Rugby World Cup (1987–2023), plus Hong Kong China (qualified for 2027). */
export const TEAMS: TeamInfo[] = [
  { name: 'France', display: 'France', flag: '🇫🇷', tier1: true, rwc2027: true },
  { name: 'New Zealand', display: 'New Zealand', flag: '🇳🇿', tier1: true, rwc2027: true },
  { name: 'South Africa', display: 'South Africa', flag: '🇿🇦', tier1: true, rwc2027: true },
  { name: 'Ireland', display: 'Ireland', flag: '☘️', tier1: true, rwc2027: true },
  { name: 'England', display: 'England', flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', tier1: true, rwc2027: true },
  { name: 'Australia', display: 'Australia', flag: '🇦🇺', tier1: true, rwc2027: true },
  { name: 'Scotland', display: 'Scotland', flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', tier1: true, rwc2027: true },
  { name: 'Wales', display: 'Wales', flag: '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}', tier1: true, rwc2027: true },
  { name: 'Argentina', display: 'Argentina', flag: '🇦🇷', tier1: true, rwc2027: true },
  { name: 'Italy', display: 'Italy', flag: '🇮🇹', tier1: true, rwc2027: true },
  { name: 'Fiji', display: 'Fiji', flag: '🇫🇯', rwc2027: true },
  { name: 'Japan', display: 'Japan', flag: '🇯🇵', rwc2027: true },
  { name: 'Georgia', display: 'Georgia', flag: '🇬🇪', rwc2027: true },
  { name: 'Samoa', display: 'Samoa', flag: '🇼🇸', rwc2027: true },
  { name: 'Tonga', display: 'Tonga', flag: '🇹🇴', rwc2027: true },
  { name: 'Romania', display: 'Romania', flag: '🇷🇴', rwc2027: true },
  { name: 'Spain', display: 'Spain', flag: '🇪🇸', rwc2027: true },
  { name: 'Portugal', display: 'Portugal', flag: '🇵🇹', rwc2027: true },
  { name: 'Uruguay', display: 'Uruguay', flag: '🇺🇾', rwc2027: true },
  { name: 'Chile', display: 'Chile', flag: '🇨🇱', rwc2027: true },
  { name: 'Canada', display: 'Canada', flag: '🇨🇦', rwc2027: true },
  { name: 'USA', display: 'USA', flag: '🇺🇸', rwc2027: true },
  { name: 'Zimbabwe', display: 'Zimbabwe', flag: '🇿🇼', rwc2027: true },
  { name: 'Hong Kong', display: 'Hong Kong China', flag: '🇭🇰', rwc2027: true },
  { name: 'Namibia', display: 'Namibia', flag: '🇳🇦' },
  { name: 'Russia', display: 'Russia', flag: '🇷🇺' },
  { name: 'Ivory Coast', display: 'Ivory Coast', flag: '🇨🇮' },
];

export type TeamGroup = 'tier1' | 'rwc2027' | 'all';
export const GROUPS: { id: TeamGroup; label: string }[] = [
  { id: 'tier1', label: 'Six Nations + Rugby Championship' },
  { id: 'rwc2027', label: 'Qualified for the 2027 World Cup' },
  { id: 'all', label: 'All nations (27)' },
];
export function inGroup(t: TeamInfo, g: TeamGroup): boolean {
  return g === 'all' || (g === 'tier1' ? !!t.tier1 : !!t.rwc2027);
}

const BY_NAME = new Map(TEAMS.map((t) => [t.name, t]));

export const isKnownTeam = (name: string | null): name is string => !!name && BY_NAME.has(name);

export function team(name: string): TeamInfo {
  return BY_NAME.get(name) ?? { name, display: name, flag: '🏉' };
}

/** Minimal RFC-4180 CSV parser (handles quoted fields with commas and "" escapes). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function matchesFromCSV(text: string): Match[] {
  const [header, ...rows] = parseCSV(text);
  const idx = (k: string) => header.indexOf(k);
  const col = {
    date: idx('date'),
    home: idx('home_team'),
    away: idx('away_team'),
    hs: idx('home_score'),
    as: idx('away_score'),
    comp: idx('competition'),
    stadium: idx('stadium'),
    city: idx('city'),
    country: idx('country'),
    neutral: idx('neutral'),
    wc: idx('world_cup'),
  };
  return rows
    .filter((r) => r.length >= header.length)
    .map((r, i) => ({
      id: `d${i}`,
      date: r[col.date],
      year: Number(r[col.date].slice(0, 4)),
      home: r[col.home],
      away: r[col.away],
      homeScore: Number(r[col.hs]),
      awayScore: Number(r[col.as]),
      competition: r[col.comp],
      stadium: r[col.stadium],
      city: r[col.city],
      country: r[col.country],
      neutral: r[col.neutral] === 'True',
      worldCup: r[col.wc] === 'True',
    }));
}

const LOCAL_KEY = 'rugby-face-a-face:local-matches';

export function loadLocalMatches(): Match[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as Match[]) : [];
    return Array.isArray(list) ? list.map((m) => ({ ...m, local: true })) : [];
  } catch {
    return [];
  }
}

export function saveLocalMatches(list: Match[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: matches live for this visit only */
  }
}

export function sortByDateDesc(list: Match[]): Match[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
}

/** Period filter shared by every view. */
export interface Period {
  id: string;
  label: string;
  short: string;
  from: number;
}
export const PERIODS: Period[] = [
  { id: 'all', label: 'Since 1871', short: '1871+', from: 0 },
  { id: 'pro', label: 'Pro era (1995+)', short: '1995+', from: 1995 },
  { id: '2010', label: 'Since 2010', short: '2010+', from: 2010 },
];
export function periodById(id: string | null): Period {
  return PERIODS.find((p) => p.id === id) ?? PERIODS[0];
}
