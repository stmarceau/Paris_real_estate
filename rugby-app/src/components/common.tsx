import { useContext } from 'react';
import { TEAMS, competitionLabel, formatDate, team, type Match } from '../data';
import { MatchDetailContext } from './MatchSheet';

export function TeamSelect({
  value,
  onChange,
  label,
  allowEmpty,
  exclude,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  allowEmpty?: string;
  exclude?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {[
          { label: 'Six Nations + Rugby Championship', list: TEAMS.filter((t) => t.tier1) },
          { label: 'Other Rugby World Cup nations', list: TEAMS.filter((t) => !t.tier1) },
        ].map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.list
              .filter((t) => t.name !== exclude)
              .sort((x, y) => x.display.localeCompare(y.display, 'en'))
              .map((t) => (
                <option key={t.name} value={t.name}>
                  {t.flag} {t.display}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function TeamName({ name, short }: { name: string; short?: boolean }) {
  const t = team(name);
  return (
    <span className="team-name">
      <span className="flag" aria-hidden>
        {t.flag}
      </span>
      {short ? null : <span>{t.display}</span>}
    </span>
  );
}

/** One result, rendered as a scoreboard line. `perspective` highlights a team's win/loss. */
export function MatchRow({ m, perspective, onRemove }: { m: Match; perspective?: string; onRemove?: () => void }) {
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  let badge: { cls: string; txt: string; label: string } | null = null;
  if (perspective) {
    const isHome = m.home === perspective;
    const won = isHome ? homeWin : awayWin;
    const lost = isHome ? awayWin : homeWin;
    badge = won ? { cls: 'w', txt: 'W', label: 'Win' } : lost ? { cls: 'l', txt: 'L', label: 'Loss' } : { cls: 'd', txt: 'D', label: 'Draw' };
  }
  const open = useContext(MatchDetailContext);
  const onKey = (e: React.KeyboardEvent) => {
    if (open && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open(m);
    }
  };
  return (
    <li
      className={`match ${open ? 'clickable' : ''}`}
      {...(open
        ? { role: 'button', tabIndex: 0, onClick: () => open(m), onKeyDown: onKey, 'aria-label': `${team(m.home).display} ${m.homeScore}–${m.awayScore} ${team(m.away).display}, ${formatDate(m.date)}: details` }
        : {})}
    >
      <div className="match-meta">
        <time dateTime={m.date}>{formatDate(m.date)}</time>
        {m.breakdown && <span className="tag detail" title="Tries, conversions, penalties and drop goals available">Details</span>}
        <span className="match-comp" title={competitionLabel(m)}>
          {m.worldCup && <span className="tag wc">World Cup</span>}
          {m.local && <span className="tag local">Added</span>}
          {competitionLabel(m)}
        </span>
      </div>
      <div className="match-score">
        <span className={`side home ${homeWin ? 'winner' : ''}`}>
          <TeamName name={m.home} />
        </span>
        <span className="score">
          <b className={homeWin ? 'winner' : ''}>{m.homeScore}</b>
          <span className="sep">–</span>
          <b className={awayWin ? 'winner' : ''}>{m.awayScore}</b>
        </span>
        <span className={`side away ${awayWin ? 'winner' : ''}`}>
          <TeamName name={m.away} />
        </span>
        {badge && (
          <span className={`badge ${badge.cls}`} aria-label={badge.label}>
            {badge.txt}
          </span>
        )}
      </div>
      <div className="match-venue">
        {[m.stadium, m.city].filter(Boolean).join(', ')}
        {m.neutral && ' · neutral venue'}
        {onRemove && (
          <button
            className="link danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
