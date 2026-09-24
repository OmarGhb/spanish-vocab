import type { SourceLocale } from './immersion'

// Coerce a possibly-malformed bilingual value to a plain string side, so no raw {es,fr} object
// ever reaches React. Guards the historic pre-M2.5 "weak data shape" where a definition/example
// field is a nested object (e.g. `fr: {es:"…"}` or a whole `{es, fr}`) instead of a string —
// which crashes a raw render ("Objects are not valid as a React child, keys {es, fr}").
//
// Resolution order for the requested side: the value itself if a string → the requested key →
// the other side → one level of nesting (the weak shape) → '' as a safe last resort.
export function flatBilingual(value: unknown, prefer: 'es' | 'fr'): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    const other = prefer === 'es' ? 'fr' : 'es'
    const dig = (v: unknown): string | null => {
      if (!v || typeof v !== 'object') return null
      const n = v as Record<string, unknown>
      const s = n[prefer] ?? n[other]
      return typeof s === 'string' ? s : null
    }
    // Priority: the preferred side (string, then one level deep), then the other side likewise —
    // so a nested preferred value (the weak shape) wins over the sibling string.
    if (typeof o[prefer] === 'string') return o[prefer] as string
    const deepPrefer = dig(o[prefer])
    if (deepPrefer !== null) return deepPrefer
    if (typeof o[other] === 'string') return o[other] as string
    const deepOther = dig(o[other])
    if (deepOther !== null) return deepOther
  }
  return ''
}

// ── locale-aware gloss resolution (M8 Phase 1a) ──────────────────────────────────────────────────
// The content-side twin of lib/immersion.ts's resolveChrome rule: NEVER fall back across source
// locales. A word with only a French gloss, read by an English learner, resolves to '' — the caller
// then renders the Spanish side alone. Serving the French string would look like a working app that
// is silently in the wrong language, which is strictly worse than showing less.
//
// Deliberately NOT `flatBilingual` with a different argument: that helper's whole contract is "fall
// through to the other side", which is correct for the FR/ES pair it was built for and wrong here.
// Both exist side by side; flatBilingual is untouched so every current read path is unchanged, and
// the Phase 2 UI swap is a one-line change per call site.
//
// Shares flatBilingual's hardening against the historic pre-M2.5 weak shapes (a nested object where
// a string belongs, e.g. `{ fr: { es: '…' } }`) — one level of nesting is unwrapped, but only ever
// from the REQUESTED locale's own key.
export function glossFor(value: unknown, locale: SourceLocale): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    const own = o[locale]
    if (typeof own === 'string') return own
    // Weak shape: the locale's key holds an object. Unwrap one level, still locale-scoped —
    // a nested `{ en: … }` under `fr` is NOT reachable when asking for 'en'.
    if (own && typeof own === 'object') {
      const nested = (own as Record<string, unknown>)[locale]
      if (typeof nested === 'string') return nested
    }
  }
  return ''
}
