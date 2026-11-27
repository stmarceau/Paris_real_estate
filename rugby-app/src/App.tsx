import { useEffect, useMemo, useState } from 'react';
import { PERIODS, TEAMS, isKnownTeam, loadLocalMatches, matchesFromCSV, periodById, saveLocalMatches, type Match } from './data';
import { useRoute, type View } from './router';
import { HeadToHeadView } from './components/HeadToHeadView';
import { ResultsView } from './components/ResultsView';
import { OverviewView } from './components/OverviewView';
import { CompetitionsView } from './components/CompetitionsView';
import type { LeftOut } from './competitions';

const TABS: { view: View; label: string; icon: string }[] = [
  { view: 'face-a-face', label: 'Face-à-face', icon: '⚔️' },
  { view: 'competitions', label: 'Compétitions', icon: '🏆' },
  { view: 'resultats', label: 'Résultats', icon: '📋' },
  { view: 'bilans', label: 'Bilans', icon: '📊' },
];

export default function App() {
  const [base, setBase] = useState<Match[] | null>(null);
  const [error, setError] = useState('');
  const [local, setLocal] = useState<Match[]>(loadLocalMatches);
  const [compMeta, setCompMeta] = useState<Record<string, LeftOut>>({});
  const [route, navigate] = useRoute();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/rugby_results.csv`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => setBase(matchesFromCSV(t)))
      .catch((e) => setError(String(e)));
    // Optional: which competitions miss matches against nations outside the app.
    fetch(`${import.meta.env.BASE_URL}data/competitions.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCompMeta)
      .catch(() => {});
  }, []);

  const period = periodById(route.params.get('periode'));
  const allMatches = useMemo(() => (base ? [...base, ...local] : []), [base, local]);
  // Every view works on the matches of the selected period only.
  const matches = useMemo(() => allMatches.filter((m) => m.year >= period.from), [allMatches, period.from]);
  const lastDate = useMemo(() => allMatches.reduce((d, m) => (m.date > d ? m.date : d), ''), [allMatches]);

  const updateLocal = (list: Match[]) => {
    setLocal(list);
    saveLocalMatches(list);
  };

  const p = route.params;
  const validTeam = (n: string | null, fallback: string) => (isKnownTeam(n) ? n : fallback);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            🏉
          </span>
          <div>
            <h1>Rugby Face-à-Face</h1>
            <p className="muted small">Les nations de la Coupe du monde, de 1871 à aujourd’hui</p>
          </div>
        </div>
        <div className="top-right">
          <div className="period" role="radiogroup" aria-label="Période">
            <span className="period-label">Période</span>
            {PERIODS.map((pe) => (
              <button
                key={pe.id}
                role="radio"
                aria-checked={pe.id === period.id}
                className={pe.id === period.id ? 'on' : ''}
                onClick={() => navigate(route.view, { ...Object.fromEntries(p), periode: pe.id === PERIODS[0].id ? undefined : pe.id })}
              >
                <span className="long">{pe.label}</span>
                <span className="short">{pe.short}</span>
              </button>
            ))}
          </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.view}
              className={route.view === t.view ? 'on' : ''}
              aria-current={route.view === t.view ? 'page' : undefined}
              onClick={() => navigate(t.view, t.view === 'face-a-face' ? { a: p.get('a') ?? undefined, b: p.get('b') ?? undefined } : {})}
            >
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        </div>
      </header>

      <main>
        {error && <p className="error">Impossible de charger les données ({error}).</p>}
        {!base && !error && <p className="loading">Chargement des résultats…</p>}
        {base && route.view === 'face-a-face' && (
          <HeadToHeadView
            matches={matches}
            a={validTeam(p.get('a'), 'France')}
            b={validTeam(p.get('b'), 'New Zealand')}
            onChange={(a, b) => navigate('face-a-face', { a, b })}
          />
        )}
        {base && route.view === 'competitions' && (
          <CompetitionsView
            matches={matches}
            meta={compMeta}
            family={p.get('c') ?? ''}
            edition={p.get('e') ?? ''}
            onSelect={(c, e) => navigate('competitions', { c, e })}
          />
        )}
        {base && route.view === 'resultats' && (
          <ResultsView
            matches={matches}
            teamName={validTeam(p.get('equipe'), '')}
            opponent={validTeam(p.get('adversaire'), '')}
            onFilter={(equipe, adversaire) => navigate('resultats', { equipe, adversaire })}
            onAdd={(m) => updateLocal([...local, m])}
            onRemove={(id) => updateLocal(local.filter((m) => m.id !== id))}
          />
        )}
        {base && route.view === 'bilans' && (
          <OverviewView
            matches={matches}
            teamName={validTeam(p.get('equipe'), 'France')}
            onTeam={(equipe) => navigate('bilans', { equipe })}
            onCompare={(a, b) => {
              navigate('face-a-face', { a, b });
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </main>

      <footer className="foot muted small">
        {base && (
          <p>
            {base.length.toLocaleString('fr-FR')} test-matchs entre les {TEAMS.length} nations ayant disputé une Coupe du monde (1987–2023) ou qualifiées pour 2027 ·
            données jusqu’au {new Date(base.reduce((d, m) => (m.date > d ? m.date : d), '') + 'T12:00').toLocaleDateString('fr-FR')}
            {local.length > 0 && ` · ${local.length} résultat(s) ajouté(s) localement (dernier match : ${new Date(lastDate + 'T12:00').toLocaleDateString('fr-FR')})`}.
          </p>
        )}
        <p>
          Source : <a href="https://rugbyarchive.github.io/">Nuck's Rugby Archive</a> (11 000+ matchs depuis 1871). Les scores anciens suivent les barèmes de l’époque.
        </p>
      </footer>
    </div>
  );
}
