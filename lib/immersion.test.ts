import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  coerceImmersionMode,
  isImmersionMode,
  coerceSourceLocale,
  isSourceLocale,
  coerceGlossPolicy,
  isGlossPolicy,
  chromeCtxFromMode,
  immersionModeFor,
  resolveChrome,
  glossVisibility,
  CONFIRM_TOKEN,
  DEFAULT_CHROME_CTX,
  DEFAULT_SOURCE_LOCALE,
  DEFAULT_GLOSS_POLICY,
  IMMERSION_MODES,
  DEFAULT_IMMERSION_MODE,
  REVIEW_CHROME,
  RATING_LABELS,
  DISCOVER_CHROME,
  NAV_CHROME,
  HOME_CHROME,
  STATUS_CHROME,
  WORDS_CHROME,
  DETAIL_CHROME,
  DRILL_CHROME,
  SHARED_CHROME,
  DICT_CHROME,
  ADD_CHROME,
  ACCOUNT_CHROME,
} from './immersion'

describe('coerceImmersionMode / isImmersionMode', () => {
  it('accepts the three valid modes', () => {
    expect(isImmersionMode('fr_es')).toBe(true)
    expect(isImmersionMode('immersion')).toBe(true)
    expect(isImmersionMode('totale')).toBe(true)
  })
  it('coerces anything invalid to the default (fr_es)', () => {
    expect(DEFAULT_IMMERSION_MODE).toBe('fr_es')
    expect(coerceImmersionMode(undefined)).toBe('fr_es')
    expect(coerceImmersionMode(null)).toBe('fr_es')
    expect(coerceImmersionMode('EN')).toBe('fr_es')
    expect(coerceImmersionMode(42)).toBe('fr_es')
    expect(coerceImmersionMode('immersion')).toBe('immersion')
  })
})

describe('resolveChrome', () => {
  const pair = { fr: 'Valider', es: 'Comprobar' }

  it('returns French in fr_es and Spanish in immersion/totale', () => {
    expect(resolveChrome(pair, chromeCtxFromMode('fr_es'))).toBe('Valider')
    expect(resolveChrome(pair, chromeCtxFromMode('immersion'))).toBe('Comprobar')
    expect(resolveChrome(pair, chromeCtxFromMode('totale'))).toBe('Comprobar')
  })

  it('falls back to French when the Spanish is not authored (in every mode)', () => {
    const gap = { fr: 'Choisissez la bonne réponse' }
    expect(resolveChrome(gap, chromeCtxFromMode('fr_es'))).toBe('Choisissez la bonne réponse')
    expect(resolveChrome(gap, chromeCtxFromMode('immersion'))).toBe('Choisissez la bonne réponse')
    expect(resolveChrome(gap, chromeCtxFromMode('totale'))).toBe('Choisissez la bonne réponse')
  })

  it('keeps the authored Review pairs byte-identical in fr_es', () => {
    expect(resolveChrome(REVIEW_CHROME.blankInstruction, chromeCtxFromMode('fr_es'))).toBe('Complétez la phrase')
    expect(resolveChrome(REVIEW_CHROME.submit, chromeCtxFromMode('fr_es'))).toBe('Valider')
    expect(resolveChrome(REVIEW_CHROME.revealGloss, chromeCtxFromMode('fr_es'))).toBe('Voir en français')
    expect(resolveChrome(REVIEW_CHROME.blankInstruction, chromeCtxFromMode('immersion'))).toBe('Completa la frase')
    expect(resolveChrome(REVIEW_CHROME.revealGloss, chromeCtxFromMode('totale'))).toBe('Ver traducción')
  })

  it('has authored Spanish for every Review chrome pair (no fallbacks left on this surface)', () => {
    for (const pair of Object.values(REVIEW_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, chromeCtxFromMode('immersion'))).toBe(pair.es)
    }
  })

  it('resolves the shared rating lexicon (fr_es vs Spanish)', () => {
    expect(resolveChrome(RATING_LABELS[1], chromeCtxFromMode('fr_es'))).toBe('À revoir')
    expect(resolveChrome(RATING_LABELS[1], chromeCtxFromMode('immersion'))).toBe('Otra vez')
    expect(resolveChrome(RATING_LABELS[4], chromeCtxFromMode('immersion'))).toBe('Fácil')
    expect(resolveChrome(RATING_LABELS[3], chromeCtxFromMode('totale'))).toBe('Bien')
  })

  it('has authored Spanish for every Discover chrome pair (no French holes)', () => {
    for (const pair of Object.values(DISCOVER_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, chromeCtxFromMode('immersion'))).toBe(pair.es)
    }
    expect(resolveChrome(DISCOVER_CHROME.title, chromeCtxFromMode('fr_es'))).toBe('Découvrir')
    expect(resolveChrome(DISCOVER_CHROME.cardReveal, chromeCtxFromMode('immersion'))).toBe('Toca para traducir')
    expect(resolveChrome(DISCOVER_CHROME.knowStamp, chromeCtxFromMode('totale'))).toBe('Ya la sé')
  })

  it('has authored Spanish for every M6.1c chrome pair (no French holes)', () => {
    const maps = { NAV_CHROME, HOME_CHROME, STATUS_CHROME, WORDS_CHROME, DETAIL_CHROME }
    for (const [name, map] of Object.entries(maps)) {
      for (const [key, pair] of Object.entries(map)) {
        expect(pair.es, `${name}.${key} missing es`).toBeTruthy()
        expect(resolveChrome(pair, chromeCtxFromMode('immersion'))).toBe(pair.es)
        expect(resolveChrome(pair, chromeCtxFromMode('fr_es'))).toBe(pair.fr)
      }
    }
    expect(resolveChrome(NAV_CHROME.review, chromeCtxFromMode('immersion'))).toBe('Repaso')
    expect(resolveChrome(STATUS_CHROME.memorise, chromeCtxFromMode('totale'))).toBe('Memorizado')
    expect(resolveChrome(DETAIL_CHROME.relearn, chromeCtxFromMode('immersion'))).toBe('Volver a repasar')
  })

  it('has authored Spanish for every Drill chrome pair (M6.1d-i)', () => {
    for (const pair of Object.values(DRILL_CHROME)) {
      expect(pair.es).toBeTruthy()
      expect(resolveChrome(pair, chromeCtxFromMode('fr_es'))).toBe(pair.fr)
    }
    expect(resolveChrome(DRILL_CHROME.start, chromeCtxFromMode('immersion'))).toBe('Empezar')
    expect(resolveChrome(DRILL_CHROME.wasAnswer, chromeCtxFromMode('totale'))).toBe('Era')
  })

  it('has authored Spanish for every M6.1d-ii chrome pair (no French holes)', () => {
    const maps = { SHARED_CHROME, DICT_CHROME, ADD_CHROME, ACCOUNT_CHROME }
    for (const [name, map] of Object.entries(maps)) {
      for (const [key, pair] of Object.entries(map)) {
        expect(pair.es, `${name}.${key} missing es`).toBeTruthy()
        expect(resolveChrome(pair, chromeCtxFromMode('immersion'))).toBe(pair.es)
        expect(resolveChrome(pair, chromeCtxFromMode('fr_es'))).toBe(pair.fr)
      }
    }
    expect(resolveChrome(SHARED_CHROME.audioAria, chromeCtxFromMode('immersion'))).toBe('Escuchar la pronunciación')
    expect(resolveChrome(ACCOUNT_CHROME.confirmToken, chromeCtxFromMode('totale'))).toBe('ELIMINAR')
    expect(resolveChrome(ADD_CHROME.selectAll, chromeCtxFromMode('immersion'))).toBe('Seleccionar todo')
    expect(resolveChrome(DICT_CHROME.later, chromeCtxFromMode('immersion'))).toBe('Más tarde')
  })
})

describe('glossVisibility', () => {
  it('maps each legacy mode to its gloss treatment', () => {
    expect(glossVisibility(chromeCtxFromMode('fr_es'))).toBe('visible')
    expect(glossVisibility(chromeCtxFromMode('immersion'))).toBe('tap')
    expect(glossVisibility(chromeCtxFromMode('totale'))).toBe('hidden')
  })
})

// ── M8 Phase 0 ────────────────────────────────────────────────────────────────────────────────────
// The two new axes, the legacy bridge, and — the load-bearing part — the proof that generalizing
// `ImmersionMode` into (locale, policy) did not move a single rendered byte.

// Every authored dictionary, under the SAME stable labels scripts/dump-chrome.ts emits.
const DICTIONARIES: Record<string, Record<string, { fr: string; es?: string }>> = {
  ACCOUNT_CHROME,
  ADD_CHROME,
  DETAIL_CHROME,
  DICT_CHROME,
  DISCOVER_CHROME,
  DRILL_CHROME,
  HOME_CHROME,
  NAV_CHROME,
  RATING_LABELS,
  REVIEW_CHROME,
  SHARED_CHROME,
  STATUS_CHROME,
  WORDS_CHROME,
}

describe('coerceSourceLocale / isSourceLocale', () => {
  it('accepts the two source locales', () => {
    expect(isSourceLocale('fr')).toBe(true)
    expect(isSourceLocale('en')).toBe(true)
    expect(isSourceLocale('es')).toBe(false) // Spanish is the TARGET, never a source locale
    expect(isSourceLocale('fr_es')).toBe(false)
  })

  it('coerces anything invalid to the French default (DB read hardening)', () => {
    expect(coerceSourceLocale(undefined)).toBe('fr')
    expect(coerceSourceLocale(null)).toBe('fr')
    expect(coerceSourceLocale(42)).toBe('fr')
    expect(coerceSourceLocale('EN')).toBe('fr') // case-sensitive, like coerceTheme
    expect(coerceSourceLocale('en')).toBe('en')
    expect(DEFAULT_SOURCE_LOCALE).toBe('fr')
  })
})

describe('coerceGlossPolicy / isGlossPolicy', () => {
  it('accepts the three policies', () => {
    expect(isGlossPolicy('visible')).toBe(true)
    expect(isGlossPolicy('tap')).toBe(true)
    expect(isGlossPolicy('hidden')).toBe(true)
    expect(isGlossPolicy('immersion')).toBe(false) // a legacy MODE, not a policy
  })

  it('coerces anything invalid to the visible default', () => {
    expect(coerceGlossPolicy(undefined)).toBe('visible')
    expect(coerceGlossPolicy(null)).toBe('visible')
    expect(coerceGlossPolicy(42)).toBe('visible')
    expect(coerceGlossPolicy('totale')).toBe('visible')
    expect(coerceGlossPolicy('hidden')).toBe('hidden')
    expect(DEFAULT_GLOSS_POLICY).toBe('visible')
  })

  it('defaults to the pre-Phase-0 behavior (fr_es) as a ctx', () => {
    expect(DEFAULT_CHROME_CTX).toEqual({ locale: 'fr', policy: 'visible' })
    expect(DEFAULT_CHROME_CTX).toEqual(chromeCtxFromMode(DEFAULT_IMMERSION_MODE))
  })
})

describe('legacy bridge — the dual-write mapping', () => {
  // Phase 0 keeps writing profiles.immersion_mode so a rollback to the previous deploy reads
  // correct state. If this mapping is wrong, a rollback silently changes the user's language.
  it('derives the legacy mode from a ctx (the WRITE direction)', () => {
    expect(immersionModeFor({ locale: 'fr', policy: 'visible' })).toBe('fr_es')
    expect(immersionModeFor({ locale: 'fr', policy: 'tap' })).toBe('immersion')
    expect(immersionModeFor({ locale: 'fr', policy: 'hidden' })).toBe('totale')
  })

  it('derives a ctx from the legacy mode (the READ direction, = the migration backfill)', () => {
    expect(chromeCtxFromMode('fr_es')).toEqual({ locale: 'fr', policy: 'visible' })
    expect(chromeCtxFromMode('immersion')).toEqual({ locale: 'fr', policy: 'tap' })
    expect(chromeCtxFromMode('totale')).toEqual({ locale: 'fr', policy: 'hidden' })
  })

  it('round-trips every legacy mode through both directions', () => {
    for (const mode of IMMERSION_MODES) {
      expect(immersionModeFor(chromeCtxFromMode(mode))).toBe(mode)
    }
  })

  it('collapses the locale axis, which the legacy column cannot represent', () => {
    // Documented, and unreachable in Phase 0: the API pins source_locale to 'fr'. An `en` user
    // rolled back to the previous deploy would read as fr_es — recorded here so it is a KNOWN
    // limitation of the rollback window, not a surprise.
    expect(immersionModeFor({ locale: 'en', policy: 'tap' })).toBe('immersion')
  })
})

describe('resolveChrome — the (locale, policy) contract', () => {
  it('renders the source-locale side under `visible`', () => {
    const pair = { fr: 'Valider', en: 'Check', es: 'Comprobar' }
    expect(resolveChrome(pair, { locale: 'fr', policy: 'visible' })).toBe('Valider')
    expect(resolveChrome(pair, { locale: 'en', policy: 'visible' })).toBe('Check')
  })

  it('renders Spanish under `tap` and `hidden`, whatever the source locale (C2)', () => {
    const pair = { fr: 'Valider', en: 'Check', es: 'Comprobar' }
    expect(resolveChrome(pair, { locale: 'fr', policy: 'tap' })).toBe('Comprobar')
    expect(resolveChrome(pair, { locale: 'en', policy: 'hidden' })).toBe('Comprobar')
  })

  it('falls back to the SOURCE LOCALE when the Spanish is unauthored (C2 tail)', () => {
    const gap = { fr: 'Choisissez la bonne réponse', en: 'Pick the right answer' }
    expect(resolveChrome(gap, { locale: 'fr', policy: 'tap' })).toBe('Choisissez la bonne réponse')
    expect(resolveChrome(gap, { locale: 'en', policy: 'hidden' })).toBe('Pick the right answer')
  })

  it('NEVER falls back across source locales — a missing string renders empty (Q4)', () => {
    // The silent-wrong-language bug this rule exists to prevent: an English learner must never be
    // served the French string just because it happens to be there.
    const frOnly = { fr: 'Valider' }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveChrome(frOnly, { locale: 'en', policy: 'visible' })).toBe('')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe('CONFIRM_TOKEN (C3)', () => {
  it('authors a token for every source locale plus the immersion side', () => {
    // StrictChromePair makes a missing locale a BUILD failure; this asserts the values themselves.
    // The token gates account deletion, so an unreadable or empty token is a correctness bug.
    for (const locale of ['fr', 'en'] as const) {
      expect(CONFIRM_TOKEN[locale]).toBeTruthy()
      expect(resolveChrome(CONFIRM_TOKEN, { locale, policy: 'visible' })).toBe(CONFIRM_TOKEN[locale])
    }
    expect(CONFIRM_TOKEN.es).toBeTruthy()
    expect(resolveChrome(CONFIRM_TOKEN, { locale: 'fr', policy: 'hidden' })).toBe('ELIMINAR')
  })

  it('agrees with the instruction the user is shown', () => {
    // typeToConfirm says "Tape SUPPRIMER" / "Escribe ELIMINAR" — the gate must compare the same word.
    expect(resolveChrome(ACCOUNT_CHROME.typeToConfirm, chromeCtxFromMode('fr_es'))).toContain(
      resolveChrome(CONFIRM_TOKEN, chromeCtxFromMode('fr_es')),
    )
    expect(resolveChrome(ACCOUNT_CHROME.typeToConfirm, chromeCtxFromMode('totale'))).toContain(
      resolveChrome(CONFIRM_TOKEN, chromeCtxFromMode('totale')),
    )
  })
})

describe('byte-identity with the shipped FR/ES layer', () => {
  // ── 1. Algebraic proof: the new resolver is equivalent to the old one, pair by pair ────────────
  // A verbatim copy of lib/immersion.ts's resolveChrome AS OF HEAD 38b3513 (pre-Phase-0). Never
  // re-point this at the live helper — the whole point is that it cannot move with the code.
  function resolveChromeReference(pair: { fr: string; es?: string }, mode: (typeof IMMERSION_MODES)[number]): string {
    return mode === 'fr_es' ? pair.fr : pair.es ?? pair.fr
  }

  it('resolves every authored pair identically to the pre-Phase-0 implementation', () => {
    let assertions = 0
    for (const [dictName, dict] of Object.entries(DICTIONARIES)) {
      for (const [key, pair] of Object.entries(dict)) {
        for (const mode of IMMERSION_MODES) {
          expect(resolveChrome(pair, chromeCtxFromMode(mode)), `${dictName}.${key} @ ${mode}`).toBe(
            resolveChromeReference(pair, mode),
          )
          assertions++
        }
      }
    }
    // 260 authored pairs x 3 modes. Pinned so a dictionary that silently loses keys can't shrink
    // the proof into vacuous success.
    expect(assertions).toBe(780)
  })

  // ── 2. Byte-level proof: the resolved STRINGS still match the pre-change capture ───────────────
  it('matches lib/__fixtures__/chrome-golden.tsv line for line', () => {
    const golden = readFileSync('lib/__fixtures__/chrome-golden.tsv', 'utf8').trimEnd().split('\n')
    const actual: string[] = []
    for (const [dictName, dict] of Object.entries(DICTIONARIES)) {
      for (const [key, pair] of Object.entries(dict)) {
        for (const mode of IMMERSION_MODES) {
          actual.push(`${dictName}.${key}\t${mode}\t${resolveChrome(pair, chromeCtxFromMode(mode))}`)
        }
      }
    }
    actual.sort()
    expect(actual.length).toBe(golden.length)
    expect(actual).toEqual(golden)
  })
})
