import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { matchesFromCSV } from './data';
import { breakdownMatchesScore, pointsFrom, scoringTotals } from './scoring';

const all = matchesFromCSV(readFileSync(new URL('../public/data/rugby_results.csv', import.meta.url), 'utf8'));
const withBreakdown = all.filter((m) => m.breakdown);

describe('scoring breakdowns', () => {
  it('are parsed for the matches that have one', () => {
    expect(withBreakdown.length).toBeGreaterThanOrEqual(1397);
  });

  it('add up to the official score for every match since 1890', () => {
    const wrong = withBreakdown.filter((m) => m.year >= 1890 && !breakdownMatchesScore(m));
    expect(wrong.map((m) => `${m.date} ${m.home} ${m.homeScore}-${m.awayScore} ${m.away}`)).toEqual([]);
  });

  it('2003 World Cup final: Australia 1 try + 4 penalties, England 1 try + 4 penalties + Wilkinson’s drop goal', () => {
    const f = all.find((m) => m.date === '2003-11-22' && m.worldCup)!;
    expect(f.breakdown!.home).toMatchObject({ tries: 1, conversions: 0, penalties: 4, dropGoals: 0 });
    expect(f.breakdown!.away).toMatchObject({ tries: 1, conversions: 0, penalties: 4, dropGoals: 1 });
    expect(breakdownMatchesScore(f)).toBe(true);
  });

  it('some matches have no breakdown (e.g. the 2023 World Cup final)', () => {
    expect(all.find((m) => m.date === '2023-10-28' && m.worldCup)!.breakdown).toBeUndefined();
  });

  it('uses the values of each era (try worth 3 in 1950, 4 in 1980, 5 since 1992; penalty try 7 since 2017)', () => {
    const b = { tries: 1, conversions: 0, penalties: 0, dropGoals: 0, marks: 0, penaltyTries: 0 };
    expect(pointsFrom(b, 1950)).toBe(3);
    expect(pointsFrom(b, 1980)).toBe(4);
    expect(pointsFrom(b, 2000)).toBe(5);
    expect(pointsFrom({ ...b, tries: 0, penaltyTries: 1 }, 2020)).toBe(7);
  });

  it('totals only count matches with a breakdown', () => {
    const t = scoringTotals(all, 'France');
    expect(t.covered).toBe(withBreakdown.filter((m) => m.home === 'France' || m.away === 'France').length);
    expect(t.for.tries).toBeGreaterThan(0);
  });

  it('ESPN fills breakdowns the archive lacks (1987–2020)', () => {
    expect(withBreakdown.filter((m) => m.breakdownSource === 'espn').length).toBeGreaterThan(2000);
  });

  it('no scoring timeline or per-match detail files are published', () => {
    expect(existsSync(new URL('../public/data/details', import.meta.url))).toBe(false);
  });
});
