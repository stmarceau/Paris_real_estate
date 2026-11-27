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

ESPN game details (data/espn_details.json.gz, made by scripts/import_espn_details.py)
add, for the same matches: a scoring breakdown when the archive has none and ESPN's
counts add up to the official score (breakdown_source says which source was used),
and per-year detail files in public/data/details/ with line-ups, the scoring timeline
(only when its points add up to the score) and a video link.

Usage: python3 scripts/update_data.py
"""
import collections, csv, datetime, gzip, json, pathlib, shutil, urllib.request

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
DETAILS_DIR = DATA / 'details'

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
    """ESPN details for this match: same teams, date within a day, same score."""
    d = datetime.date.fromisoformat(date)
    best = None
    for g in index.get(frozenset((home, away)), []):
        off = abs((datetime.date.fromisoformat(g['date']) - d).days)
        sides = {t['name']: t for t in g['teams']}
        if off <= 1 and sides[home]['score'] == hs and sides[away]['score'] == as_ and (best is None or off < best[0]):
            best = (off, sides, g)
    return best


def espn_breakdown(sides, g, home, away, year):
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
        pt = sum(1 for a in g['actions'] if a['team'] == name and a['action'] == 'penalty try')
        # ESPN's try count may or may not include penalty tries: accept whichever reading matches the score.
        for tries, ptries in ((c['tries'] - pt, pt), (c['tries'], 0)):
            pts = tries * v[1] + c['conversions'] * v[2] + c['penalties'] * v[3] + c['drops'] * v[4] + ptries * v[5]
            if tries >= 0 and pts == t['score']:
                out += [int(tries), int(c['conversions']), int(c['penalties']), int(c['drops']), 0, int(ptries)]
                break
        else:
            return None
    return out


def match_details(sides, g, home, away):
    """Line-ups, scoring timeline (if it adds up to the score) and video for the detail files."""
    out = {}
    if sides[home]['lineup'] and sides[away]['lineup']:
        out['lineups'] = {'home': sides[home]['lineup'], 'away': sides[away]['lineup']}
    acts = [a for a in g['actions'] if a['team'] in (home, away) and a['points'] is not None]
    totals = collections.Counter()
    for a in acts:
        totals[a['team']] += a['points']
    if acts and totals[home] == sides[home]['score'] and totals[away] == sides[away]['score']:
        out['timeline'] = [{'side': 'home' if a['team'] == home else 'away', 'player': a['player'], 'action': a['action'],
                            'points': int(a['points']), 'minute': int(a['minute']) if a['minute'] is not None else None}
                           for a in acts]
    if g['videos']:
        # ESPN stored YouTube "embed" links; the app links to the normal watch page instead.
        vid = g['videos'][0].rstrip('/').split('/')[-1].split('?')[0]
        if '/embed/' in g['videos'][0] and vid:
            out['video'] = f'https://www.youtube.com/watch?v={vid}'
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
    details = collections.defaultdict(dict)

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
            _, sides, eg = found
            if not b:
                b = espn_breakdown(sides, eg, h, a, int(r[F['date']][:4]))
                if b:
                    source = 'espn'
                    from_espn_breakdown += 1
            extra = match_details(sides, eg, h, a)
            if extra:
                details[r[F['date']][:4]][f"{r[F['date']]}|{h}|{a}"] = extra
        b = b or [''] * 12
        g = espn_match(espn, r[F['date']], h, a, r[F['home_score']], r[F['away_score']])
        enriched += bool(g)
        stadium = lk('stadium', r) or (g['venue'] if g else '')
        rows.append([r[F['date']], h, a, r[F['home_score']], r[F['away_score']], lk('competition', r), stadium,
                     lk('city', r), lk('country', r), str(bool(r[F['neutral']])), str(bool(r[F['world_cup']]))] + list(b)
                    + [g['competition'] if g else '', g['stage'] if g else '', source,
                       '1' if f"{r[F['date']]}|{h}|{a}" in details.get(r[F['date']][:4], {}) else ''])
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
                   + [f'{side}_{k}' for side in ('home', 'away') for k in BREAKDOWN] + ['espn_competition', 'stage', 'breakdown_source', 'details'])
        w.writerows(rows)
    # Per-year detail files, loaded by the app when a match sheet is opened.
    shutil.rmtree(DETAILS_DIR, ignore_errors=True)
    DETAILS_DIR.mkdir(parents=True)
    for year, items in details.items():
        (DETAILS_DIR / f'{year}.json').write_text(json.dumps(items, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{from_espn_breakdown} breakdowns from ESPN, details for {sum(len(x) for x in details.values())} matches '
          f'({sum(1 for x in details.values() for e in x.values() if "lineups" in e)} line-ups, '
          f'{sum(1 for x in details.values() for e in x.values() if "timeline" in e)} timelines, '
          f'{sum(1 for x in details.values() for e in x.values() if "video" in e)} videos)')

    kept = {r[5] for r in rows}
    meta = {c: {'leftOut': e['matches'], 'teams': sorted(e['teams'])} for c, e in sorted(left_out.items()) if c in kept}
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    print(f'{sum(1 for r in rows if r[11] != "")} with a scoring breakdown, {enriched} enriched with ESPN data')
    print(f'{len(rows)} matches, {len(nations)} nations, last match {rows[-1][0]} -> {OUT}')
    print('Nations:', ', '.join(sorted(nations)))


if __name__ == '__main__':
    main()
