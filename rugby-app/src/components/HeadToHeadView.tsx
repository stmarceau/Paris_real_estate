import { useMemo, useState } from 'react';
import { formatDate, sortByDateDesc, team, type Match } from '../data';
import { headToHead, type Record as Rec, type Streak, type TeamView } from '../stats';
import { BalanceChart, DecadeBars } from './charts';
import { MatchRow, TeamSelect, pct } from './common';

export function HeadToHeadView({
  matches,
  a,
  b,
  onChange,
}: {
  matches: Match[];
  a: string;
  b: string;
  onChange: (a: string, b: string) => void;
}) {
  const h = useMemo(() => headToHead(matches, a, b), [matches, a, b]);
  const [showAll, setShowAll] = useState(false);
  const ta = team(a);
  const tb = team(b);
  const t = h.total;
  const list = sortByDateDesc(h.views.map((v) => v.match));

  return (
    <section className="view">
      <div className="picker">
        <TeamSelect label="Équipe A" value={a} onChange={(v) => onChange(v, v === b ? a : b)} />
        <button className="swap" onClick={() => onChange(b, a)} aria-label="Inverser les équipes" title="Inverser">
          ⇄
        </button>
        <TeamSelect label="Équipe B" value={b} onChange={(v) => onChange(v === a ? b : a, v)} />
      </div>

      {t.played === 0 ? (
        <p className="empty">Aucun match entre {ta.fr} et {tb.fr} sur la période choisie.</p>
      ) : (
        <>
          <div className="hero card">
            <div className="hero-team">
              <span className="hero-flag">{ta.flag}</span>
              <span className="hero-name">{ta.fr}</span>
              <span className="hero-wins ka">{t.wins}</span>
              <span className="muted">victoires</span>
            </div>
            <div className="hero-mid">
              <span className="hero-played">{t.played}</span>
              <span className="muted">matchs</span>
              <span className="hero-draws">{t.draws} nul{t.draws > 1 ? 's' : ''}</span>
            </div>
            <div className="hero-team">
              <span className="hero-flag">{tb.flag}</span>
              <span className="hero-name">{tb.fr}</span>
              <span className="hero-wins kb">{t.losses}</span>
              <span className="muted">victoires</span>
            </div>
            <ShareBar r={t} />
            <p className="hero-sub muted">
              Depuis le {formatDate(h.views[0].match.date)} · dernier match le {formatDate(h.views[h.views.length - 1].match.date)}
            </p>
          </div>

          <div className="grid-stats">
            <Stat label="Points marqués" a={t.pointsFor} b={t.pointsAgainst} />
            <Stat label="Moyenne par match" a={(t.pointsFor / t.played).toFixed(1)} b={(t.pointsAgainst / t.played).toFixed(1)} />
            <Stat label="10 derniers matchs" a={`${h.last10.wins} V`} b={`${h.last10.losses} V`} note={h.last10.draws ? `${h.last10.draws} nul(s)` : undefined} />
            <Stat
              label="Coupe du monde"
              a={h.worldCup.played ? h.worldCup.wins : '–'}
              b={h.worldCup.played ? h.worldCup.losses : '–'}
              note={h.worldCup.played ? `${h.worldCup.played} match(s)` : 'Jamais affrontés'}
            />
          </div>

          <div className="card">
            <h3>Forme récente</h3>
            <p className="muted small">Les 10 derniers face-à-face, du plus ancien au plus récent, vus par {ta.fr}.</p>
            <div className="form-strip">
              {h.views.slice(-10).map((v) => (
                <span key={v.match.id} className={`badge big ${v.outcome === 'W' ? 'w' : v.outcome === 'L' ? 'l' : 'd'}`} title={`${formatDate(v.match.date)} : ${v.for}–${v.against}`}>
                  {v.outcome === 'W' ? 'V' : v.outcome === 'L' ? 'D' : 'N'}
                </span>
              ))}
            </div>
            <p className="small">
              <StreakText s={h.currentStreak} a={ta.fr} b={tb.fr} current />
            </p>
          </div>

          <div className="two-col">
            <div className="card">
              <h3>Selon le lieu</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Lieu</th>
                    <th>J</th>
                    <th className="ka">{ta.flag}</th>
                    <th>N</th>
                    <th className="kb">{tb.flag}</th>
                    <th>% {ta.flag}</th>
                  </tr>
                </thead>
                <tbody>
                  <VenueRow label={`Chez ${ta.fr}`} r={h.byVenue.home} />
                  <VenueRow label={`Chez ${tb.fr}`} r={h.byVenue.away} />
                  <VenueRow label="Terrain neutre" r={h.byVenue.neutral} />
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Records</h3>
              <ul className="records">
                <RecordItem label={`Plus large victoire ${ta.fr}`} v={h.biggestWinA} />
                <RecordItem label={`Plus large victoire ${tb.fr}`} v={h.biggestWinB} />
                <RecordItem label="Match le plus prolifique" v={h.highestAggregate} total />
                <li>
                  <span className="muted">Plus longues séries</span>
                  <span>
                    <span className="ka">{ta.fr} : {h.longestStreakA.length}</span> · <span className="kb">{tb.fr} : {h.longestStreakB.length}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <h3>Victoires par décennie</h3>
            <DecadeBars rows={h.decades} labelA={ta.fr} labelB={tb.fr} />
          </div>

          <div className="card">
            <h3>Qui mène la série ?</h3>
            <BalanceChart points={h.balance} labelA={ta.fr} labelB={tb.fr} />
          </div>

          <div className="card">
            <h3>Tous les matchs ({list.length})</h3>
            <ul className="matches">
              {(showAll ? list : list.slice(0, 15)).map((m) => (
                <MatchRow key={m.id} m={m} perspective={a} />
              ))}
            </ul>
            {list.length > 15 && (
              <button className="btn ghost" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Réduire' : `Afficher les ${list.length - 15} autres`}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ShareBar({ r }: { r: Rec }) {
  const w = (n: number) => `${(n / r.played) * 100}%`;
  return (
    <div className="sharebar" role="img" aria-label={`${pct(r.wins / r.played)} de victoires A, ${pct(r.draws / r.played)} de nuls, ${pct(r.losses / r.played)} de victoires B`}>
      <span className="fill-a" style={{ width: w(r.wins) }}>{r.wins / r.played >= 0.12 ? pct(r.wins / r.played) : ''}</span>
      <span className="fill-d" style={{ width: w(r.draws) }} />
      <span className="fill-b" style={{ width: w(r.losses) }}>{r.losses / r.played >= 0.12 ? pct(r.losses / r.played) : ''}</span>
    </div>
  );
}

function Stat({ label, a, b, note }: { label: string; a: string | number; b: string | number; note?: string }) {
  return (
    <div className="card stat">
      <span className="muted small">{label}</span>
      <div className="stat-vals">
        <b className="ka">{a}</b>
        <span className="muted">vs</span>
        <b className="kb">{b}</b>
      </div>
      {note && <span className="muted small">{note}</span>}
    </div>
  );
}

function VenueRow({ label, r }: { label: string; r: Rec }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{r.played}</td>
      <td>{r.wins}</td>
      <td>{r.draws}</td>
      <td>{r.losses}</td>
      <td>{r.played ? pct(r.wins / r.played) : '–'}</td>
    </tr>
  );
}

function RecordItem({ label, v, total }: { label: string; v?: TeamView; total?: boolean }) {
  if (!v) return (
    <li>
      <span className="muted">{label}</span>
      <span>–</span>
    </li>
  );
  const m = v.match;
  return (
    <li>
      <span className="muted">{label}</span>
      <span>
        <b>
          {team(m.home).flag} {m.homeScore}–{m.awayScore} {team(m.away).flag}
        </b>{' '}
        <span className="muted small">
          {total ? `(${m.homeScore + m.awayScore} pts) ` : ''}
          {formatDate(m.date)}
        </span>
      </span>
    </li>
  );
}

function StreakText({ s, a, b, current }: { s: Streak; a: string; b: string; current?: boolean }) {
  if (!s.team) return null;
  const who = s.team === 'A' ? a : s.team === 'B' ? b : null;
  const prefix = current ? 'Série en cours : ' : '';
  if (!who) return <>{prefix}{s.length} match{s.length > 1 ? 's' : ''} nul{s.length > 1 ? 's' : ''} consécutif{s.length > 1 ? 's' : ''}</>;
  return (
    <>
      {prefix}
      <b className={s.team === 'A' ? 'ka' : 'kb'}>{who}</b> a gagné {s.length > 1 ? `les ${s.length} derniers matchs` : 'le dernier match'}
      {s.from && s.length > 1 ? ` (depuis ${s.from.slice(0, 4)})` : ''}.
    </>
  );
}
