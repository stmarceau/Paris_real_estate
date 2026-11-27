import { useMemo, useState } from 'react';
import { formatDate, sortByDateDesc, team, type Match } from '../data';
import { headToHead, type Record as Rec, type Streak, type TeamView } from '../stats';
import { BalanceChart, DecadeBars } from './charts';
import { MatchRow, TeamSelect, pct } from './common';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const letter = (o: TeamView['outcome']) => (o === 'W' ? 'W' : o === 'L' ? 'L' : 'D');

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
        <TeamSelect label="Team A" value={a} onChange={(v) => onChange(v, v === b ? a : b)} />
        <button className="swap" onClick={() => onChange(b, a)} aria-label="Swap teams" title="Swap">
          ⇄
        </button>
        <TeamSelect label="Team B" value={b} onChange={(v) => onChange(v === a ? b : a, v)} />
      </div>

      {t.played === 0 ? (
        <p className="empty">
          No matches between {ta.display} and {tb.display} in the selected period.
        </p>
      ) : (
        <>
          <div className="hero card">
            <div className="hero-team">
              <span className="hero-flag">{ta.flag}</span>
              <span className="hero-name">{ta.display}</span>
              <span className="hero-wins ka">{t.wins}</span>
              <span className="muted">{t.wins === 1 ? 'win' : 'wins'}</span>
            </div>
            <div className="hero-mid">
              <span className="hero-played">{t.played}</span>
              <span className="muted">{t.played === 1 ? 'match' : 'matches'}</span>
              <span className="hero-draws">{plural(t.draws, 'draw')}</span>
            </div>
            <div className="hero-team">
              <span className="hero-flag">{tb.flag}</span>
              <span className="hero-name">{tb.display}</span>
              <span className="hero-wins kb">{t.losses}</span>
              <span className="muted">{t.losses === 1 ? 'win' : 'wins'}</span>
            </div>
            <ShareBar r={t} />
            <p className="hero-sub muted">
              First meeting {formatDate(h.views[0].match.date)} · latest {formatDate(h.views[h.views.length - 1].match.date)}
            </p>
          </div>

          <div className="grid-stats">
            <Stat label="Points scored" a={t.pointsFor} b={t.pointsAgainst} />
            <Stat label="Average per match" a={(t.pointsFor / t.played).toFixed(1)} b={(t.pointsAgainst / t.played).toFixed(1)} />
            <Stat label="Last 10 matches" a={`${h.last10.wins} W`} b={`${h.last10.losses} W`} note={h.last10.draws ? plural(h.last10.draws, 'draw') : undefined} />
            <Stat
              label="World Cup"
              a={h.worldCup.played ? h.worldCup.wins : '–'}
              b={h.worldCup.played ? h.worldCup.losses : '–'}
              note={h.worldCup.played ? plural(h.worldCup.played, 'match', 'matches') : 'Never met'}
            />
          </div>

          <div className="card">
            <h3>Recent form</h3>
            <p className="muted small">The last 10 meetings, oldest to newest, from {ta.display}’s point of view.</p>
            <div className="form-strip">
              {h.views.slice(-10).map((v) => (
                <span key={v.match.id} className={`badge big ${v.outcome === 'W' ? 'w' : v.outcome === 'L' ? 'l' : 'd'}`} title={`${formatDate(v.match.date)}: ${v.for}–${v.against}`}>
                  {letter(v.outcome)}
                </span>
              ))}
            </div>
            <p className="small">
              <StreakText s={h.currentStreak} a={ta.display} b={tb.display} />
            </p>
          </div>

          <div className="two-col">
            <div className="card">
              <h3>By venue</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>P</th>
                    <th className="ka">{ta.flag}</th>
                    <th>D</th>
                    <th className="kb">{tb.flag}</th>
                    <th>{ta.flag} %</th>
                  </tr>
                </thead>
                <tbody>
                  <VenueRow label={`In ${ta.display}`} r={h.byVenue.home} />
                  <VenueRow label={`In ${tb.display}`} r={h.byVenue.away} />
                  <VenueRow label="Neutral venue" r={h.byVenue.neutral} />
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Records</h3>
              <ul className="records">
                <RecordItem label={`Biggest ${ta.display} win`} v={h.biggestWinA} />
                <RecordItem label={`Biggest ${tb.display} win`} v={h.biggestWinB} />
                <RecordItem label="Highest-scoring match" v={h.highestAggregate} total />
                <li>
                  <span className="muted">Longest winning runs</span>
                  <span>
                    <span className="ka">
                      {ta.display}: {h.longestStreakA.length}
                    </span>{' '}
                    ·{' '}
                    <span className="kb">
                      {tb.display}: {h.longestStreakB.length}
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <h3>Wins per decade</h3>
            <DecadeBars rows={h.decades} labelA={ta.display} labelB={tb.display} />
          </div>

          <div className="card">
            <h3>Who leads the series?</h3>
            <BalanceChart points={h.balance} labelA={ta.display} labelB={tb.display} />
          </div>

          <div className="card">
            <h3>All matches ({list.length})</h3>
            <ul className="matches">
              {(showAll ? list : list.slice(0, 15)).map((m) => (
                <MatchRow key={m.id} m={m} perspective={a} />
              ))}
            </ul>
            {list.length > 15 && (
              <button className="btn ghost" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show less' : `Show ${list.length - 15} more`}
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
    <div className="sharebar" role="img" aria-label={`Team A wins ${pct(r.wins / r.played)}, draws ${pct(r.draws / r.played)}, team B wins ${pct(r.losses / r.played)}`}>
      <span className="fill-a" style={{ width: w(r.wins) }}>
        {r.wins / r.played >= 0.12 ? pct(r.wins / r.played) : ''}
      </span>
      <span className="fill-d" style={{ width: w(r.draws) }} />
      <span className="fill-b" style={{ width: w(r.losses) }}>
        {r.losses / r.played >= 0.12 ? pct(r.losses / r.played) : ''}
      </span>
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
  if (!v)
    return (
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

function StreakText({ s, a, b }: { s: Streak; a: string; b: string }) {
  if (!s.team) return null;
  const who = s.team === 'A' ? a : s.team === 'B' ? b : null;
  if (!who) return <>Current run: {plural(s.length, 'draw')} in a row.</>;
  return (
    <>
      Current run: <b className={s.team === 'A' ? 'ka' : 'kb'}>{who}</b> {s.length > 1 ? `have won the last ${s.length} meetings` : 'won the last meeting'}
      {s.from && s.length > 1 ? ` (since ${s.from.slice(0, 4)})` : ''}.
    </>
  );
}
