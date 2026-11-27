import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { matchesFromCSV } from './data';
import { buildEditions, poolName, standings, winner, worldCupPhases } from './competitions';

const all = matchesFromCSV(readFileSync(new URL('../public/data/rugby_results.csv', import.meta.url), 'utf8'));
const eds = buildEditions(all);
const ed = (fam: string, key: string) => eds.get(fam)!.find((e) => e.key === key)!;

describe('World Cups', () => {
  const champions: [string, string][] = [
    ['1987', 'New Zealand'],
    ['1991', 'Australia'],
    ['1995', 'South Africa'],
    ['1999', 'Australia'],
    ['2003', 'England'],
    ['2007', 'South Africa'],
    ['2011', 'New Zealand'],
    ['2015', 'New Zealand'],
    ['2019', 'South Africa'],
    ['2023', 'South Africa'],
  ];
  it.each(champions)('%s: the last match is the final, won by %s', (year, champ) => {
    const p = worldCupPhases(ed('world-cup', year))!;
    expect(winner(p.rounds.find((r) => r.label === 'Final')!.matches[0])).toBe(champ);
  });
  it('splits pool matches into the right number of pools', () => {
    expect(standings(worldCupPhases(ed('world-cup', '1987'))!.pools).map((g) => g.length)).toEqual([4, 4, 4, 4]);
    expect(standings(worldCupPhases(ed('world-cup', '2023'))!.pools).map((g) => g.length)).toEqual([5, 5, 5, 5]);
  });
});

describe('World Cup stages from ESPN', () => {
  it('1999: quarter-final play-offs, then 4 quarter-finals, and five lettered pools', () => {
    const p = worldCupPhases(ed('world-cup', '1999'))!;
    expect(p.rounds.map((r) => [r.label, r.matches.length])).toEqual([
      ['Quarter-final play-offs', 3],
      ['Quarter-finals', 4],
      ['Semi-finals', 2],
      ['Bronze final', 1],
      ['Final', 1],
    ]);
    const pools = standings(p.pools);
    expect(pools).toHaveLength(5);
    expect(pools.map((g) => poolName(g, p.pools)).sort()).toEqual(['Pool A', 'Pool B', 'Pool C', 'Pool D', 'Pool E']);
  });
  it('2019: Japan topped Pool A, ahead of Ireland', () => {
    const p = worldCupPhases(ed('world-cup', '2019'))!;
    const a = standings(p.pools).find((g) => poolName(g, p.pools) === 'Pool A')!;
    expect(a.slice(0, 2).map((r) => r.team)).toEqual(['Japan', 'Ireland']);
  });
});

describe('Six Nations', () => {
  it('2023: Ireland grand slam, 15 matches, 6 teams', () => {
    const e = ed('six-nations', '2023');
    expect(e.matches).toHaveLength(15);
    const [table] = standings(e.matches);
    expect(table).toHaveLength(6);
    expect(table[0]).toMatchObject({ team: 'Ireland', wins: 5 });
    expect(table[5].team).toBe('Italy');
  });
  it('names older editions after the tournament of the time', () => {
    expect(ed('six-nations', '1955').label).toBe('1955 Five Nations Championship');
    expect(ed('six-nations', '1890').label).toBe('1890 Home Nations Championship');
  });
});

describe('reconstructed editions', () => {
  it('every Five Nations 1952–1999 has its 10 matches (8 in 1972: Scotland and Wales did not travel to Dublin)', () => {
    for (let y = 1953; y <= 1999; y++) expect([y, ed('six-nations', String(y)).matches.length]).toEqual([y, y === 1972 ? 8 : 10]);
  });
  it('drops the 1971 centenary match and the 1988 Millennium match', () => {
    expect(ed('six-nations', '1971').matches.some((m) => m.date === '1971-03-27' && m.home === 'Scotland')).toBe(false);
    expect(ed('six-nations', '1988').matches.some((m) => m.date === '1988-04-23')).toBe(false);
  });
  it('Tri-Nations 1996–1999: 6 matches, known winners', () => {
    const champs: Record<string, string> = { '1996': 'New Zealand', '1997': 'New Zealand', '1998': 'South Africa', '1999': 'New Zealand' };
    for (const [y, c] of Object.entries(champs)) {
      const e = ed('rugby-championship', y);
      expect(e.matches).toHaveLength(6);
      expect(standings(e.matches)[0][0].team).toBe(c);
    }
  });
  it('Rugby Championship 2021 (12), 2023 (6) and 2025 (12)', () => {
    expect(ed('rugby-championship', '2021').matches).toHaveLength(12);
    expect(ed('rugby-championship', '2023').matches).toHaveLength(6);
    expect(ed('rugby-championship', '2025').matches).toHaveLength(12);
    expect(standings(ed('rugby-championship', '2021').matches)[0][0].team).toBe('New Zealand');
  });
});

describe('families', () => {
  it('never puts a match in two families', () => {
    const seen = new Set<string>();
    for (const list of eds.values()) for (const e of list) for (const m of e.matches) {
      expect(seen.has(m.id)).toBe(false);
      seen.add(m.id);
    }
  });
});
