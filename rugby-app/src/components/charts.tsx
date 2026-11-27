import { useEffect, useRef, useState } from 'react';

/** Width of the chart container in CSS px, so SVG text keeps a real 11px size on any screen. */
function useWidth(fallback = 640): [React.RefObject<HTMLElement>, number] {
  const ref = useRef<HTMLElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
import type { DecadeRow } from '../stats';
import { formatDate } from '../data';

/** Stacked bars per decade: wins A (bottom), draws, wins B (top). */
export function DecadeBars({ rows, labelA, labelB }: { rows: DecadeRow[]; labelA: string; labelB: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const max = Math.max(1, ...rows.map((r) => r.winsA + r.draws + r.winsB));
  const H = W < 480 ? 180 : 220;
  const pad = { l: 28, r: 8, t: 10, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / Math.max(1, rows.length);
  const bw = Math.min(36, slot * 0.7);
  const y = (v: number) => (v / max) * ih;
  const ticks = niceTicks(max);
  const h = hover !== null ? rows[hover] : null;

  return (
    <figure className="chart" ref={ref as React.RefObject<HTMLElement>}>
      <div className="chart-readout" aria-live="polite">
        {h ? (
          <>
            <b>{h.decade}s</b> · <span className="ka">{labelA} {h.winsA}</span> ·{' '}
            <span className="kd">draws {h.draws}</span> · <span className="kb">{labelB} {h.winsB}</span>
          </>
        ) : (
          <span className="muted">Hover or tap a decade</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wins per decade" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - y(t)} y2={pad.t + ih - y(t)} className="grid" />
            <text x={pad.l - 6} y={pad.t + ih - y(t) + 4} className="axis" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = pad.l + i * slot + (slot - bw) / 2;
          let base = pad.t + ih;
          const segs = [
            { v: r.winsA, cls: 'fill-a' },
            { v: r.draws, cls: 'fill-d' },
            { v: r.winsB, cls: 'fill-b' },
          ];
          const every = Math.ceil(rows.length / Math.max(3, Math.floor(iw / 44)));
          const showLabel = i % every === 0;
          return (
            <g key={r.decade} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} className={hover === i ? 'hot' : ''}>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
              {segs.map((s, j) => {
                const hh = y(s.v);
                base -= hh;
                return s.v ? <rect key={j} x={x} y={base} width={bw} height={Math.max(0, hh - 1)} rx={2} className={s.cls} /> : null;
              })}
              {showLabel && (
                <text x={x + bw / 2} y={H - 8} className="axis" textAnchor="middle">
                  {`'${String(r.decade).slice(2)}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span className="key ka">{labelA}</span>
        <span className="key kd">Draws</span>
        <span className="key kb">{labelB}</span>
      </figcaption>
    </figure>
  );
}

/** Running balance (wins A − wins B) over time. Above zero = A leads the series. */
export function BalanceChart({ points, labelA, labelB }: { points: { date: string; value: number }[]; labelA: string; labelB: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  if (points.length < 2) return null;
  const H = W < 480 ? 170 : 200;
  const pad = { l: 30, r: 10, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const vals = points.map((p) => p.value);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = Math.max(1, hi - lo);
  const x = (i: number) => pad.l + (i / (points.length - 1)) * iw;
  const y = (v: number) => pad.t + ((hi - v) / span) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = `${d}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const firstYear = points[0].date.slice(0, 4);
  const lastYear = points[points.length - 1].date.slice(0, 4);
  const h = hover !== null ? points[hover] : points[points.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const lead = h.value > 0 ? `${labelA} +${h.value}` : h.value < 0 ? `${labelB} +${-h.value}` : 'All square';

  return (
    <figure className="chart" ref={ref as React.RefObject<HTMLElement>}>
      <div className="chart-readout" aria-live="polite">
        <b>{formatDate(h.date)}</b> · after {hover !== null ? hover + 1 : points.length} matches ·{' '}
        <span className={h.value > 0 ? 'ka' : h.value < 0 ? 'kb' : 'kd'}>{lead}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Running difference in wins" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <clipPath id="above">
            <rect x={0} y={0} width={W} height={y(0)} />
          </clipPath>
          <clipPath id="below">
            <rect x={0} y={y(0)} width={W} height={H} />
          </clipPath>
        </defs>
        <path d={area} className="area-a" clipPath="url(#above)" />
        <path d={area} className="area-b" clipPath="url(#below)" />
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="zero" />
        <path d={d} className="line" />
        <text x={pad.l - 6} y={y(hi) + 4} className="axis" textAnchor="end">
          {hi > 0 ? `+${hi}` : hi}
        </text>
        <text x={pad.l - 6} y={y(0) + 4} className="axis" textAnchor="end">
          0
        </text>
        {lo < 0 && (
          <text x={pad.l - 6} y={y(lo) + 4} className="axis" textAnchor="end">
            {lo}
          </text>
        )}
        <text x={pad.l} y={H - 6} className="axis">
          {firstYear}
        </text>
        <text x={W - pad.r} y={H - 6} className="axis" textAnchor="end">
          {lastYear}
        </text>
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="cursor" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r={4} className="dot" />
          </>
        )}
      </svg>
      <figcaption className="legend">
        <span className="key ka">Above 0: {labelA} lead</span>
        <span className="key kb">Below: {labelB} lead</span>
      </figcaption>
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 5 ? 1 : max <= 12 ? 2 : max <= 25 ? 5 : 10;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}
