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
        if (q && !`${m.competition} ${m.stadium} ${m.city}`.toLowerCase().includes(q)) return false;
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
        <TeamSelect label="Équipe" value={teamName} allowEmpty="Toutes" onChange={(v) => { onFilter(v, v ? opponent : ''); setLimit(PAGE); }} />
        <TeamSelect label="Adversaire" value={opponent} allowEmpty="Tous" exclude={teamName} onChange={(v) => { onFilter(teamName, v); setLimit(PAGE); }} />
        <label className="field">
          <span className="field-label">Compétition / lieu</span>
          <input type="search" placeholder="ex. Six Nations, Twickenham…" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
        </label>
        <div className="field years">
          <span className="field-label">Années</span>
          <div className="row">
            <input type="number" inputMode="numeric" placeholder={String(years.min)} min={years.min} max={years.max} value={from} onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : '')} aria-label="Année de début" />
            <span className="muted">→</span>
            <input type="number" inputMode="numeric" placeholder={String(years.max)} min={years.min} max={years.max} value={to} onChange={(e) => setTo(e.target.value ? Number(e.target.value) : '')} aria-label="Année de fin" />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={wcOnly} onChange={(e) => setWcOnly(e.target.checked)} /> Coupe du monde uniquement
        </label>
        <div className="filters-actions">
          <button className="btn ghost" onClick={reset}>
            Réinitialiser
          </button>
          <button className="btn" onClick={() => setAdding((s) => !s)}>
            {adding ? 'Fermer' : '+ Ajouter un résultat'}
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
        {filtered.length.toLocaleString('fr-FR')} match{filtered.length > 1 ? 's' : ''}
      </p>
      {filtered.length === 0 ? (
        <p className="empty">Aucun match ne correspond à ces filtres.</p>
      ) : (
        <ul className="matches">
          {filtered.slice(0, limit).map((m) => (
            <MatchRow key={m.id} m={m} perspective={teamName || undefined} onRemove={m.local ? () => onRemove(m.id) : undefined} />
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>
          Afficher plus ({filtered.length - limit} restants)
        </button>
      )}
    </section>
  );
}
