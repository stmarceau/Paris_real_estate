import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { matchesFromCSV, parseCSV, type Match } from './data';
import { headToHead, teamRecords } from './stats';

const m = (date: string, home: string, away: string, hs: number, as: number, extra: Partial<Match> = {}): Match => ({
  id: date + home,
  date,
  year: Number(date.slice(0, 4)),
  home,
  away,
  homeScore: hs,
  awayScore: as,
  competition: 'Test',
  stadium: '',
  city: '',
  country: home,
  neutral: false,
  worldCup: false,
  ...extra,
});

describe('parseCSV', () => {
  it('handles quoted fields containing commas and escaped quotes', () => {
    expect(parseCSV('a,b\n1,"x, ""y"""\n')).toEqual([
      ['a', 'b'],
      ['1', 'x, "y"'],
    ]);
  });
});

describe('headToHead', () => {
  const data = [
    m('2000-01-01', 'France', 'Italy', 30, 10),
    m('2001-01-01', 'Italy', 'France', 20, 20),
    m('2002-01-01', 'France', 'Italy', 10, 12, { worldCup: true, neutral: true }),
    m('2003-01-01', 'France', 'Italy', 40, 5),
    m('2004-01-01', 'Italy', 'France', 3, 25),
    m('2004-02-01', 'France', 'Wales', 3, 25),
  ];
  const h = headToHead(data, 'France', 'Italy');

  it('counts the record from A’s perspective, ignoring other opponents', () => {
    expect(h.total).toEqual({ played: 5, wins: 3, draws: 1, losses: 1, pointsFor: 125, pointsAgainst: 50 });
  });
  it('splits by venue and world cup', () => {
    expect(h.byVenue.home.played).toBe(2);
    expect(h.byVenue.away.played).toBe(2);
    expect(h.byVenue.neutral.losses).toBe(1);
    expect(h.worldCup).toMatchObject({ played: 1, losses: 1 });
  });
  it('finds biggest wins and streaks', () => {
    expect(h.biggestWinA?.match.date).toBe('2003-01-01');
    expect(h.biggestWinB?.match.date).toBe('2002-01-01');
    expect(h.longestStreakA.length).toBe(2);
    expect(h.currentStreak).toMatchObject({ team: 'A', length: 2 });
  });
  it('builds the cumulative balance and decades', () => {
    expect(h.balance.map((b) => b.value)).toEqual([1, 1, 0, 1, 2]);
    expect(h.decades).toEqual([{ decade: 2000, winsA: 3, draws: 1, winsB: 1 }]);
  });
  it('is symmetric', () => {
    const r = headToHead(data, 'Italy', 'France');
    expect(r.total.wins).toBe(h.total.losses);
    expect(r.total.pointsFor).toBe(h.total.pointsAgainst);
  });
});

describe('real dataset', () => {
  const all = matchesFromCSV(readFileSync(new URL('../public/data/rugby_results.csv', import.meta.url), 'utf8'));
  it('parses every row', () => {
    expect(all.length).toBe(2727);
    expect(all.every((x) => Number.isFinite(x.homeScore) && Number.isFinite(x.awayScore))).toBe(true);
  });
  it('per-team totals equal the sum over opponents', () => {
    const { overall, byOpponent } = teamRecords(all, 'France');
    const sum = [...byOpponent.values()].reduce((s, r) => s + r.played, 0);
    expect(sum).toBe(overall.played);
  });
});
