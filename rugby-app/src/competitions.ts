import type { Match } from './data';
import { addTo, emptyRecord, viewFor, type Record as Rec } from './stats';

export interface Family {
  id: string;
  label: string;
  /** decides whether a match belongs to the family */
  test: (m: Match) => boolean;
  /** show computed standings (round-robin style competitions only) */
  table: boolean;
}

export const FAMILIES: Family[] = [
  { id: 'world-cup', label: 'Rugby World Cup', test: (m) => m.worldCup, table: true },
  {
    id: 'six-nations',
    label: 'Six Nations',
    test: (m) => /(Home|Five|Six) Nations Championship/.test(m.competition),
    table: true,
  },
  {
    id: 'rugby-championship',
    label: 'Tri Nations / Rugby Championship',
    test: (m) => /^(\d{4} )?(Tri Nations( Series)?|(The )?Rugby Championship)$/.test(m.competition),
    table: true,
  },
  { id: 'nations-championship', label: 'Nations Championship', test: (m) => /^\d{4} Nations Championship$/.test(m.competition), table: true },
  { id: 'nations-cup', label: 'World Rugby Nations Cup', test: (m) => /World Rugby Nations Cup/.test(m.competition), table: true },
  { id: 'pacific', label: 'Pacific Nations Cup', test: (m) => /Pacific Nations Cup/.test(m.competition), table: true },
  {
    id: 'europe',
    label: 'European Championship',
    test: (m) => /Rugby Europe|European Nations Cup|FIRA (Trophy|Nations Cup)/.test(m.competition),
    table: true,
  },
  { id: 'autumn', label: 'Autumn Nations', test: (m) => /Autumn Nations (Series|Cup)/.test(m.competition), table: false },
  {
    id: 'qualifying',
    label: 'World Cup qualifying',
    test: (m) => !m.worldCup && /Rugby World Cup (Qualifying|Final Qualification|qualification)/i.test(m.competition),
    table: false,
  },
];

/** Family ids used before the app was translated, so old links keep working. */
export const FAMILY_ALIASES: Record<string, string> = { 'coupe-du-monde': 'world-cup', automne: 'autumn', qualifications: 'qualifying' };

export interface Edition {
  family: Family;
  key: string; // usually the year
  label: string;
  matches: Match[]; // chronological
  /** matches attached by an inference rule (no competition name in the source) */
  inferred: number;
}

/**
 * The source leaves many matches without a competition name (Five Nations 1952–1999, early
 * Tri-Nations, Rugby Championship 2021 and 2023). These rules attach them using the teams and
 * dates of each tournament. `dedupe` keeps only the first meeting of a pair in a season, which
 * drops one-off specials played in the same window (1971 centenary match, 1988 Millennium match,
 * NZ's extra tests in South Africa in 1996, the third 1998 Bledisloe test).
 */
interface Rule {
  family: string;
  years: [number, number];
  /** month-day window, inclusive, 'MM-DD' */
  window: [string, string];
  teams: string[];
  dedupe?: 'pair' | 'ordered';
  /** also accept matches named like this (default: only unnamed matches) */
  alsoNamed?: RegExp;
}

const FIVE = ['England', 'France', 'Ireland', 'Scotland', 'Wales'];
const SANZAR = ['New Zealand', 'South Africa', 'Australia'];

export const RULES: Rule[] = [
  { family: 'six-nations', years: [1952, 1999], window: ['01-01', '04-30'], teams: FIVE, dedupe: 'pair' },
  // 1962: Ireland–Wales postponed to November (smallpox outbreak in Wales).
  { family: 'six-nations', years: [1962, 1962], window: ['11-17', '11-17'], teams: ['Ireland', 'Wales'] },
  { family: 'rugby-championship', years: [1996, 1999], window: ['07-06', '08-31'], teams: SANZAR, dedupe: 'ordered' },
  // 2021: played in hubs, so home/away pairs repeat; the 7 August Bledisloe test came before.
  { family: 'rugby-championship', years: [2021, 2021], window: ['08-14', '10-02'], teams: [...SANZAR, 'Argentina'] },
  // 2023: single round before the World Cup; August matches were warm-ups.
  { family: 'rugby-championship', years: [2023, 2023], window: ['07-08', '07-29'], teams: [...SANZAR, 'Argentina'] },
  // 2025: the 27 September match counted for both trophies but is only named "Bledisloe Cup".
  { family: 'rugby-championship', years: [2025, 2025], window: ['09-27', '09-27'], teams: SANZAR, alsoNamed: /Bledisloe/ },
];

function ruleFor(m: Match): Rule | undefined {
  const md = m.date.slice(5);
  return RULES.find(
    (r) =>
      (!m.competition || r.alsoNamed?.test(m.competition)) &&
      m.year >= r.years[0] &&
      m.year <= r.years[1] &&
      md >= r.window[0] &&
      md <= r.window[1] &&
      r.teams.includes(m.home) &&
      r.teams.includes(m.away),
  );
}

/** Year of an edition: the first 4-digit year in the competition name, else the match year. */
function editionKey(f: Family, m: Match): string {
  if (f.id === 'world-cup') return String(m.year);
  return m.competition.match(/\d{4}/)?.[0] ?? String(m.year);
}

function editionLabel(f: Family, key: string, names: string[], year?: number): string {
  if (f.id === 'world-cup') return `${key} Rugby World Cup`;
  if (f.id === 'six-nations') {
    const n = names[0] ?? '';
    const y = year ?? Number(key);
    const kind =
      n.includes('Home') || (!n && y < 1910) ? 'Home Nations Championship' : n.includes('Six') || y >= 2000 ? 'Six Nations Championship' : 'Five Nations Championship';
    return `${key} ${kind}`;
  }
  if (f.id === 'rugby-championship') return `${key} ${Number(key) < 2012 ? 'Tri Nations' : 'Rugby Championship'}`;
  // Keep the source's own name (e.g. "2008-10 European Nations Cup Division 1A") when it carries the year.
  const withYear = names.find((n) => n.includes(key));
  return withYear ?? `${key} ${f.label}`;
}

/** Group matches by competition family, then by edition (most recent first). */
export function buildEditions(matches: Match[]): Map<string, Edition[]> {
  const chrono = [...matches].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const byFamily = new Map<string, Map<string, { ms: Match[]; inferred: number }>>();
  const slot = (fid: string, key: string) => {
    const eds = byFamily.get(fid) ?? new Map<string, { ms: Match[]; inferred: number }>();
    byFamily.set(fid, eds);
    const e = eds.get(key) ?? { ms: [], inferred: 0 };
    eds.set(key, e);
    return e;
  };
  // 1. named matches
  const pending: Match[] = [];
  for (const m of chrono) {
    const f = FAMILIES.find((x) => x.test(m));
    if (f) slot(f.id, editionKey(f, m)).ms.push(m);
    else pending.push(m);
  }
  // 2. inference rules, in date order so dedupe keeps the first meeting
  for (const m of pending) {
    const r = ruleFor(m);
    if (!r) continue;
    const e = slot(r.family, String(m.year));
    const same = (x: Match) =>
      r.dedupe === 'ordered' ? x.home === m.home && x.away === m.away : r.dedupe === 'pair' ? (x.home === m.home && x.away === m.away) || (x.home === m.away && x.away === m.home) : false;
    if (r.dedupe && e.ms.some(same)) continue;
    e.ms.push(m);
    e.inferred++;
  }
  const out = new Map<string, Edition[]>();
  for (const f of FAMILIES) {
    const eds = byFamily.get(f.id);
    if (!eds) continue;
    const list = [...eds.entries()].map(([key, { ms, inferred }]) => {
      const sorted = [...ms].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const names = [...new Set(sorted.map((m) => m.competition).filter(Boolean))];
      return { family: f, key, label: editionLabel(f, key, names, sorted[0]?.year), matches: sorted, inferred };
    });
    list.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    out.set(f.id, list);
  }
  return out;
}

export interface Standing extends Rec {
  team: string;
  points: number; // 2 per win, 1 per draw (no bonus points: tries are not in the data)
}

/**
 * Standings of a round-robin phase. Teams are split into groups that never met (World Cup pools),
 * each sorted by points, then points difference, then points scored.
 */
export function standings(matches: Match[]): Standing[][] {
  const recs = new Map<string, Standing>();
  const parent = new Map<string, string>();
  const find = (t: string): string => {
    const p = parent.get(t) ?? t;
    if (p === t) return t;
    const r = find(p);
    parent.set(t, r);
    return r;
  };
  for (const m of matches) {
    for (const t of [m.home, m.away]) {
      if (!recs.has(t)) recs.set(t, { team: t, points: 0, ...emptyRecord() });
      if (!parent.has(t)) parent.set(t, t);
      const r = recs.get(t)!;
      const v = viewFor(t, m);
      addTo(r, v);
      r.points += v.outcome === 'W' ? 2 : v.outcome === 'D' ? 1 : 0;
    }
    parent.set(find(m.home), find(m.away));
  }
  const groups = new Map<string, Standing[]>();
  for (const r of recs.values()) {
    const g = find(r.team);
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  const sortRows = (rows: Standing[]) =>
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
        b.pointsFor - a.pointsFor ||
        a.team.localeCompare(b.team),
    );
  return [...groups.values()].map(sortRows).sort((a, b) => b.length - a.length || (a[0].team < b[0].team ? -1 : 1));
}

export interface Round {
  label: string;
  matches: Match[];
}

/**
 * World Cups 1987–2023 all end with the same 8 knockout matches: 4 quarter-finals, 2 semi-finals,
 * the bronze final and the final. Returns null for other formats (2027 adds a round of 16).
 */
export function worldCupPhases(ed: Edition): { pools: Match[]; rounds: Round[] } | null {
  if (ed.family.id !== 'world-cup' || Number(ed.key) > 2023 || ed.matches.length < 9) return null;
  const ms = ed.matches;
  const ko = ms.slice(-8);
  return {
    pools: ms.slice(0, -8),
    rounds: [
      { label: 'Quarter-finals', matches: ko.slice(0, 4) },
      { label: 'Semi-finals', matches: ko.slice(4, 6) },
      { label: 'Bronze final', matches: [ko[6]] },
      { label: 'Final', matches: [ko[7]] },
    ],
  };
}

export function winner(m: Match): string | null {
  return m.homeScore > m.awayScore ? m.home : m.awayScore > m.homeScore ? m.away : null;
}

/** Matches of an edition's competition(s) that are missing because one side is not in the app. */
export interface LeftOut {
  leftOut: number;
  teams: string[];
}

export function leftOutFor(ed: Edition, meta: Record<string, LeftOut>): LeftOut | null {
  let n = 0;
  const teams = new Set<string>();
  for (const name of new Set(ed.matches.map((m) => m.competition))) {
    const e = meta[name];
    if (!e) continue;
    n += e.leftOut;
    e.teams.forEach((t) => teams.add(t));
  }
  return n ? { leftOut: n, teams: [...teams] } : null;
}
