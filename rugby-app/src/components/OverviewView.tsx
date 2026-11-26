import { useMemo, useState } from 'react';
import { TEAMS, team, type Match } from '../data';
import { teamRecords, winRate } from '../stats';
import { TeamSelect, pct } from './common';

const ERAS = [
  { label: 'Depuis 1871', from: 0 },
  { label: 'Ère pro (1995+)', from: 1995 },
  { label: 'Depuis 2010', from: 2010 },
];

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
  const from = ERAS[era].from;

  const ranking = useMemo(
    () =>
      TEAMS.map((t) => ({ t, ...teamRecords(matches, t.name, from) }))
        .filter((x) => x.overall.played)
        .sort((x, y) => winRate(y.overall) - winRate(x.overall)),
    [matches, from],
  );
  const current = ranking.find((r) => r.t.name === teamName) ?? ranking[0];
  const opps = current
    ? [...current.byOpponent.entries()].sort((x, y) => winRate(y[1]) - winRate(x[1]))
    : [];
  const ordered = ranking.map((r) => r.t.name);

  return (
    <section className="view">
      <div className="segmented" role="tablist" aria-label="Période">
        {ERAS.map((e, i) => (
          <button key={e.label} role="tab" aria-selected={era === i} className={era === i ? 'on' : ''} onClick={() => setEra(i)}>
            {e.label}
          </button>
        ))}
      </div>

      <div className="card">
        <h3>Classement au pourcentage de victoires</h3>
        <p className="muted small">Matchs entre ces 10 nations uniquement.</p>
        <ol className="ranking">
          {ranking.map((r) => (
            <li key={r.t.name}>
              <button className={`rank-row ${r.t.name === current?.t.name ? 'on' : ''}`} onClick={() => onTeam(r.t.name)}>
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

      {current && (
        <div className="card">
          <div className="card-head">
            <h3>Bilan de {current.t.fr}</h3>
            <TeamSelect label="Équipe" value={current.t.name} onChange={onTeam} />
          </div>
          <p className="small">
            {current.overall.played} matchs · <b className="ka">{current.overall.wins} V</b> · {current.overall.draws} N ·{' '}
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
                      <WinPill v={winRate(r)} />
                    </td>
                    <td>
                      <button className="link" onClick={() => onCompare(current.t.name, opp)}>
                        Face-à-face →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Matrice des face-à-face</h3>
        <p className="muted small">% de victoires de l’équipe en ligne contre l’équipe en colonne. Touchez une case pour le détail.</p>
        <div className="table-wrap">
          <table className="matrix">
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
                  <th title={row.t.fr}>{row.t.flag}</th>
                  {ordered.map((col) => {
                    if (col === row.t.name) return <td key={col} className="self" />;
                    const r = row.byOpponent.get(col);
                    if (!r) return <td key={col} className="none">–</td>;
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

function WinPill({ v }: { v: number }) {
  return <span className={`pill ${v >= 0.5 ? 'ka' : 'kb'}`}>{pct(v)}</span>;
}
