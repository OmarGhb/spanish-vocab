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
