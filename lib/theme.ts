// Color-theme registry (theming milestone). The RUNTIME theme is pure CSS — the [data-theme]
// blocks in globals.css. This module is the small amount of theme data JS needs: the id union,
// validation, the cookie name, and the SWATCH PREVIEW colors for the picker (a picker must render
// every palette's chip even while another theme is active, so those preview hexes can't come from
// the live CSS vars). NOT the theme source of truth — just picker preview + plumbing.

export const THEME_IDS = ['sepia', 'ardoise', 'indigo', 'nuit'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'sepia'
export const THEME_COOKIE = 'theme'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v)
}
// Coerce any input to a valid theme id (cookie / DB read hardening).
export function coerceTheme(v: unknown): ThemeId {
  return isThemeId(v) ? v : DEFAULT_THEME
}

// Swatch preview colors — the subset each picker chip paints (page/surface/border + accent bar +
// success tick), plus the on-accent check color. Mirrors the locked palette columns; render-only.
export type ThemeSwatch = {
  id: ThemeId
  name: string
  page: string
  surface: string
  border: string
  accent: string
  success: string
  onAccent: string // check-glyph color on the accent circle (dark ink on Nuit, ivory elsewhere)
}

export const THEME_SWATCHES: readonly ThemeSwatch[] = [
  { id: 'sepia',   name: 'Sépia',   page: '#F5EDDA', surface: '#FFFBF3', border: '#D9C9A8', accent: '#C27A2C', success: '#4A7C6F', onAccent: '#FFFBF3' },
  { id: 'ardoise', name: 'Ardoise', page: '#E9ECEE', surface: '#FAFCFD', border: '#C5CDD2', accent: '#2F6E8C', success: '#3E7C6E', onAccent: '#FFFBF3' },
  { id: 'indigo',  name: 'Indigo',  page: '#ECEAF1', surface: '#FBFAFE', border: '#CAC5D8', accent: '#5A52B5', success: '#4A7C6F', onAccent: '#FFFBF3' },
  { id: 'nuit',    name: 'Nuit',    page: '#1E1813', surface: '#2A2218', border: '#463A28', accent: '#D9974A', success: '#6FB39E', onAccent: '#2A2218' },
]

export const themeName = (id: ThemeId): string =>
  THEME_SWATCHES.find((t) => t.id === id)?.name ?? 'Sépia'
