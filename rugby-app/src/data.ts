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
  fr: string;
  flag: string;
  color: string;
}

export const TEAMS: TeamInfo[] = [
  { name: 'France', fr: 'France', flag: '🇫🇷', color: '#1d4ed8' },
  { name: 'New Zealand', fr: 'Nouvelle-Zélande', flag: '🇳🇿', color: '#111827' },
  { name: 'South Africa', fr: 'Afrique du Sud', flag: '🇿🇦', color: '#047857' },
  { name: 'Ireland', fr: 'Irlande', flag: '☘️', color: '#16a34a' },
  { name: 'England', fr: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#be123c' },
  { name: 'Australia', fr: 'Australie', flag: '🇦🇺', color: '#ca8a04' },
  { name: 'Scotland', fr: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#1e3a8a' },
  { name: 'Wales', fr: 'Pays de Galles', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', color: '#dc2626' },
  { name: 'Argentina', fr: 'Argentine', flag: '🇦🇷', color: '#0284c7' },
  { name: 'Italy', fr: 'Italie', flag: '🇮🇹', color: '#2563eb' },
];

const BY_NAME = new Map(TEAMS.map((t) => [t.name, t]));

export function team(name: string): TeamInfo {
  return BY_NAME.get(name) ?? { name, fr: name, flag: '🏉', color: '#64748b' };
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

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
}
