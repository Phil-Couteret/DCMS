"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useT } from "@/lib/i18n/client";

// Dashboard charts, drawn by hand (no chart library): one series each, in the
// backoffice's blue. Thin marks, hairline grid, the latest value labelled,
// and a hover/keyboard readout; every value is also in a table view.

const SERIES = "#0077b6"; // passes the palette checks on the white surface
const GRID = "#e4e4e7"; // zinc-200: one step off the surface
const INK_MUTED = "#71717a"; // zinc-500, axis text

function money(value: number, currency: string, compact = false) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    // Axis ticks: "€100", "€2.5K".
    ...(compact && { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }),
  }).format(value);
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

// Clean axis ticks (0, 250, 500…) covering [min, max].
function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

const W = 720;
const H = 240;
const M = { top: 16, right: 84, bottom: 28, left: 64 };

// Revenue per day over the period, with a crosshair readout.
export function RevenueTrend({ points, currency }: { points: { date: string; amount: number }[]; currency: string }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const t = useT();

  const geo = useMemo(() => {
    const values = points.map((p) => p.amount);
    const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const x = (i: number) => M.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const y = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.amount).toFixed(1)}`).join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
    return { ticks, x, y, line, area, plotW };
  }, [points]);

  if (points.length === 0) return null;
  const last = points.length - 1;
  // About one date label a week, always the first and the last.
  const every = Math.max(1, Math.round(points.length / 5));
  const xLabels = points.map((_, i) => i).filter((i) => i === 0 || i === last || (i % every === 0 && last - i >= every / 2));

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const ratio = (px - M.left) / geo.plotW;
    setActive(Math.min(last, Math.max(0, Math.round(ratio * last))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
    else if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
    else return;
    e.preventDefault();
  };
  const shown = active ?? null;

  return (
    <figure className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full outline-none focus-visible:ring-2 focus-visible:ring-[#0077b6]/40"
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => setActive((a) => a ?? last)}
          onBlur={() => setActive(null)}
        >
          <title id={titleId}>
            {t("Revenue per day, {from} to {to}; latest {amount}. Use the left and right arrow keys to read each day.", {
              from: shortDate(points[0].date),
              to: shortDate(points[last].date),
              amount: money(points[last].amount, currency),
            })}
          </title>
          {geo.ticks.map((tick) => (
            <g key={tick}>
              <line x1={M.left} x2={W - M.right} y1={geo.y(tick)} y2={geo.y(tick)} stroke={GRID} strokeWidth={1} />
              <text x={M.left - 8} y={geo.y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={INK_MUTED} className="tabular-nums">
                {money(tick, currency, true)}
              </text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} x={geo.x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize={11} fill={INK_MUTED}>
              {shortDate(points[i].date)}
            </text>
          ))}
          <path d={geo.area} fill={SERIES} fillOpacity={0.1} />
          <path d={geo.line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* The latest day: end dot (2px surface ring) and its value. */}
          <circle cx={geo.x(last)} cy={geo.y(points[last].amount)} r={5} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
          <text x={geo.x(last) + 10} y={geo.y(points[last].amount)} dominantBaseline="middle" fontSize={12} fontWeight={600} fill="#18181b">
            {money(points[last].amount, currency)}
          </text>
          {shown !== null && (
            <g pointerEvents="none">
              <line x1={geo.x(shown)} x2={geo.x(shown)} y1={M.top} y2={H - M.bottom} stroke="#a1a1aa" strokeWidth={1} />
              <circle cx={geo.x(shown)} cy={geo.y(points[shown].amount)} r={5} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
          {/* The whole plot is the hover target: the crosshair finds the day. */}
          <rect
            x={M.left}
            y={M.top}
            width={geo.plotW}
            height={H - M.top - M.bottom}
            fill="transparent"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
        {shown !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 rounded-md bg-white px-2.5 py-1.5 text-sm shadow-md ring-1 ring-zinc-200"
            style={{
              left: `${(geo.x(shown) / W) * 100}%`,
              transform: geo.x(shown) > W * 0.6 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded" style={{ background: SERIES }} />
              <span className="font-semibold tabular-nums text-zinc-900">{money(points[shown].amount, currency)}</span>
            </span>
            <span className="block text-xs text-zinc-500">{shortDate(points[shown].date)}</span>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900">{t("Show as table")}</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg ring-1 ring-zinc-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-1.5 font-medium">{t("Day")}</th>
                <th className="px-3 py-1.5 text-right font-medium">{t("Revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td className="px-3 py-1.5">{shortDate(p.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(p.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// Bookings per activity: one horizontal bar each, its count at the tip.
export function ActivityBars({ rows }: { rows: { label: string; count: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const t = useT();
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((n, r) => n + r.count, 0);
  return (
    <ul className="space-y-2.5" aria-label={t("Bookings per activity")}>
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <li
            key={r.label}
            tabIndex={0}
            className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-[#0077b6]/40"
            aria-label={
              r.count === 1
                ? t("{activity}: 1 booking, {share}%", { activity: r.label, share })
                : t("{activity}: {count} bookings, {share}%", { activity: r.label, count: r.count, share })
            }
            onPointerEnter={() => setHover(r.label)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(r.label)}
            onBlur={() => setHover(null)}
          >
            <span className="truncate text-sm text-zinc-700">{r.label}</span>
            <span className="relative flex items-center gap-2">
              <span
                aria-hidden="true"
                className="block h-5 rounded-r transition-opacity"
                style={{
                  width: `${Math.max(2, (r.count / max) * 85)}%`,
                  background: SERIES,
                  opacity: hover && hover !== r.label ? 0.45 : 1,
                }}
              />
              <span className="text-sm font-medium tabular-nums text-zinc-900">{r.count}</span>
              {hover === r.label && (
                <span className="pointer-events-none absolute -top-8 left-0 z-10 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs shadow-md ring-1 ring-zinc-200">
                  <span className="font-semibold text-zinc-900">{r.count}</span>{" "}
                  <span className="text-zinc-500">
                    {r.count === 1
                      ? t("booking · {share}% of all", { share })
                      : t("bookings · {share}% of all", { share })}
                  </span>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
