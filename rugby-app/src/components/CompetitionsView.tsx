import { useMemo, useState } from 'react';
import { formatDate, team, type Match } from '../data';
import {
  FAMILIES,
  FAMILY_ALIASES,
  buildEditions,
  leftOutFor,
  poolName,
  rollOfHonour,
  standings,
  winner,
  worldCupPhases,
  type Edition,
  type LeftOut,
  type Standing,
} from '../competitions';
import { MatchRow, TeamName } from './common';

/** Display names for nations outside the app that appear in some competitions. */
const OTHER_NAMES: Record<string, string> = { UAE: 'United Arab Emirates' };

export function CompetitionsView({
  matches,
  meta,
  family,
  edition,
  onSelect,
}: {
  matches: Match[];
  meta: Record<string, LeftOut>;
  family: string;
  edition: string;
  onSelect: (family: string, edition?: string) => void;
}) {
  const all = useMemo(() => buildEditions(matches), [matches]);
  const families = FAMILIES.filter((f) => all.has(f.id));
  const wanted = FAMILY_ALIASES[family] ?? family;
  const fam = all.has(wanted) ? wanted : families[0]?.id;
  const list = all.get(fam) ?? [];
  const idx = Math.max(0, list.findIndex((e) => e.key === edition));
  const ed = list[idx];

  return (
    <section className="view">
      <div className="chips" role="tablist" aria-label="Competitions">
        {families.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === fam} className={f.id === fam ? 'on' : ''} onClick={() => onSelect(f.id)}>
            {f.label} <span className="muted">{all.get(f.id)!.length}</span>
          </button>
        ))}
      </div>

      {ed && (
        <>
          <div className="card edition-bar">
            <button className="swap" disabled={idx >= list.length - 1} onClick={() => onSelect(fam, list[idx + 1].key)} aria-label="Previous edition">
              ‹
            </button>
            <label className="field">
              <span className="field-label">Edition</span>
              <select value={ed.key} onChange={(e) => onSelect(fam, e.target.value)}>
                {list.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="swap" disabled={idx === 0} onClick={() => onSelect(fam, list[idx - 1].key)} aria-label="Next edition">
              ›
            </button>
          </div>
          <Honours editions={list} meta={meta} familyId={fam} selected={ed.key} onPick={(key) => onSelect(fam, key)} />
          <EditionDetail ed={ed} leftOut={leftOutFor(ed, meta)} />
        </>
      )}
    </section>
  );
}

function EditionDetail({ ed, leftOut }: { ed: Edition; leftOut: LeftOut | null }) {
  const wc = worldCupPhases(ed);
  const groups = ed.family.table && !wc ? standings(ed.matches) : [];
  const first = ed.matches[0];
  const last = ed.matches[ed.matches.length - 1];
  const final = wc?.rounds.find((r) => r.label === 'Final')?.matches[0];
  const bronze = wc?.rounds.find((r) => r.label === 'Bronze final')?.matches[0];
  const champ = final && winner(final);
  const runnerUp = final && champ && (final.home === champ ? final.away : final.home);
  const third = bronze && winner(bronze);
  const leader = groups.length === 1 ? groups[0][0] : null;
  const n = ed.matches.length;

  return (
    <>
      <div className="card edition-head">
        <h2>{ed.label}</h2>
        <p className="muted small">
          {n} {n === 1 ? 'match' : 'matches'} · {formatDate(first.date)} to {formatDate(last.date)}
        </p>
        {champ && (
          <div className="podium">
            <div className="gold">
              <span className="podium-rank">🏆 Champions</span>
              <TeamName name={champ} />
            </div>
            {runnerUp && (
              <div>
                <span className="podium-rank">Runners-up</span>
                <TeamName name={runnerUp} />
              </div>
            )}
            {third && (
              <div>
                <span className="podium-rank">Third</span>
                <TeamName name={third} />
              </div>
            )}
          </div>
        )}
        {leader && (
          <p className="small">
            Top of the computed table:{' '}
            <b>
              {team(leader.team).flag} {team(leader.team).display}
            </b>{' '}
            ({leader.wins} W, {leader.draws} D, {leader.losses} L)
            {ed.family.id === 'six-nations' && groups[0].length >= 4 && leader.wins === groups[0].length - 1 && <span className="tag wc">Grand Slam</span>}
          </p>
        )}
        {ed.inferred > 0 && (
          <p className="note small">
            Rebuilt edition: {ed.inferred === n ? 'these matches have' : `${ed.inferred} of these matches have`} no competition name in the source and were
            attached using the tournament’s teams and dates.
          </p>
        )}
        {leftOut && (
          <p className="note small">
            Incomplete edition: {leftOut.leftOut} {leftOut.leftOut === 1 ? 'match' : 'matches'} against{' '}
            {leftOut.teams.map((t) => OTHER_NAMES[t] ?? t).join(', ')} (nations not covered by the app) {leftOut.leftOut === 1 ? 'is' : 'are'} not shown. The
            table is partial.
          </p>
        )}
      </div>

      {wc && (
        <div className="card">
          <h3>Knockout stage</h3>
          {[...wc.rounds].reverse().map((r) => (
            <div key={r.label} className="round">
              <h4>{r.label}</h4>
              <ul className="matches">
                {r.matches.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {wc && (
        <div className="card">
          <h3>Pool stage</h3>
          <div className="pools">
            {/* Pools are found from who played whom; ESPN gives their letter for 1987–2019. */}
            {standings(wc.pools)
              .map((g) => ({ g, name: poolName(g, wc.pools) }))
              .sort((x, y) => (x.name && y.name ? x.name.localeCompare(y.name) : 0))
              .map(({ g, name }) => (
              <div key={g[0].team}>
                <h4>
                  {name ??
                    `Pool: ${g
                      .map((r) => team(r.team).display)
                      .sort((a, b) => a.localeCompare(b, 'en'))
                      .slice(0, 2)
                      .join(', ')}…`}
                </h4>
                <StandingsTable rows={g} qualified={2} />
              </div>
            ))}
          </div>
          <TableNote />
          <details className="pool-matches">
            <summary>All pool matches ({wc.pools.length})</summary>
            <MatchesByDay matches={wc.pools} />
          </details>
        </div>
      )}

      {groups.length > 0 && (
        <div className="card">
          <h3>Table</h3>
          {groups.map((g, i) => (
            <div key={g[0].team}>
              {groups.length > 1 && <h4>Group {i + 1}</h4>}
              <StandingsTable rows={g} />
            </div>
          ))}
          <TableNote />
        </div>
      )}

      {!wc && (
        <div className="card">
          <h3>Results</h3>
          <MatchesByDay matches={ed.matches} />
        </div>
      )}
    </>
  );
}

function StandingsTable({ rows, qualified = 0 }: { rows: Standing[]; qualified?: number }) {
  return (
    <div className="table-wrap">
      <table className="table standings">
        <thead>
          <tr>
            <th>Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Points for">PF</th>
            <th title="Points against">PA</th>
            <th title="Points difference">+/−</th>
            <th title="Table points (2 for a win, 1 for a draw)">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team} className={i < qualified ? 'qualified' : ''}>
              <td>
                <span className="muted pos">{i + 1}</span> {team(r.team).flag} {team(r.team).display}
              </td>
              <td>{r.played}</td>
              <td>{r.wins}</td>
              <td>{r.draws}</td>
              <td>{r.losses}</td>
              <td>{r.pointsFor}</td>
              <td>{r.pointsAgainst}</td>
              <td className={r.pointsFor >= r.pointsAgainst ? 'ka' : 'kb'}>
                {r.pointsFor - r.pointsAgainst > 0 ? '+' : ''}
                {r.pointsFor - r.pointsAgainst}
              </td>
              <td>
                <b>{r.points}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableNote() {
  return (
    <p className="muted small">
      Table computed from the scores: 2 points for a win, 1 for a draw, then points difference. Bonus points (tries scored) are not in the data, so the
      official order may differ when teams are close.
    </p>
  );
}

function MatchesByDay({ matches }: { matches: Match[] }) {
  const days: { date: string; ms: Match[] }[] = [];
  for (const m of matches) {
    const d = days[days.length - 1];
    if (d && d.date === m.date) d.ms.push(m);
    else days.push({ date: m.date, ms: [m] });
  }
  return (
    <div className="days">
      {days.map((d) => (
        <div key={d.date}>
          <h4>{formatDate(d.date)}</h4>
          <ul className="matches">
            {d.ms.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const SKIP_REASONS: Record<string, string> = {
  incomplete: 'incomplete',
  'several groups': 'played in several groups',
  'no final': 'no final in the data',
};

/** Titles per team across every edition of the selected competition. */
function Honours({
  editions,
  meta,
  familyId,
  selected,
  onPick,
}: {
  editions: Edition[];
  meta: Record<string, LeftOut>;
  familyId: string;
  selected: string;
  onPick: (key: string) => void;
}) {
  const { honours, skipped } = useMemo(() => rollOfHonour(editions, meta), [editions, meta]);
  const [open, setOpen] = useState(false);
  if (!editions[0]?.family.table) {
    return (
      <div className="card honours">
        <h3>Roll of honour</h3>
        <p className="muted small">Not available for this competition: it has no league table or final to decide a winner.</p>
      </div>
    );
  }
  const isWorldCup = familyId === 'world-cup';
  // World Cup: beaten finalists are part of the roll of honour too (France: 3 finals).
  const winners = honours.filter((h) => h.titles > 0 || (isWorldCup && h.runnersUp > 0));
  const isSixNations = familyId === 'six-nations';
  const shown = open ? winners : winners.slice(0, 5);
  const counted = editions.length - skipped.length;
  const reasons = Object.entries(
    skipped.reduce<Record<string, string[]>>((acc, s) => ({ ...acc, [s.reason]: [...(acc[s.reason] ?? []), s.key] }), {}),
  );

  return (
    <div className="card honours">
      <h3>Roll of honour</h3>
      {winners.length === 0 ? (
        <p className="muted small">No edition of this competition can be given a winner from the data.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table honours-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th title="Titles won">Titles</th>
                  {isWorldCup && <th title="Finals lost">Runners-up</th>}
                  {isSixNations && <th title="All matches won">Grand Slams</th>}
                  <th className="years-col">Years</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((h, i) => (
                  <tr key={h.team}>
                    <td>
                      <span className="muted pos">{i + 1}</span> {team(h.team).flag} {team(h.team).display}
                    </td>
                    <td>
                      <b>{h.titles}</b>
                      {h.shared > 0 && <span className="muted small"> ({h.shared} shared)</span>}
                    </td>
                    {isWorldCup && <td>{h.runnersUp}</td>}
                    {isSixNations && <td>{h.grandSlams}</td>}
                    <td className="years-col">
                      <span className="years">
                        {h.years.map((y) => (
                          <button
                            key={y.key}
                            className={`year ${y.key === selected ? 'on' : ''} ${y.shared ? 'shared' : ''}`}
                            title={y.shared ? 'Shared title' : 'Open this edition'}
                            onClick={() => onPick(y.key)}
                          >
                            {y.key}
                            {y.shared ? '*' : ''}
                          </button>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {winners.length > 5 && (
            <button className="link" onClick={() => setOpen((o) => !o)}>
              {open ? 'Show fewer teams' : `Show all ${winners.length} teams`}
            </button>
          )}
        </>
      )}
      <p className="muted small">
        {isWorldCup
          ? 'Champions are the winners of each final.'
          : `Winners are the top of the table computed from the scores (2 points for a win, 1 for a draw, then points difference; bonus points are not in the data).${
              isSixNations ? ' Before 1994 teams level on points shared the title (*).' : ''
            }`}{' '}
        {counted} of {editions.length} editions counted
        {reasons.length > 0 && `; not counted: ${reasons.map(([r, keys]) => `${keys.join(', ')} (${SKIP_REASONS[r] ?? r})`).join('; ')}`}.
      </p>
    </div>
  );
}
