/**
 * Recharts renders to SVG and takes literal colour values, not Tailwind classes.
 * These mirror the @theme tokens in globals.css — change both together.
 */
export const chart = {
  accent: "#e9640b",
  accentSoft: "#fdf0e6",
  foreground: "#16181d",
  muted: "#62697a",
  subtle: "#99a0af",
  border: "#e5e7ec",
  grid: "#eceef2",
  surface: "#ffffff",
  pending: "#f5a524",
  assigned: "#175cd3",
  onTheWay: "#4f46e5",
  completed: "#0f7a56",
  cancelled: "#b42318",
} as const;
