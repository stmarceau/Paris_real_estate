import { useCallback, useEffect, useState } from 'react';

export type View = 'resultats' | 'face-a-face' | 'competitions' | 'bilans';
const VIEWS: View[] = ['resultats', 'face-a-face', 'competitions', 'bilans'];

export interface Route {
  view: View;
  params: URLSearchParams;
}

function parse(): Route {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const view = (VIEWS as string[]).includes(path) ? (path as View) : 'face-a-face';
  return { view, params: new URLSearchParams(query) };
}

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
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    const next = `#/${view}${s ? '?' + s : ''}`;
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
    setRoute(parse());
  }, []);
  return [route, navigate];
}
