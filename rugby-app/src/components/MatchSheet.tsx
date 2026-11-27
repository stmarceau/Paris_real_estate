import { createContext, useEffect, useRef } from 'react';
import { competitionLabel, formatDate, team, type Match } from '../data';
import { GOALS_ERA_END, SCORE_KINDS, breakdownMatchesScore, pointValues } from '../scoring';

/** Any match row can open the detail sheet through this context. */
export const MatchDetailContext = createContext<((m: Match) => void) | null>(null);

export function MatchSheet({ match: m, onClose, onHeadToHead }: { match: Match; onClose: () => void; onHeadToHead: (a: string, b: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const b = m.breakdown;
  const exact = breakdownMatchesScore(m);
  const values = pointValues(m.year);
  const kinds = SCORE_KINDS.filter((k) => !b || ['tries', 'conversions', 'penalties', 'dropGoals'].includes(k.key) || b.home[k.key] || b.away[k.key]);
  const home = team(m.home);
  const away = team(m.away);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="sheet-body">
        <div className="sheet-bar">
          <span className="sheet-grabber" aria-hidden />
          <button className="link sheet-done" onClick={() => ref.current?.close()} autoFocus>
            Done
          </button>
        </div>

        <p className="sheet-meta">
          {m.worldCup && <span className="tag wc">World Cup</span>}
          {competitionLabel(m) || 'Test match'}
        </p>
        <p className="muted small sheet-date">
          {formatDate(m.date)}
          {(m.stadium || m.city) && ` · ${[m.stadium, m.city].filter(Boolean).join(', ')}`}
          {m.neutral && ' · neutral venue'}
        </p>

        <h2 id="sheet-title" className="sheet-score">
          <span className="sheet-team">
            <span className="sheet-flag">{home.flag}</span>
            <span>{home.display}</span>
          </span>
          <span className="sheet-points">
            <b className={m.homeScore > m.awayScore ? 'winner' : ''}>{m.homeScore}</b>
            <span className="sep">–</span>
            <b className={m.awayScore > m.homeScore ? 'winner' : ''}>{m.awayScore}</b>
          </span>
          <span className="sheet-team">
            <span className="sheet-flag">{away.flag}</span>
            <span>{away.display}</span>
          </span>
        </h2>

        {b ? (
          <>
            <h4>How the points were scored</h4>
            <ul className="breakdown">
              {kinds.map((k) => {
                const h = b.home[k.key];
                const a = b.away[k.key];
                const pts = (n: number) => (exact && values && n ? `${n * values[k.key]} pts` : '');
                return (
                  <li key={k.key}>
                    <span className="bd-val ka">
                      {h}
                      <small>{pts(h)}</small>
                    </span>
                    <span className="bd-mid">
                      <span className="bd-label">{k.plural}</span>
                      <span className="bd-bar" aria-hidden>
                        <span className="fill-a" style={{ flexGrow: h }} />
                        <span className="fill-b" style={{ flexGrow: a }} />
                        {!h && !a && <span className="bd-empty" />}
                      </span>
                    </span>
                    <span className="bd-val kb">
                      {a}
                      <small>{pts(a)}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
            {m.year <= GOALS_ERA_END ? (
              <p className="note small">
                Until {GOALS_ERA_END} a match was decided on goals (converted tries, drop goals, goals from a mark); an unconverted try did not
                count.
              </p>
            ) : !exact ? (
              <p className="note small">The scoring values of the time make the points split uncertain for this match, so only the counts are shown.</p>
            ) : (
              <p className="muted small">
                Values in {m.year}: try {values!.tries}, conversion {values!.conversions}, penalty {values!.penalties}, drop goal {values!.dropGoals}
                {values!.marks ? `, goal from a mark ${values!.marks}` : ''}, penalty try {values!.penaltyTries}
                {m.year >= 2017 ? ' (no conversion needed)' : ''}.
                {m.breakdownSource === 'espn' && ' Source: ESPN.'}
              </p>
            )}
          </>
        ) : (
          <p className="note small">
            Detailed scoring (tries, conversions, penalties, drop goals) is not available for this match. The archive has it for about one match
            in four, mostly recent ones.
          </p>
        )}

        <button
          className="btn wide"
          onClick={() => {
            ref.current?.close();
            onHeadToHead(m.home, m.away);
          }}
        >
          {home.display} v {away.display}: head-to-head
        </button>
      </div>
    </dialog>
  );
}
