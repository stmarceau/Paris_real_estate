import { useMemo, useState } from 'react';
import { GROUPS, TEAMS, inGroup, team, type Match, type TeamGroup } from '../data';
import { teamRecords, winRate } from '../stats';
import { TeamSelect, pct } from './common';

/** Below this many matches a win rate says little: such teams are listed after the others. */
const MIN_MATCHES = 10;

export function OverviewView({
  matches,
  teamName,
  onTeam,
  onCompare,
}: {
  matches: Match[];
  teamName: string;
  onTeam: (t: string) => void;
  onCompare: (a: string, b: string) => void;
}) {
  const [group, setGroup] = useState<TeamGroup>(() => (team(teamName).tier1 ? 'tier1' : 'rwc2027'));
  const members = useMemo(() => TEAMS.filter((t) => inGroup(t, group)), [group]);
  const memberSet = useMemo(() => new Set(members.map((t) => t.name)), [members]);

  const ranking = useMemo(
    () =>
      members
        .map((t) => ({ t, ...teamRecords(matches, t.name, 0, memberSet) }))
        .filter((x) => x.overall.played)
        .sort((x, y) => {
          const fx = x.overall.played >= MIN_MATCHES ? 1 : 0;
          const fy = y.overall.played >= MIN_MATCHES ? 1 : 0;
          return fy - fx || winRate(y.overall) - winRate(x.overall);
        }),
    [matches, members, memberSet],
  );

  // The team's own record is always shown against every nation in the app, whatever the group.
  const allNames = useMemo(() => new Set(TEAMS.map((t) => t.name)), []);
  const current = useMemo(() => teamRecords(matches, teamName, 0, allNames), [matches, teamName, allNames]);
  const opps = [...current.byOpponent.entries()].sort((x, y) => y[1].played - x[1].played);
  const ordered = ranking.map((r) => r.t.name);
  const big = ordered.length > 12;

  return (
    <section className="view">
      <div className="card controls">
        <label className="field">
          <span className="field-label">Nations compared</span>
          <select value={group} onChange={(e) => setGroup(e.target.value as TeamGroup)}>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>Win percentage ranking</h3>
        <p className="muted small">
          Matches between nations of the selected group only. Teams with fewer than {MIN_MATCHES} matches are listed last.
        </p>
        <ol className="ranking">
          {ranking.map((r) => (
            <li key={r.t.name}>
              <button className={`rank-row ${r.t.name === teamName ? 'on' : ''} ${r.overall.played < MIN_MATCHES ? 'few' : ''}`} onClick={() => onTeam(r.t.name)}>
                <span className="rank-name">
                  {r.t.flag} {r.t.display}
                </span>
                <span className="rank-bar">
                  <span style={{ width: `${winRate(r.overall) * 100}%` }} />
                </span>
                <span className="rank-pct">{pct(winRate(r.overall))}</span>
                <span className="muted small rank-n">{r.overall.played} m.</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>
            {team(teamName).flag} {team(teamName).display} record
          </h3>
          <TeamSelect label="Team" value={teamName} onChange={onTeam} />
        </div>
        {current.overall.played === 0 ? (
          <p className="muted small">No matches in this period.</p>
        ) : (
          <>
            <p className="small">
              Against the {TEAMS.length} nations: {current.overall.played} matches · <b className="ka">{current.overall.wins} W</b> · {current.overall.draws} D ·{' '}
              <b className="kb">{current.overall.losses} L</b> · {pct(winRate(current.overall))} won
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>Pts +/−</th>
                    <th>Win %</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {opps.map(([opp, r]) => (
                    <tr key={opp}>
                      <td>
                        {team(opp).flag} {team(opp).display}
                      </td>
                      <td>{r.played}</td>
                      <td>{r.wins}</td>
                      <td>{r.draws}</td>
                      <td>{r.losses}</td>
                      <td className={r.pointsFor >= r.pointsAgainst ? 'ka' : 'kb'}>
                        {r.pointsFor - r.pointsAgainst > 0 ? '+' : ''}
                        {r.pointsFor - r.pointsAgainst}
                      </td>
                      <td>
                        <span className={`pill ${winRate(r) >= 0.5 ? 'ka' : 'kb'}`}>{pct(winRate(r))}</span>
                      </td>
                      <td>
                        <button className="link" onClick={() => onCompare(teamName, opp)}>
                          Head-to-head →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>Head-to-head matrix</h3>
        <p className="muted small">
          Win % of the row team against the column team. Tap a cell for details.{big && ' Scroll sideways to see every nation.'}
        </p>
        <div className="table-wrap">
          <table className={`matrix ${big ? 'compact' : ''}`}>
            <thead>
              <tr>
                <th />
                {ordered.map((n) => (
                  <th key={n} title={team(n).display}>
                    {team(n).flag}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.t.name}>
                  <th title={row.t.display} className="sticky">
                    {row.t.flag}
                  </th>
                  {ordered.map((col) => {
                    if (col === row.t.name) return <td key={col} className="self" />;
                    const r = row.byOpponent.get(col);
                    if (!r) return <td key={col} className="none" title={`${row.t.display} v ${team(col).display}: never met`} />;
                    const v = winRate(r);
                    return (
                      <td key={col} style={{ ['--v' as string]: v }} className="heat">
                        <button onClick={() => onCompare(row.t.name, col)} title={`${row.t.display} v ${team(col).display}: ${r.wins}W ${r.draws}D ${r.losses}L`}>
                          {Math.round(v * 100)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
