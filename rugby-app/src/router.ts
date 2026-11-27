import { useCallback, useEffect, useState } from 'react';

export type View = 'head-to-head' | 'competitions' | 'results' | 'rankings';
const VIEWS: View[] = ['head-to-head', 'competitions', 'results', 'rankings'];

/** Links shared before the app was translated keep working. */
const VIEW_ALIASES: Record<string, View> = { 'face-a-face': 'head-to-head', resultats: 'results', bilans: 'rankings' };
const PARAM_ALIASES: Record<string, string> = { equipe: 'team', adversaire: 'opponent', periode: 'period' };

export interface Route {
  view: View;
  params: URLSearchParams;
}

function parse(): Route {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const view = (VIEWS as string[]).includes(path) ? (path as View) : VIEW_ALIASES[path] ?? 'head-to-head';
  const params = new URLSearchParams();
  new URLSearchParams(query).forEach((v, k) => params.set(PARAM_ALIASES[k] ?? k, v));
  return { view, params };
}

/** Params that apply to the whole app and are kept when switching views. */
const GLOBAL_PARAMS = ['period'];

/** Tiny hash router: state lives in the URL so any view can be shared or bookmarked. */
export function useRoute(): [Route, (view: View, params?: Record<string, string | undefined>) => void] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((view: View, params: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    const current = parse().params;
    GLOBAL_PARAMS.forEach((k) => {
      const v = current.get(k);
      if (v && !(k in params)) q.set(k, v);
    });
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    const next = `#/${view}${s ? '?' + s : ''}`;
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
    setRoute(parse());
  }, []);
  return [route, navigate];
}
