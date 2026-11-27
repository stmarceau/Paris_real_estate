import { useEffect, useMemo, useState } from 'react';
import { PERIODS, TEAMS, formatDate, isKnownTeam, loadLocalMatches, matchesFromCSV, periodById, saveLocalMatches, type Match } from './data';
import { useRoute, type View } from './router';
import { HeadToHeadView } from './components/HeadToHeadView';
import { ResultsView } from './components/ResultsView';
import { OverviewView } from './components/OverviewView';
import { CompetitionsView } from './components/CompetitionsView';
import type { LeftOut } from './competitions';

/** Line icons in the style of system symbols (24×24, drawn with the current text colour). */
const ICONS: Record<View, JSX.Element> = {
  'head-to-head': <path d="M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5M20 16H6m0 0 3.5-3.5M6 16l3.5 3.5" />,
  competitions: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4m-4 3h8m-6.5 0 .5-3h4l.5 3" />
  ),
  results: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  rankings: <path d="M5 20v-8M12 20V5M19 20v-5" strokeWidth={2.6} />,
};

function Icon({ view }: { view: View }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[view]}
    </svg>
  );
}

const TABS: { view: View; label: string }[] = [
  { view: 'head-to-head', label: 'Head-to-head' },
  { view: 'competitions', label: 'Competitions' },
  { view: 'results', label: 'Results' },
  { view: 'rankings', label: 'Rankings' },
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

  const period = periodById(route.params.get('period'));
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
          <span className="brand-name">RugbyNation</span>
        </div>
        <div className="top-right">
          <div className="period" role="radiogroup" aria-label="Period">
            <span className="period-label">Period</span>
            {PERIODS.map((pe) => (
              <button
                key={pe.id}
                role="radio"
                aria-checked={pe.id === period.id}
                className={pe.id === period.id ? 'on' : ''}
                onClick={() => navigate(route.view, { ...Object.fromEntries(p), period: pe.id === PERIODS[0].id ? undefined : pe.id })}
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
              onClick={() => navigate(t.view, t.view === 'head-to-head' ? { a: p.get('a') ?? undefined, b: p.get('b') ?? undefined } : {})}
            >
              <Icon view={t.view} />
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
        </div>
      </header>

      <main>
        <div className="title-block">
          <h1 className="large-title">{TABS.find((t) => t.view === route.view)?.label}</h1>
          <p className="subtitle">
            Rugby World Cup nations · {period.from ? `since ${period.from}` : 'since 1871'}
          </p>
        </div>
        {error && <p className="error">Could not load the data ({error}).</p>}
        {!base && !error && <p className="loading">Loading results…</p>}
        {base && route.view === 'head-to-head' && (
          <HeadToHeadView
            matches={matches}
            a={validTeam(p.get('a'), 'France')}
            b={validTeam(p.get('b'), 'New Zealand')}
            onChange={(a, b) => navigate('head-to-head', { a, b })}
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
        {base && route.view === 'results' && (
          <ResultsView
            matches={matches}
            teamName={validTeam(p.get('team'), '')}
            opponent={validTeam(p.get('opponent'), '')}
            onFilter={(team, opponent) => navigate('results', { team, opponent })}
            onAdd={(m) => updateLocal([...local, m])}
            onRemove={(id) => updateLocal(local.filter((m) => m.id !== id))}
          />
        )}
        {base && route.view === 'rankings' && (
          <OverviewView
            matches={matches}
            teamName={validTeam(p.get('team'), 'France')}
            onTeam={(team) => navigate('rankings', { team })}
            onCompare={(a, b) => {
              navigate('head-to-head', { a, b });
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </main>

      <footer className="foot muted small">
        {base && (
          <p>
            {base.length.toLocaleString('en-GB')} test matches between the {TEAMS.length} nations that have played a Rugby World Cup (1987–2023) or qualified
            for 2027 · data up to {formatDate(base.reduce((d, m) => (m.date > d ? m.date : d), ''))}
            {local.length > 0 && ` · ${local.length} result(s) added in this browser (latest match: ${formatDate(lastDate)})`}.
          </p>
        )}
        <p>
          Source: <a href="https://rugbyarchive.github.io/">Nuck's Rugby Archive</a> (11,000+ matches since 1871). Early scores follow the scoring values of their time.
        </p>
      </footer>
    </div>
  );
}
