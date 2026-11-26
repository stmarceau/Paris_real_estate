import { useMemo, useState } from 'react';
import { GROUPS, TEAMS, inGroup, team, type Match, type TeamGroup } from '../data';
import { teamRecords, winRate } from '../stats';
import { TeamSelect, pct } from './common';

const ERAS = [
  { label: 'Depuis 1871', from: 0 },
  { label: 'Ère pro (1995+)', from: 1995 },
  { label: 'Depuis 2010', from: 2010 },
];

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
  const [era, setEra] = useState(0);
  const [group, setGroup] = useState<TeamGroup>(() => (team(teamName).tier1 ? 'tier1' : 'rwc2027'));
  const from = ERAS[era].from;
  const members = useMemo(() => TEAMS.filter((t) => inGroup(t, group)), [group]);
  const memberSet = useMemo(() => new Set(members.map((t) => t.name)), [members]);

  const ranking = useMemo(
    () =>
      members
        .map((t) => ({ t, ...teamRecords(matches, t.name, from, memberSet) }))
        .filter((x) => x.overall.played)
        .sort((x, y) => {
          const fx = x.overall.played >= MIN_MATCHES ? 1 : 0;
          const fy = y.overall.played >= MIN_MATCHES ? 1 : 0;
          return fy - fx || winRate(y.overall) - winRate(x.overall);
        }),
    [matches, from, members, memberSet],
  );

  // The team's own record is always shown against every nation in the app, whatever the group.
  const allNames = useMemo(() => new Set(TEAMS.map((t) => t.name)), []);
  const current = useMemo(() => teamRecords(matches, teamName, from, allNames), [matches, teamName, from, allNames]);
  const opps = [...current.byOpponent.entries()].sort((x, y) => y[1].played - x[1].played);
  const ordered = ranking.map((r) => r.t.name);
  const big = ordered.length > 12;

  return (
    <section className="view">
      <div className="card controls">
        <label className="field">
          <span className="field-label">Nations comparées</span>
          <select value={group} onChange={(e) => setGroup(e.target.value as TeamGroup)}>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="field-label">Période</span>
          <div className="segmented" role="tablist" aria-label="Période">
            {ERAS.map((e, i) => (
              <button key={e.label} role="tab" aria-selected={era === i} className={era === i ? 'on' : ''} onClick={() => setEra(i)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Classement au pourcentage de victoires</h3>
        <p className="muted small">
          Matchs entre les nations du groupe choisi uniquement. Les équipes avec moins de {MIN_MATCHES} matchs sont classées à la fin.
        </p>
        <ol className="ranking">
          {ranking.map((r) => (
            <li key={r.t.name}>
              <button className={`rank-row ${r.t.name === teamName ? 'on' : ''} ${r.overall.played < MIN_MATCHES ? 'few' : ''}`} onClick={() => onTeam(r.t.name)}>
                <span className="rank-name">
                  {r.t.flag} {r.t.fr}
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
            Bilan de {team(teamName).flag} {team(teamName).fr}
          </h3>
          <TeamSelect label="Équipe" value={teamName} onChange={onTeam} />
        </div>
        {current.overall.played === 0 ? (
          <p className="muted small">Aucun match sur cette période.</p>
        ) : (
          <>
            <p className="small">
              Contre les {TEAMS.length} nations : {current.overall.played} matchs · <b className="ka">{current.overall.wins} V</b> · {current.overall.draws} N ·{' '}
              <b className="kb">{current.overall.losses} D</b> · {pct(winRate(current.overall))} de victoires
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Adversaire</th>
                    <th>J</th>
                    <th>V</th>
                    <th>N</th>
                    <th>D</th>
                    <th>Pts +/−</th>
                    <th>% V</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {opps.map(([opp, r]) => (
                    <tr key={opp}>
                      <td>
                        {team(opp).flag} {team(opp).fr}
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
                          Face-à-face →
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
        <h3>Matrice des face-à-face</h3>
        <p className="muted small">
          % de victoires de l’équipe en ligne contre l’équipe en colonne. Touchez une case pour le détail.{big && ' Faites défiler horizontalement.'}
        </p>
        <div className="table-wrap">
          <table className={`matrix ${big ? 'compact' : ''}`}>
            <thead>
              <tr>
                <th />
                {ordered.map((n) => (
                  <th key={n} title={team(n).fr}>
                    {team(n).flag}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.t.name}>
                  <th title={row.t.fr} className="sticky">
                    {row.t.flag}
                  </th>
                  {ordered.map((col) => {
                    if (col === row.t.name) return <td key={col} className="self" />;
                    const r = row.byOpponent.get(col);
                    if (!r) return <td key={col} className="none" title={`${row.t.fr} – ${team(col).fr} : jamais affrontés`} />;
                    const v = winRate(r);
                    return (
                      <td key={col} style={{ ['--v' as string]: v }} className="heat">
                        <button onClick={() => onCompare(row.t.name, col)} title={`${row.t.fr} – ${team(col).fr} : ${r.wins}V ${r.draws}N ${r.losses}D`}>
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
