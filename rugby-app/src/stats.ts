import type { Match } from './data';

export type Outcome = 'W' | 'D' | 'L';

/** A match seen from one team's point of view. */
export interface TeamView {
  match: Match;
  for: number;
  against: number;
  outcome: Outcome;
  venue: 'home' | 'away' | 'neutral';
}

export function viewFor(teamName: string, m: Match): TeamView {
  const isHome = m.home === teamName;
  const f = isHome ? m.homeScore : m.awayScore;
  const a = isHome ? m.awayScore : m.homeScore;
  return {
    match: m,
    for: f,
    against: a,
    outcome: f > a ? 'W' : f < a ? 'L' : 'D',
    venue: m.neutral ? 'neutral' : isHome ? 'home' : 'away',
  };
}

export interface Record {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export const emptyRecord = (): Record => ({ played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });

export function addTo(r: Record, v: TeamView): void {
  r.played++;
  r.pointsFor += v.for;
  r.pointsAgainst += v.against;
  if (v.outcome === 'W') r.wins++;
  else if (v.outcome === 'L') r.losses++;
  else r.draws++;
}

export function winRate(r: Record): number {
  return r.played ? r.wins / r.played : 0;
}

export interface Streak {
  team: 'A' | 'B' | 'draw' | null;
  length: number;
  from?: string;
  to?: string;
}

export interface DecadeRow {
  decade: number;
  winsA: number;
  draws: number;
  winsB: number;
}

export interface HeadToHead {
  a: string;
  b: string;
  views: TeamView[]; // chronological, from A's perspective
  total: Record;
  byVenue: { home: Record; away: Record; neutral: Record };
  worldCup: Record;
  last10: Record;
  biggestWinA?: TeamView;
  biggestWinB?: TeamView;
  highestAggregate?: TeamView;
  longestStreakA: Streak;
  longestStreakB: Streak;
  currentStreak: Streak;
  decades: DecadeRow[];
  /** cumulative (wins A − wins B) after each match */
  balance: { date: string; value: number }[];
}

export function involves(m: Match, a: string, b: string): boolean {
  return (m.home === a && m.away === b) || (m.home === b && m.away === a);
}

export function headToHead(all: Match[], a: string, b: string): HeadToHead {
  const views = all
    .filter((m) => involves(m, a, b))
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))
    .map((m) => viewFor(a, m));

  const total = emptyRecord();
  const byVenue = { home: emptyRecord(), away: emptyRecord(), neutral: emptyRecord() };
  const worldCup = emptyRecord();
  const last10 = emptyRecord();
  const decadeMap = new Map<number, DecadeRow>();
  const balance: { date: string; value: number }[] = [];
  let bal = 0;

  let biggestWinA: TeamView | undefined;
  let biggestWinB: TeamView | undefined;
  let highestAggregate: TeamView | undefined;

  let longestStreakA: Streak = { team: 'A', length: 0 };
  let longestStreakB: Streak = { team: 'B', length: 0 };
  let run: Streak = { team: null, length: 0 };

  views.forEach((v, i) => {
    addTo(total, v);
    addTo(byVenue[v.venue], v);
    if (v.match.worldCup) addTo(worldCup, v);
    if (i >= views.length - 10) addTo(last10, v);

    const decade = Math.floor(v.match.year / 10) * 10;
    const row = decadeMap.get(decade) ?? { decade, winsA: 0, draws: 0, winsB: 0 };
    if (v.outcome === 'W') row.winsA++;
    else if (v.outcome === 'L') row.winsB++;
    else row.draws++;
    decadeMap.set(decade, row);

    bal += v.outcome === 'W' ? 1 : v.outcome === 'L' ? -1 : 0;
    balance.push({ date: v.match.date, value: bal });

    const margin = v.for - v.against;
    if (margin > 0 && (!biggestWinA || margin > biggestWinA.for - biggestWinA.against)) biggestWinA = v;
    if (margin < 0 && (!biggestWinB || -margin > biggestWinB.against - biggestWinB.for)) biggestWinB = v;
    if (!highestAggregate || v.for + v.against > highestAggregate.for + highestAggregate.against) highestAggregate = v;

    const who: Streak['team'] = v.outcome === 'W' ? 'A' : v.outcome === 'L' ? 'B' : 'draw';
    if (run.team === who) {
      run = { ...run, length: run.length + 1, to: v.match.date };
    } else {
      run = { team: who, length: 1, from: v.match.date, to: v.match.date };
    }
    if (who === 'A' && run.length > longestStreakA.length) longestStreakA = { ...run };
    if (who === 'B' && run.length > longestStreakB.length) longestStreakB = { ...run };
  });

  // Fill empty decades between first and last so the chart has a continuous axis.
  const decades: DecadeRow[] = [];
  if (decadeMap.size) {
    const keys = [...decadeMap.keys()];
    for (let d = Math.min(...keys); d <= Math.max(...keys); d += 10) {
      decades.push(decadeMap.get(d) ?? { decade: d, winsA: 0, draws: 0, winsB: 0 });
    }
  }

  return {
    a,
    b,
    views,
    total,
    byVenue,
    worldCup,
    last10,
    biggestWinA,
    biggestWinB,
    highestAggregate,
    longestStreakA,
    longestStreakB,
    currentStreak: run,
    decades,
    balance,
  };
}

/** Record of `team` against every opponent, plus its overall record. */
export function teamRecords(all: Match[], teamName: string, fromYear = 0): { overall: Record; byOpponent: Map<string, Record> } {
  const overall = emptyRecord();
  const byOpponent = new Map<string, Record>();
  for (const m of all) {
    if (m.year < fromYear) continue;
    if (m.home !== teamName && m.away !== teamName) continue;
    const v = viewFor(teamName, m);
    const opp = m.home === teamName ? m.away : m.home;
    const r = byOpponent.get(opp) ?? emptyRecord();
    addTo(r, v);
    addTo(overall, v);
    byOpponent.set(opp, r);
  }
  return { overall, byOpponent };
}
