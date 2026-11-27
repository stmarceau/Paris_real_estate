#!/usr/bin/env python3
"""Convert an ESPN games pickle (list of dicts) into data/espn_games.csv.

The pickle is loaded with an unpickler that refuses every class, so only plain
Python data (dicts, lists, strings, numbers) can be read and no code can run.
Only the fields the app uses are kept: date, teams, scores, competition, stage
(World Cup pool / knockout round) and venue. Matches recorded before they were
played (0-0 with no stats page) are dropped.

Usage: python3 scripts/import_espn_pickle.py path/to/espngames.pkl
"""
import csv, pathlib, pickle, re, sys

OUT = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'espn_games.csv'


def text(v) -> str:
    """Strings as-is; missing values (None, NaN floats) as ''."""
    return re.sub(r'\s+', ' ', v).strip() if isinstance(v, str) else ''


class NoClassUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise pickle.UnpicklingError(f'refusing to load {module}.{name}: plain data only')


def main(path: str) -> None:
    with open(path, 'rb') as f:
        games = NoClassUnpickler(f).load()
    rows = []
    for g in games:
        s1, s2 = str(g['score1']).strip(), str(g['score2']).strip()
        if not (s1.isdigit() and s2.isdigit()):
            continue
        if s1 == '0' and s2 == '0' and not g.get('stats_url'):
            continue  # fixture recorded before it was played
        d = str(g['espn_date'])
        rows.append([f'{d[:4]}-{d[4:6]}-{d[6:8]}', text(g['team1']), text(g['team2']), int(s1), int(s2),
                     text(g.get('competition')), text(g.get('stage')), text(g.get('venue'))])
    rows.sort()
    OUT.parent.mkdir(exist_ok=True)
    with OUT.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['date', 'team1', 'team2', 'score1', 'score2', 'competition', 'stage', 'venue'])
        w.writerows(rows)
    print(f'{len(rows)} games ({rows[0][0]} to {rows[-1][0]}) -> {OUT}')


if __name__ == '__main__':
    main(sys.argv[1])
