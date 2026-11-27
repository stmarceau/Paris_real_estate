import { useMemo, useState } from 'react';
import { sortByDateDesc, type Match } from '../data';
import { involves } from '../stats';
import { AddMatchForm } from './AddMatchForm';
import { MatchRow, TeamSelect } from './common';

const PAGE = 40;

export function ResultsView({
  matches,
  teamName,
  opponent,
  onFilter,
  onAdd,
  onRemove,
}: {
  matches: Match[];
  teamName: string;
  opponent: string;
  onFilter: (team: string, opponent: string) => void;
  onAdd: (m: Match) => void;
  onRemove: (id: string) => void;
}) {
  const years = useMemo(() => {
    const ys = matches.map((m) => m.year);
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, [matches]);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState<number | ''>('');
  const [to, setTo] = useState<number | ''>('');
  const [wcOnly, setWcOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortByDateDesc(
      matches.filter((m) => {
        if (teamName && opponent) {
          if (!involves(m, teamName, opponent)) return false;
        } else if (teamName && m.home !== teamName && m.away !== teamName) return false;
        if (from !== '' && m.year < from) return false;
        if (to !== '' && m.year > to) return false;
        if (wcOnly && !m.worldCup) return false;
        if (q && !`${m.competition} ${m.espnCompetition ?? ""} ${m.stadium} ${m.city}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    );
  }, [matches, teamName, opponent, query, from, to, wcOnly]);

  const reset = () => {
    onFilter('', '');
    setQuery('');
    setFrom('');
    setTo('');
    setWcOnly(false);
    setLimit(PAGE);
  };

  return (
    <section className="view">
      <div className="card filters">
        <TeamSelect label="Team" value={teamName} allowEmpty="All" onChange={(v) => { onFilter(v, v ? opponent : ''); setLimit(PAGE); }} />
        <TeamSelect label="Opponent" value={opponent} allowEmpty="All" exclude={teamName} onChange={(v) => { onFilter(teamName, v); setLimit(PAGE); }} />
        <label className="field">
          <span className="field-label">Competition / venue</span>
          <input type="search" placeholder="e.g. Six Nations, Twickenham…" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
        </label>
        <div className="field years">
          <span className="field-label">Years</span>
          <div className="row">
            <input type="number" inputMode="numeric" placeholder={String(years.min)} min={years.min} max={years.max} value={from} onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : '')} aria-label="From year" />
            <span className="muted">→</span>
            <input type="number" inputMode="numeric" placeholder={String(years.max)} min={years.min} max={years.max} value={to} onChange={(e) => setTo(e.target.value ? Number(e.target.value) : '')} aria-label="To year" />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={wcOnly} onChange={(e) => setWcOnly(e.target.checked)} /> World Cup only
        </label>
        <div className="filters-actions">
          <button className="btn ghost" onClick={reset}>
            Reset
          </button>
          <button className="btn" onClick={() => setAdding((s) => !s)}>
            {adding ? 'Close' : '+ Add a result'}
          </button>
        </div>
      </div>

      {adding && (
        <AddMatchForm
          onAdd={(m) => {
            onAdd(m);
            setAdding(false);
          }}
        />
      )}

      <p className="count muted">
        {filtered.length.toLocaleString('en-GB')} {filtered.length === 1 ? 'match' : 'matches'}
      </p>
      {filtered.length === 0 ? (
        <p className="empty">No matches for these filters.</p>
      ) : (
        <ul className="matches">
          {filtered.slice(0, limit).map((m) => (
            <MatchRow key={m.id} m={m} perspective={teamName || undefined} onRemove={m.local ? () => onRemove(m.id) : undefined} />
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>
          Show more ({filtered.length - limit} left)
        </button>
      )}
    </section>
  );
}
