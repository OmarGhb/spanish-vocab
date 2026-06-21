import { describe, it, expect } from 'vitest'
import { isThemeId, coerceTheme, themeName, THEME_IDS, THEME_SWATCHES, DEFAULT_THEME } from './theme'

describe('theme registry', () => {
  it('isThemeId accepts the 4 ids, rejects everything else', () => {
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true)
    expect(isThemeId('sombre')).toBe(false)
    expect(isThemeId('')).toBe(false)
    expect(isThemeId(null)).toBe(false)
    expect(isThemeId(undefined)).toBe(false)
  })

  it('coerceTheme passes valid ids through, falls back to Sépia otherwise', () => {
    expect(coerceTheme('nuit')).toBe('nuit')
    expect(coerceTheme('ardoise')).toBe('ardoise')
    expect(coerceTheme('bogus')).toBe(DEFAULT_THEME)
    expect(coerceTheme(undefined)).toBe('sepia')
  })

  it('every id has a swatch with the picker-required preview fields', () => {
    expect(THEME_SWATCHES.map((s) => s.id).sort()).toEqual([...THEME_IDS].sort())
    for (const s of THEME_SWATCHES) {
      for (const k of ['page', 'surface', 'border', 'accent', 'success', 'onAccent'] as const) {
        expect(s[k]).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    }
  })

  it('Nuit flips the on-accent (check) color to dark ink; light themes keep ivory', () => {
    expect(THEME_SWATCHES.find((s) => s.id === 'nuit')!.onAccent).toBe('#2A2218')
    expect(THEME_SWATCHES.find((s) => s.id === 'sepia')!.onAccent).toBe('#FFFBF3')
  })

  it('themeName returns the display label', () => {
    expect(themeName('sepia')).toBe('Sépia')
    expect(themeName('nuit')).toBe('Nuit')
  })
})
