#!/usr/bin/env python3
"""Convert an ESPN game-details pickle into data/espn_details.json.gz.

Each game in the pickle has its two teams with score, scoring counts (tries,
conversions, penalties, drops) and line-up, the list of scoring actions (player,
minute, action, points, running score) and video links.

The pickle is loaded with an unpickler that refuses every class, so only plain
Python data can be read and no code can run. Missing values (NaN floats) become
null. Nothing is checked against scores here: scripts/update_data.py only uses
counts and timelines that add up to the official score.

Usage: python3 scripts/import_espn_details.py path/to/games.pkl
"""
import gzip, json, math, pathlib, pickle, sys

OUT = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'espn_details.json.gz'


class NoClassUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise pickle.UnpicklingError(f'refusing to load {module}.{name}: plain data only')


def num(v):
    return v if isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)) else None


def text(v):
    return ' '.join(v.split()) if isinstance(v, str) else None


def main(path: str) -> None:
    with open(path, 'rb') as f:
        games = NoClassUnpickler(f).load()
    out = []
    for g in games:
        teams = g.get('teams') or []
        if len(teams) != 2 or any(num(t.get('score')) is None for t in teams):
            continue
        d = str(g['date'])
        sides = []
        for t in teams:
            counts = {k: num(t.get(k)) for k in ('tries', 'conversions', 'penalties', 'drops')}
            lineup = [{'nb': num(p.get('nb')), 'pos': text(p.get('pos')), 'name': text(p.get('name'))}
                      for p in (t.get('lineup') or []) if isinstance(p, dict) and text(p.get('name'))]
            sides.append({'name': text(t['name']), 'score': int(t['score']),
                          'counts': counts if all(v is not None for v in counts.values()) else None,
                          'lineup': lineup})
        actions = [{'team': text(a.get('team')), 'player': text(a.get('player')), 'action': text(a.get('action')),
                    'points': num(a.get('points')), 'minute': num(a.get('timestamp')), 'score': text(a.get('score'))}
                   for a in (g.get('actions') if isinstance(g.get('actions'), list) else []) if isinstance(a, dict)]
        videos = [v for v in (g.get('videos') if isinstance(g.get('videos'), list) else [])
                  if isinstance(v, str) and v.startswith(('http://www.youtube.com/', 'https://www.youtube.com/'))]
        out.append({'date': f'{d[:4]}-{d[4:6]}-{d[6:8]}', 'teams': sides, 'actions': actions, 'videos': videos})
    out.sort(key=lambda x: (x['date'], x['teams'][0]['name']))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_bytes(gzip.compress((json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8'), mtime=0))
    print(f'{len(out)} games ({out[0]["date"]} to {out[-1]["date"]}) -> {OUT} ({OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main(sys.argv[1])
