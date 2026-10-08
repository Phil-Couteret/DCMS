// The center's colours as CSS variables (space-separated RGB, as Tailwind's
// brand and accent colours expect; see tailwind.config.ts). Without colours
// in its settings a center gets the site's original blues.
const DEFAULT_PRIMARY = "#1e3a8a"; // blue-900
const DEFAULT_ACCENT = "#0ea5e9"; // sky-500

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mixes a colour toward another: amount 0 keeps it, 1 gives the other.
function mix(c: [number, number, number], toward: number, amount: number) {
  return c.map((v) => Math.round(v + (toward - v) * amount)) as [number, number, number];
}

const css = (c: [number, number, number]) => c.join(" ");

const HEX = /^#[0-9a-f]{6}$/i;

export function brandVariables(primaryColor: string | null, accentColor: string | null) {
  const primary = rgb(primaryColor && HEX.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY);
  const accent = rgb(accentColor && HEX.test(accentColor) ? accentColor : DEFAULT_ACCENT);
  return {
    "--brand": css(primary),
    "--brand-dark": css(mix(primary, 0, 0.3)),
    "--brand-light": css(mix(primary, 255, 0.15)),
    "--accent": css(accent),
  } as React.CSSProperties;
}
