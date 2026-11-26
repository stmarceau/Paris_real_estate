import { TEAMS, formatDate, team, type Match } from '../data';

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
        {TEAMS.filter((t) => t.name !== exclude)
          .slice()
          .sort((x, y) => x.fr.localeCompare(y.fr, 'fr'))
          .map((t) => (
            <option key={t.name} value={t.name}>
              {t.flag} {t.fr}
            </option>
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
      {short ? null : <span>{t.fr}</span>}
    </span>
  );
}

/** One result, rendered as a scoreboard line. `perspective` highlights a team's win/loss. */
export function MatchRow({ m, perspective, onRemove }: { m: Match; perspective?: string; onRemove?: () => void }) {
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  let badge: { cls: string; txt: string } | null = null;
  if (perspective) {
    const isHome = m.home === perspective;
    const won = isHome ? homeWin : awayWin;
    const lost = isHome ? awayWin : homeWin;
    badge = won ? { cls: 'w', txt: 'V' } : lost ? { cls: 'l', txt: 'D' } : { cls: 'd', txt: 'N' };
  }
  return (
    <li className="match">
      <div className="match-meta">
        <time dateTime={m.date}>{formatDate(m.date)}</time>
        <span className="match-comp" title={m.competition}>
          {m.worldCup && <span className="tag wc">Coupe du monde</span>}
          {m.local && <span className="tag local">Ajouté</span>}
          {m.competition}
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
          <span className={`badge ${badge.cls}`} aria-label={badge.cls === 'w' ? 'Victoire' : badge.cls === 'l' ? 'Défaite' : 'Nul'}>
            {badge.txt}
          </span>
        )}
      </div>
      <div className="match-venue">
        {[m.stadium, m.city].filter(Boolean).join(', ')}
        {m.neutral && ' · terrain neutre'}
        {onRemove && (
          <button className="link danger" onClick={onRemove}>
            Supprimer
          </button>
        )}
      </div>
    </li>
  );
}

export function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}
