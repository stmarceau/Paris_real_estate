import { useMemo } from 'react';
import { formatDate, team, type Match } from '../data';
import { FAMILIES, buildEditions, leftOutFor, standings, winner, worldCupPhases, type Edition, type LeftOut, type Standing } from '../competitions';
import { MatchRow, TeamName } from './common';

/** French names for nations outside the app that appear in some competitions. */
const OTHER_FR: Record<string, string> = {
  Belgium: 'Belgique',
  Brazil: 'Brésil',
  'Cook Islands': 'Îles Cook',
  Czechia: 'Tchéquie',
  Germany: 'Allemagne',
  Kenya: 'Kenya',
  Netherlands: 'Pays-Bas',
  Poland: 'Pologne',
  Switzerland: 'Suisse',
  UAE: 'Émirats arabes unis',
};

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
  const fam = all.has(family) ? family : families[0]?.id;
  const list = all.get(fam) ?? [];
  const idx = Math.max(0, list.findIndex((e) => e.key === edition));
  const ed = list[idx];

  return (
    <section className="view">
      <div className="chips" role="tablist" aria-label="Compétitions">
        {families.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === fam} className={f.id === fam ? 'on' : ''} onClick={() => onSelect(f.id)}>
            {f.label} <span className="muted">{all.get(f.id)!.length}</span>
          </button>
        ))}
      </div>

      {ed && (
        <>
          <div className="card edition-bar">
            <button className="swap" disabled={idx >= list.length - 1} onClick={() => onSelect(fam, list[idx + 1].key)} aria-label="Édition précédente">
              ‹
            </button>
            <label className="field">
              <span className="field-label">Édition</span>
              <select value={ed.key} onChange={(e) => onSelect(fam, e.target.value)}>
                {list.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="swap" disabled={idx === 0} onClick={() => onSelect(fam, list[idx - 1].key)} aria-label="Édition suivante">
              ›
            </button>
          </div>
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
  const final = wc?.rounds[3].matches[0];
  const bronze = wc?.rounds[2].matches[0];
  const champ = final && winner(final);
  const runnerUp = final && champ && (final.home === champ ? final.away : final.home);
  const third = bronze && winner(bronze);
  const leader = groups.length === 1 ? groups[0][0] : null;

  return (
    <>
      <div className="card edition-head">
        <h2>{ed.label}</h2>
        <p className="muted small">
          {ed.matches.length} match{ed.matches.length > 1 ? 's' : ''} · du {formatDate(first.date)} au {formatDate(last.date)}
        </p>
        {champ && (
          <div className="podium">
            <div className="gold">
              <span className="podium-rank">🏆 Champion</span>
              <TeamName name={champ} />
            </div>
            {runnerUp && (
              <div>
                <span className="podium-rank">2e</span>
                <TeamName name={runnerUp} />
              </div>
            )}
            {third && (
              <div>
                <span className="podium-rank">3e</span>
                <TeamName name={third} />
              </div>
            )}
          </div>
        )}
        {leader && (
          <p className="small">
            En tête du classement calculé : <b>{team(leader.team).flag} {team(leader.team).fr}</b> ({leader.wins} V, {leader.draws} N, {leader.losses} D)
            {ed.family.id === 'six-nations' && groups[0].length >= 4 && leader.wins === groups[0].length - 1 && <span className="tag wc">Grand Chelem</span>}
          </p>
        )}
        {ed.inferred > 0 && (
          <p className="note small">
            Édition reconstituée : {ed.inferred === ed.matches.length ? 'ces matchs' : `${ed.inferred} de ces matchs`} n’ont pas de nom de compétition
            dans la source et ont été rattachés d’après les équipes et les dates du tournoi.
          </p>
        )}
        {leftOut && (
          <p className="note small">
            Édition incomplète : {leftOut.leftOut} match{leftOut.leftOut > 1 ? 's' : ''} contre{' '}
            {leftOut.teams.map((t) => OTHER_FR[t] ?? t).join(', ')} (nations absentes de l’app) ne figure{leftOut.leftOut > 1 ? 'nt' : ''} pas ici.
            Le classement est partiel.
          </p>
        )}
      </div>

      {wc && (
        <div className="card">
          <h3>Phase finale</h3>
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
          <h3>Phase de poules</h3>
          <div className="pools">
            {/* The data has no pool names: pools are found from who played whom, so they are not lettered. */}
            {standings(wc.pools).map((g) => (
              <div key={g[0].team}>
                <h4>Poule : {g.map((r) => team(r.team).fr).sort((a, b) => a.localeCompare(b, 'fr')).slice(0, 2).join(', ')}…</h4>
                <StandingsTable rows={g} qualified={2} />
              </div>
            ))}
          </div>
          <TableNote />
          <details className="pool-matches">
            <summary>Tous les matchs de poule ({wc.pools.length})</summary>
            <MatchesByDay matches={wc.pools} />
          </details>
        </div>
      )}

      {groups.length > 0 && (
        <div className="card">
          <h3>Classement</h3>
          {groups.map((g, i) => (
            <div key={g[0].team}>
              {groups.length > 1 && <h4>Groupe {i + 1}</h4>}
              <StandingsTable rows={g} />
            </div>
          ))}
          <TableNote />
        </div>
      )}

      {!wc && (
        <div className="card">
          <h3>Résultats</h3>
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
            <th>Équipe</th>
            <th title="Joués">J</th>
            <th title="Victoires">V</th>
            <th title="Nuls">N</th>
            <th title="Défaites">D</th>
            <th title="Points marqués">PM</th>
            <th title="Points encaissés">PE</th>
            <th title="Différence">+/−</th>
            <th title="Points (2 par victoire, 1 par nul)">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team} className={i < qualified ? 'qualified' : ''}>
              <td>
                <span className="muted pos">{i + 1}</span> {team(r.team).flag} {team(r.team).fr}
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
      Classement calculé à partir des scores : 2 points par victoire, 1 par nul, puis différence de points. Les points de bonus (nombre d’essais) ne
      figurent pas dans les données : l’ordre officiel peut différer quand deux équipes sont proches.
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
