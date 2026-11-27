#!/usr/bin/env python3
"""Rebuild public/data/rugby_results.csv from Nuck's Rugby Archive.

Keeps full test matches between nations that have played a Rugby World Cup
(found in the archive's own world_cup flag) plus EXTRA_NATIONS, and drops
abandoned or awarded (unplayed) matches. When the archive has a scoring
breakdown for a match, it is written in the BREAKDOWN columns (empty otherwise).

ESPN data (data/espn_games.csv, 1987–2020, made by scripts/import_espn_pickle.py)
adds the competition name ESPN used (espn_competition), the World Cup stage (pool
letter or knockout round) and the venue when the archive has none. A match is
enriched only when ESPN has the same teams, a date within one day and the same score.

Usage: python3 scripts/update_data.py
"""
import collections, csv, datetime, json, pathlib, urllib.request

SOURCE = 'https://raw.githubusercontent.com/rugbyarchive/rugbyarchive.github.io/main/data/archive-data.js'
EXTRA_NATIONS = {'Hong Kong'}  # qualified for RWC 2027, never played a World Cup before
DATA = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data'
OUT = DATA / 'rugby_results.csv'
# Per competition: matches left out because one side is not one of the app's nations.
META = DATA / 'competitions.json'
# Order of the archive's breakdown lists (its scoring.breakdown_order), per side.
BREAKDOWN = ['tries', 'conversions', 'penalties', 'drop_goals', 'marks', 'penalty_tries']
ESPN = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'espn_games.csv'


def load_espn():
    """ESPN games indexed by pair of teams."""
    index = collections.defaultdict(list)
    if ESPN.exists():
        for g in csv.DictReader(ESPN.open(encoding='utf-8')):
            index[frozenset((g['team1'], g['team2']))].append(g)
    return index


def espn_match(index, date, home, away, hs, as_):
    """The ESPN record for this match: same teams, date within a day, same score."""
    d = datetime.date.fromisoformat(date)
    best = None
    for g in index.get(frozenset((home, away)), []):
        off = abs((datetime.date.fromisoformat(g['date']) - d).days)
        if off > 1:
            continue
        scores = {g['team1']: int(g['score1']), g['team2']: int(g['score2'])}
        if scores.get(home) == hs and scores.get(away) == as_ and (best is None or off < best[0]):
            best = (off, g)
    return best[1] if best else None


def main() -> None:
    text = urllib.request.urlopen(SOURCE, timeout=60).read().decode('utf-8')
    d = json.loads(text[text.index('{'): text.rindex('}') + 1])
    F = {f: i for i, f in enumerate(d['fields'])}
    L = d['lookups']
    T = L['teams']

    def lk(k, r):
        return L[k][r[F[k]]] if r[F[k]] is not None else ''

    nations = set(EXTRA_NATIONS)
    for r in d['rows']:
        if r[F['world_cup']]:
            nations |= {T[r[F['home']]], T[r[F['away']]]}

    expected = [f'{side}_{k}' for side in ('home', 'away') for k in
                ('tries', 'conv', 'pens', 'drop_goals', 'marks', 'pen_tries')]
    if d['scoring'].get('breakdown_order') != expected:
        raise SystemExit(f"Breakdown format changed: {d['scoring'].get('breakdown_order')}")
    breakdowns = d.get('breakdowns', {})
    espn = load_espn()
    enriched = 0

    rows = []
    left_out = {}
    for i, r in enumerate(d['rows']):
        h, a = T[r[F['home']]], T[r[F['away']]]
        mt = lk('match_type', r)
        if not r[F['full_intl']] or any(x in mt for x in ('Abandoned', 'Awarded', 'Non-Test')):
            continue
        if h not in nations or a not in nations:
            comp = lk('competition', r)
            if comp and (h in nations or a in nations):
                e = left_out.setdefault(comp, {'matches': 0, 'teams': set()})
                e['matches'] += 1
                e['teams'] |= {t for t in (h, a) if t not in nations}
            continue
        b = breakdowns.get(str(i)) or [''] * 12
        g = espn_match(espn, r[F['date']], h, a, r[F['home_score']], r[F['away_score']])
        enriched += bool(g)
        stadium = lk('stadium', r) or (g['venue'] if g else '')
        rows.append([r[F['date']], h, a, r[F['home_score']], r[F['away_score']], lk('competition', r), stadium,
                     lk('city', r), lk('country', r), str(bool(r[F['neutral']])), str(bool(r[F['world_cup']]))] + list(b)
                    + [g['competition'] if g else '', g['stage'] if g else ''])
    rows.sort(key=lambda x: x[0])

    # Safety net: never replace the data with a much smaller set (broken or truncated source).
    if OUT.exists():
        previous = sum(1 for _ in OUT.open(encoding='utf-8')) - 1
        if len(rows) < previous * 0.98:
            raise SystemExit(f'Refusing update: {len(rows)} matches vs {previous} currently. Check the source.')

    with OUT.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['date', 'home_team', 'away_team', 'home_score', 'away_score', 'competition',
                    'stadium', 'city', 'country', 'neutral', 'world_cup']
                   + [f'{side}_{k}' for side in ('home', 'away') for k in BREAKDOWN] + ['espn_competition', 'stage'])
        w.writerows(rows)
    kept = {r[5] for r in rows}
    meta = {c: {'leftOut': e['matches'], 'teams': sorted(e['teams'])} for c, e in sorted(left_out.items()) if c in kept}
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    print(f'{sum(1 for r in rows if r[11] != "")} with a scoring breakdown, {enriched} enriched with ESPN data')
    print(f'{len(rows)} matches, {len(nations)} nations, last match {rows[-1][0]} -> {OUT}')
    print('Nations:', ', '.join(sorted(nations)))


if __name__ == '__main__':
    main()
