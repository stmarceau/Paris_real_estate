import { useState } from 'react';
import type { Match } from '../data';
import { TeamSelect } from './common';

/** Lets the user record a result not yet in the dataset. Saved in this browser only. */
export function AddMatchForm({ onAdd }: { onAdd: (m: Match) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [home, setHome] = useState('France');
  const [away, setAway] = useState('New Zealand');
  const [hs, setHs] = useState('');
  const [as, setAs] = useState('');
  const [competition, setCompetition] = useState('');
  const [stadium, setStadium] = useState('');
  const [city, setCity] = useState('');
  const [neutral, setNeutral] = useState(false);
  const [worldCup, setWorldCup] = useState(false);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(hs);
    const a = Number(as);
    if (home === away) return setError('Choose two different teams.');
    if (!date) return setError('The date is required.');
    if (hs === '' || as === '' || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return setError('Scores must be whole numbers, zero or more.');
    setError('');
    onAdd({
      id: `l${Date.now()}`,
      date,
      year: Number(date.slice(0, 4)),
      home,
      away,
      homeScore: h,
      awayScore: a,
      competition: competition.trim() || 'Test match',
      stadium: stadium.trim(),
      city: city.trim(),
      country: neutral ? '' : home,
      neutral,
      worldCup,
      local: true,
    });
  };

  return (
    <form className="card add-form" onSubmit={submit}>
      <h3>Add a result</h3>
      <p className="muted small">Saved in this browser only. It counts in every statistic.</p>
      <div className="form-grid">
        <TeamSelect label="Home" value={home} onChange={setHome} />
        <label className="field">
          <span className="field-label">Score</span>
          <input type="number" inputMode="numeric" min={0} value={hs} onChange={(e) => setHs(e.target.value)} required />
        </label>
        <TeamSelect label="Away" value={away} onChange={setAway} />
        <label className="field">
          <span className="field-label">Score</span>
          <input type="number" inputMode="numeric" min={0} value={as} onChange={(e) => setAs(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Competition</span>
          <input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="e.g. 2024 Six Nations" />
        </label>
        <label className="field">
          <span className="field-label">Stadium</span>
          <input value={stadium} onChange={(e) => setStadium(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
      </div>
      <div className="row wrap">
        <label className="check">
          <input type="checkbox" checked={neutral} onChange={(e) => setNeutral(e.target.checked)} /> Neutral venue
        </label>
        <label className="check">
          <input type="checkbox" checked={worldCup} onChange={(e) => setWorldCup(e.target.checked)} /> World Cup
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit">
        Save
      </button>
    </form>
  );
}
