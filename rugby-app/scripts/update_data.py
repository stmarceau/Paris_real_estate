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

ESPN scoring counts (data/espn_details.json.gz, made by scripts/import_espn_details.py)
add, for the same matches: a scoring breakdown when the archive has none and ESPN's
counts add up to the official score (breakdown_source says which source was used),
Nothing else from it is published (no timeline, player names, line-ups or videos).

Usage: python3 scripts/update_data.py
"""
import collections, csv, datetime, gzip, json, pathlib, urllib.request

SOURCE = 'https://raw.githubusercontent.com/rugbyarchive/rugbyarchive.github.io/main/data/archive-data.js'
EXTRA_NATIONS = {'Hong Kong'}  # qualified for RWC 2027, never played a World Cup before
DATA = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data'
OUT = DATA / 'rugby_results.csv'
# Per competition: matches left out because one side is not one of the app's nations.
META = DATA / 'competitions.json'
# Order of the archive's breakdown lists (its scoring.breakdown_order), per side.
BREAKDOWN = ['tries', 'conversions', 'penalties', 'drop_goals', 'marks', 'penalty_tries']
ESPN = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'espn_games.csv'
ESPN_DETAILS = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'espn_details.json.gz'

# Points per action by era (from the archive's scoring table): try, conversion, penalty, drop, penalty try.
ERAS = [(1971, 4, 2, 3, 3, 4), (1978, 4, 2, 3, 3, 4), (1992, 5, 2, 3, 3, 5), (2017, 5, 2, 3, 3, 7)]


def era_values(year):
    v = None
    for e in ERAS:
        if year >= e[0]:
            v = e
    return v


def load_details():
    index = collections.defaultdict(list)
    if ESPN_DETAILS.exists():
        for g in json.loads(gzip.decompress(ESPN_DETAILS.read_bytes())):
            index[frozenset(t['name'] for t in g['teams'])].append(g)
    return index


def details_for(index, date, home, away, hs, as_):
    """ESPN scoring counts for this match: same teams, date within a day, same score."""
    d = datetime.date.fromisoformat(date)
    best = None
    for g in index.get(frozenset((home, away)), []):
        off = abs((datetime.date.fromisoformat(g['date']) - d).days)
        sides = {t['name']: t for t in g['teams']}
        if off <= 1 and sides[home]['score'] == hs and sides[away]['score'] == as_ and (best is None or off < best[0]):
            best = (off, sides, g)
    return best


def espn_breakdown(sides, home, away, year):
    """[tries, conv, pens, drops, marks, pen tries] for home then away, only if it adds up to the score."""
    v = era_values(year)
    if not v:
        return None
    out = []
    for name in (home, away):
        t = sides[name]
        c = t['counts']
        if not c:
            return None
        pt = t['penalty_tries']
        # ESPN's try count may or may not include penalty tries: accept whichever reading matches the score.
        for tries, ptries in ((c['tries'] - pt, pt), (c['tries'], 0)):
            pts = tries * v[1] + c['conversions'] * v[2] + c['penalties'] * v[3] + c['drops'] * v[4] + ptries * v[5]
            if tries >= 0 and pts == t['score']:
                out += [int(tries), int(c['conversions']), int(c['penalties']), int(c['drops']), 0, int(ptries)]
                break
        else:
            return None
    return out


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
    details_index = load_details()
    enriched = 0
    from_espn_breakdown = 0

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
        b = breakdowns.get(str(i))
        source = 'archive' if b else ''
        found = details_for(details_index, r[F['date']], h, a, r[F['home_score']], r[F['away_score']])
        if found:
            _, sides, _game = found
            if not b:
                b = espn_breakdown(sides, h, a, int(r[F['date']][:4]))
                if b:
                    source = 'espn'
                    from_espn_breakdown += 1
        b = b or [''] * 12
        g = espn_match(espn, r[F['date']], h, a, r[F['home_score']], r[F['away_score']])
        enriched += bool(g)
        stadium = lk('stadium', r) or (g['venue'] if g else '')
        rows.append([r[F['date']], h, a, r[F['home_score']], r[F['away_score']], lk('competition', r), stadium,
                     lk('city', r), lk('country', r), str(bool(r[F['neutral']])), str(bool(r[F['world_cup']]))] + list(b)
                    + [g['competition'] if g else '', g['stage'] if g else '', source])
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
                   + [f'{side}_{k}' for side in ('home', 'away') for k in BREAKDOWN] + ['espn_competition', 'stage', 'breakdown_source'])
        w.writerows(rows)
    print(f'{from_espn_breakdown} breakdowns from ESPN')

    kept = {r[5] for r in rows}
    meta = {c: {'leftOut': e['matches'], 'teams': sorted(e['teams'])} for c, e in sorted(left_out.items()) if c in kept}
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    print(f'{sum(1 for r in rows if r[11] != "")} with a scoring breakdown, {enriched} enriched with ESPN data')
    print(f'{len(rows)} matches, {len(nations)} nations, last match {rows[-1][0]} -> {OUT}')
    print('Nations:', ', '.join(sorted(nations)))


if __name__ == '__main__':
    main()
