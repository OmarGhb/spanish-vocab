// Frame-5 conjugation grid (M5.3b) — pure, client-safe (no I/O, no Next/Supabase, no
// `server-only`, same posture as lib/conjugator.ts / lib/word-status.ts). ALL grid logic lives
// here, never inline in the component (the chooseQcmCue / resultHintExample lesson): tense
// resolution from form_annotation, the six-cell selection, the highlight target, and the
// tense-label map. Consumes the conjugator's display guard + paradigm ONLY — it does not modify it.
//
// HARD REQUIREMENT (carried from M5.3a): a generated paradigm is now DISPLAYED, so the grid renders
// ONLY when canDisplayParadigm(lemma) is true. Any untabled/uncertain verb → null → the interstitial
// renders exactly as before, with no grid. Never show a guessed paradigm.

import {
  type Person,
  type Tense,
  PERSONS,
  normalize,
  conjugate,
  canDisplayParadigm,
} from './conjugator'

export type GridCell = {
  person: Person
  personLabel: string
  surface: string
  highlighted: boolean
}

export type ConjugationGrid = {
  tense: Tense
  labelEs: string
  glossFr: string
  cells: GridCell[] // 6, in PERSONS order
}

// Display label per grammatical person (matches the mockup: yo / tú / él/ella / nosotros / …).
const PERSON_LABELS: Record<Person, string> = {
  yo: 'yo',
  tú: 'tú',
  él: 'él/ella',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  ellos: 'ellos',
}

// The finite, six-person tenses that render a clean 2×3 grid. Imperative (no yo form) and the
// non-finite forms (infinitivo / gerundio / participio) are deliberately excluded → no grid.
const GRID_TENSE_LABELS: Record<
  'presente' | 'preterito' | 'imperfecto' | 'futuro' | 'condicional' | 'subjPresente',
  { labelEs: string; glossFr: string }
> = {
  presente: { labelEs: 'Presente', glossFr: 'présent' },
  preterito: { labelEs: 'Pretérito perfecto simple', glossFr: 'passé simple' },
  imperfecto: { labelEs: 'Pretérito imperfecto', glossFr: 'imparfait' },
  futuro: { labelEs: 'Futuro simple', glossFr: 'futur' },
  condicional: { labelEs: 'Condicional', glossFr: 'conditionnel' },
  subjPresente: { labelEs: 'Presente de subjuntivo', glossFr: 'subjonctif présent' },
}

type GridTense = keyof typeof GRID_TENSE_LABELS

function isGridTense(t: Tense): t is GridTense {
  return t in GRID_TENSE_LABELS
}

// Parse the pedagogical Spanish tense from Anthropic's free-text form_annotation, accent-folded.
// Priority-ordered so the ambiguous Spanish names resolve correctly:
//   - "pretérito imperfecto de indicativo" → imperfecto (NOT preterito) — the imperfecto check
//     runs before the preterite one.
//   - "pretérito perfecto compuesto" (haber + participio) → null (compound, no single grid token).
// Non-finite / imperative / non-present subjunctive → null (no clean six-person grid).
export function resolveGridTense(formAnnotation: string | null | undefined): Tense | null {
  if (!formAnnotation) return null
  const a = normalize(formAnnotation)

  if (/\bimperativo\b/.test(a)) return null
  if (/\bgerundio\b/.test(a)) return null
  if (/\bparticipio\b/.test(a)) return null

  if (/\bsubjuntivo\b/.test(a)) {
    return /\bpresente\b/.test(a) ? 'subjPresente' : null
  }
  if (/\bcondicional\b/.test(a)) return 'condicional'
  if (/\bfuturo\b/.test(a)) return 'futuro'
  if (/\bimperfecto\b/.test(a)) return 'imperfecto'
  if (/\bpreterito\b/.test(a) || /\bindefinido\b/.test(a) || /perfecto simple/.test(a)) {
    return /\bcompuesto\b/.test(a) ? null : 'preterito'
  }
  if (/\bpresente\b/.test(a)) return 'presente'
  return null
}

// Strip a single leading reflexive clitic so a clitic-attached surface ("me acuesto") can match the
// bare paradigm cell ("acuesto"). Only the proclitic slot; enclitics / multi-clitic are out of scope.
function stripLeadingClitic(surface: string): string | null {
  const m = surface.trim().match(/^(me|te|se|nos|os)\s+(\S.*)$/iu)
  return m ? m[2] : null
}

// Build the frame-5 grid for `lemma` with `surface` (the typed form) highlighted. Returns null —
// meaning "render the interstitial with NO grid" — whenever:
//   - the verb is untabled/uncertain (canDisplayParadigm false) — never show a guessed paradigm;
//   - the tense can't be resolved, or isn't a finite six-person grid tense (imperative / non-finite);
//   - any cell fails to conjugate (defensive — shouldn't happen for a tabled finite tense);
//   - the typed surface matches NO cell of the resolved tense (a grid that doesn't contain the typed
//     word is incoherent — same coherence principle as the cloze-only-when-masked-token==stored gate),
//     even after stripping a leading reflexive clitic.
// When the surface matches ≥1 cell, ALL matching cells are highlighted: imperfecto / condicional /
// subjPresente are syncretic (yo == él/ella), so highlighting both is the honest rendering.
export function buildConjugationGrid(
  lemma: string,
  surface: string,
  formAnnotation: string | null | undefined,
): ConjugationGrid | null {
  if (!canDisplayParadigm(lemma)) return null

  const tense = resolveGridTense(formAnnotation)
  if (tense === null || !isGridTense(tense)) return null

  const forms: string[] = []
  for (const person of PERSONS) {
    const v = conjugate(lemma, tense, person)
    if (!v) return null
    forms.push(v)
  }

  // Highlight target: fold-match the typed surface, retrying once with a stripped reflexive clitic.
  const nSurface = normalize(surface)
  let matched = forms.map((f) => normalize(f) === nSurface)
  if (!matched.some(Boolean)) {
    const stripped = stripLeadingClitic(surface)
    if (stripped) {
      const nStripped = normalize(stripped)
      matched = forms.map((f) => normalize(f) === nStripped)
    }
  }
  // No cell contains the typed word → incoherent grid → no grid.
  if (!matched.some(Boolean)) return null

  const { labelEs, glossFr } = GRID_TENSE_LABELS[tense]
  const cells: GridCell[] = PERSONS.map((person, i) => ({
    person,
    personLabel: PERSON_LABELS[person],
    surface: forms[i],
    highlighted: matched[i],
  }))

  return { tense, labelEs, glossFr, cells }
}
