#!/usr/bin/env python3
"""Rebuild public/data/rugby_results.csv from Nuck's Rugby Archive.

Keeps full test matches between nations that have played a Rugby World Cup
(found in the archive's own world_cup flag) plus EXTRA_NATIONS, and drops
abandoned or awarded (unplayed) matches.

Usage: python3 scripts/update_data.py
"""
import csv, json, pathlib, urllib.request

SOURCE = 'https://raw.githubusercontent.com/rugbyarchive/rugbyarchive.github.io/main/data/archive-data.js'
EXTRA_NATIONS = {'Hong Kong'}  # qualified for RWC 2027, never played a World Cup before
DATA = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data'
OUT = DATA / 'rugby_results.csv'
# Per competition: matches left out because one side is not one of the app's nations.
META = DATA / 'competitions.json'


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

    rows = []
    left_out = {}
    for r in d['rows']:
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
        rows.append([r[F['date']], h, a, r[F['home_score']], r[F['away_score']], lk('competition', r), lk('stadium', r),
                     lk('city', r), lk('country', r), str(bool(r[F['neutral']])), str(bool(r[F['world_cup']]))])
    rows.sort(key=lambda x: x[0])

    # Safety net: never replace the data with a much smaller set (broken or truncated source).
    if OUT.exists():
        previous = sum(1 for _ in OUT.open(encoding='utf-8')) - 1
        if len(rows) < previous * 0.98:
            raise SystemExit(f'Refusing update: {len(rows)} matches vs {previous} currently. Check the source.')

    with OUT.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['date', 'home_team', 'away_team', 'home_score', 'away_score', 'competition',
                    'stadium', 'city', 'country', 'neutral', 'world_cup'])
        w.writerows(rows)
    kept = {r[5] for r in rows}
    meta = {c: {'leftOut': e['matches'], 'teams': sorted(e['teams'])} for c, e in sorted(left_out.items()) if c in kept}
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    print(f'{len(rows)} matches, {len(nations)} nations, last match {rows[-1][0]} -> {OUT}')
    print('Nations:', ', '.join(sorted(nations)))


if __name__ == '__main__':
    main()
