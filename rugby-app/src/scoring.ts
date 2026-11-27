import type { Match } from './data';

/** How one side scored. */
export interface Breakdown {
  tries: number;
  conversions: number;
  penalties: number;
  dropGoals: number;
  marks: number; // goals from a mark (abolished in 1977)
  penaltyTries: number;
}

export const SCORE_KINDS: { key: keyof Breakdown; label: string; plural: string }[] = [
  { key: 'tries', label: 'Try', plural: 'Tries' },
  { key: 'conversions', label: 'Conversion', plural: 'Conversions' },
  { key: 'penalties', label: 'Penalty goal', plural: 'Penalty goals' },
  { key: 'dropGoals', label: 'Drop goal', plural: 'Drop goals' },
  { key: 'marks', label: 'Goal from a mark', plural: 'Goals from a mark' },
  { key: 'penaltyTries', label: 'Penalty try', plural: 'Penalty tries' },
];

/**
 * Points per scoring action, by era: the archive's own table (scoring.rows in its data).
 * A conversion is the bonus added to a try; until 2017 a penalty try was worth a try and
 * could be converted, since 2017 it is worth 7 points outright.
 */
const ERAS: { from: number; values: Record<keyof Breakdown, number> }[] = [
  [1885, 1, 2, 0, 3, 3, 1],
  [1891, 1, 2, 2, 3, 3, 1],
  [1892, 2, 3, 3, 4, 4, 2],
  [1894, 3, 2, 3, 4, 4, 3],
  [1905, 3, 2, 3, 4, 3, 3],
  [1949, 3, 2, 3, 3, 3, 3],
  [1971, 4, 2, 3, 3, 3, 4],
  [1978, 4, 2, 3, 3, 0, 4],
  [1992, 5, 2, 3, 3, 0, 5],
  [2017, 5, 2, 3, 3, 0, 7],
].map(([from, tries, conversions, penalties, dropGoals, marks, penaltyTries]) => ({
  from,
  values: { tries, conversions, penalties, dropGoals, marks, penaltyTries },
}));

/** Up to 1884 a score was a count of goals; an unconverted try scored nothing. */
export const GOALS_ERA_END = 1884;

export function pointValues(year: number): Record<keyof Breakdown, number> | null {
  if (year <= GOALS_ERA_END) return null;
  let v = ERAS[0].values;
  for (const e of ERAS) if (year >= e.from) v = e.values;
  return v;
}

export function pointsFrom(b: Breakdown, year: number): number {
  const v = pointValues(year);
  if (!v) return b.conversions + b.dropGoals + b.marks; // goals
  return SCORE_KINDS.reduce((s, k) => s + b[k.key] * v[k.key], 0);
}

/**
 * True when the breakdown adds up to the official score with the values of its era. A few
 * 1880s matches do not (scoring rules were still settling), so their points split is not shown.
 */
export function breakdownMatchesScore(m: Match): boolean {
  if (!m.breakdown) return false;
  return pointsFrom(m.breakdown.home, m.year) === m.homeScore && pointsFrom(m.breakdown.away, m.year) === m.awayScore;
}

/** Totals of each scoring action for one team over a set of matches (only those with a breakdown). */
export function scoringTotals(matches: Match[], teamName: string): { covered: number; for: Breakdown; against: Breakdown } {
  const zero = (): Breakdown => ({ tries: 0, conversions: 0, penalties: 0, dropGoals: 0, marks: 0, penaltyTries: 0 });
  const out = { covered: 0, for: zero(), against: zero() };
  for (const m of matches) {
    if (!m.breakdown || (m.home !== teamName && m.away !== teamName)) continue;
    out.covered++;
    const [mine, theirs] = m.home === teamName ? [m.breakdown.home, m.breakdown.away] : [m.breakdown.away, m.breakdown.home];
    for (const k of SCORE_KINDS) {
      out.for[k.key] += mine[k.key];
      out.against[k.key] += theirs[k.key];
    }
  }
  return out;
}
