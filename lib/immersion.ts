// FR/ES immersion layer (M6.1a) — the lightweight, mode-driven chrome resolver + French-gloss gate.
// Deliberately NOT an i18n framework (no locale negotiation, no EN — the users are Francophone): a
// two-language, per-user, mode-keyed toggle in the house pure-tested-helper style. Per-surface
// opt-in, never a global <html lang> lock (onboarding scaffolding must stay French while product
// surfaces flip).
//
//   fr_es      (default) → instructions/questions in French; Spanish content, FR translation on click
//   immersion            → interface chrome in Spanish; FR translation via tap-to-reveal
//   totale               → interface chrome in Spanish; NO French at all (not a hint, not after answering)

export const IMMERSION_MODES = ['fr_es', 'immersion', 'totale'] as const
export type ImmersionMode = (typeof IMMERSION_MODES)[number]

export const DEFAULT_IMMERSION_MODE: ImmersionMode = 'fr_es'

export function isImmersionMode(v: unknown): v is ImmersionMode {
  return typeof v === 'string' && (IMMERSION_MODES as readonly string[]).includes(v)
}
// Coerce any input to a valid mode (DB read hardening). Mirrors coerceTheme.
export function coerceImmersionMode(v: unknown): ImmersionMode {
  return isImmersionMode(v) ? v : DEFAULT_IMMERSION_MODE
}

// A chrome string authored in both languages. `es` is optional: a string with no authored Spanish
// yet degrades to French in every mode (see resolveChrome) — the graceful path while copy is filled.
export type ChromePair = { fr: string; es?: string }

// Resolve a chrome string for the active mode: French in fr_es; Spanish in immersion/totale, falling
// back to French when the Spanish hasn't been authored yet. fr_es is therefore always byte-identical
// to today.
export function resolveChrome(pair: ChromePair, mode: ImmersionMode): string {
  return mode === 'fr_es' ? pair.fr : pair.es ?? pair.fr
}

// The single French-gloss gate: how a French translation should be surfaced in the active mode.
//   visible → render as today (fr_es)   ·   tap → behind a tap-to-reveal (immersion)   ·
//   hidden  → suppressed entirely, incl. after answering (totale)
export type GlossVisibility = 'visible' | 'tap' | 'hidden'
export function glossVisibility(mode: ImmersionMode): GlossVisibility {
  if (mode === 'fr_es') return 'visible'
  if (mode === 'immersion') return 'tap'
  return 'hidden'
}

// Review chrome pairs — French + vetted Spanish (register: tú, es-ES). fr_es always renders the fr
// side (byte-identical to today); immersion/totale render es. Decorative glyphs (→, ↓, ↵, ×) stay in
// the JSX, not the copy. Pluralized / interpolated strings (hint counter, "N letras", "Aún N
// palabras", the hint-cap caption) are built at their render site from these pieces + RATING_LABELS.
export const REVIEW_CHROME = {
  // Instructions / actions
  blankInstruction: { fr: 'Complétez la phrase', es: 'Completa la frase' },
  definitionEyebrow: { fr: 'Définition', es: 'Definición' },
  mcInstruction: { fr: 'Choisissez la bonne réponse', es: 'Elige la respuesta correcta' },
  submit: { fr: 'Valider', es: 'Comprobar' },
  submitHelp: { fr: 'Entrée pour valider', es: 'Intro para comprobar' },
  hintLabel: { fr: 'Indice', es: 'Pista' },
  revealGloss: { fr: 'Voir en français', es: 'Ver traducción' },
  scramble: { fr: 'Lettres mélangées', es: 'Letras mezcladas' },
  // Result / teaching
  yourAnswer: { fr: 'Ta réponse', es: 'Tu respuesta' },
  theAnswer: { fr: 'La réponse', es: 'La respuesta' },
  expectedForm: { fr: 'La forme attendue', es: 'La forma esperada' },
  example: { fr: 'Exemple', es: 'Ejemplo' },
  nearWrote: { fr: 'Tu as écrit', es: 'Has escrito' },
  nearIs: { fr: "— c'est", es: '— es' },
  verbFormTeaching: {
    fr: "Tu connais le verbe — ce n'est pas la forme attendue ici.",
    es: 'Conoces el verbo — no es la forma esperada aquí.',
  },
  // Result notes (ResultReveal caption)
  noteFirstTry: { fr: 'du premier coup', es: 'a la primera' },
  noteWithHint: { fr: 'avec un indice', es: 'con una pista' },
  noteWrongForm: { fr: "le bon verbe, l'autre forme", es: 'el verbo correcto, otra forma' },
  // Rating panel
  ratingQuestion: { fr: 'Comment tu as trouvé ce mot ?', es: '¿Qué tal esta palabra?' },
  nextQuestion: { fr: 'Prochaine question…', es: 'Siguiente pregunta…' },
  stopTimer: { fr: 'Arrêter le minuteur', es: 'Detener el temporizador' },
  // Session-complete bilan
  loading: { fr: 'Chargement…', es: 'Cargando…' },
  sessionDone: { fr: 'Session terminée', es: 'Sesión terminada' },
  statReviewed: { fr: 'Révisés', es: 'Repasados' },
  statFirstTry: { fr: 'Sus du 1er coup', es: 'A la primera' },
  statTime: { fr: 'Temps', es: 'Tiempo' },
  home: { fr: 'Accueil', es: 'Inicio' },
  modeWriting: { fr: 'Écriture', es: 'Escritura' },
  modeMcq: { fr: 'QCM', es: 'Opción múltiple' },
} as const satisfies Record<string, ChromePair>

// The four SRS ratings — ONE authored set reused everywhere the labels appear (RatingButtons pills,
// the FillInBlank hint-cap caption). Keyed by the ts-fsrs rating (1 = again … 4 = easy).
export const RATING_LABELS: Record<1 | 2 | 3 | 4, ChromePair> = {
  // "Otra vez" (standard SR "again"), NOT "Repasar" — repasar/repaso is THE word for the review
  // activity app-wide (nav Réviser, Discover "Repasar ahora"), so the fail rating needs a distinct word.
  1: { fr: 'À revoir', es: 'Otra vez' },
  2: { fr: 'Difficile', es: 'Difícil' },
  3: { fr: 'Bien', es: 'Bien' },
  4: { fr: 'Facile', es: 'Fácil' },
}

// Discover chrome — French + vetted Spanish (register: tú, es-ES). Same rules as REVIEW_CHROME:
// fr_es renders fr (byte-identical to today), immersion/totale render es. Decorative glyphs (→, «»)
// stay in JSX. The card gloss reveal uses the CARD register "Toca para traducir" (≠ Review's "Ver
// traducción"). Pluralized / topic-interpolated lines (bilan add-line, "N palabras déjà connu",
// exhausted heading, topic-tile count) build per-language at the render site.
export const DISCOVER_CHROME = {
  // Grid
  title: { fr: 'Découvrir', es: 'Descubrir' },
  subtitle: { fr: 'Des sélections pour toi, ou explore par thème', es: 'Selecciones para ti, o explora por tema' },
  forYou: { fr: 'Pour toi', es: 'Para ti' },
  byTheme: { fr: 'Par thème', es: 'Por tema' },
  soon: { fr: 'Bientôt', es: 'Pronto' },
  close: { fr: 'Fermer', es: 'Cerrar' },
  wordsPlural: { fr: 'mots', es: 'palabras' },
  featured1Title: { fr: 'Dans le prolongement de tes mots', es: 'A partir de tus palabras' },
  featured1Sub: {
    fr: 'Des mots choisis tout près de ce que tu apprends en ce moment.',
    es: 'Palabras elegidas muy cerca de lo que estás aprendiendo ahora.',
  },
  featured2Title: { fr: "L'essentiel A2–B1", es: 'Lo esencial A2–B1' },
  featured2Sub: {
    fr: 'Le socle de vocabulaire pour passer le cap intermédiaire.',
    es: 'La base de vocabulario para dar el salto al nivel intermedio.',
  },
  toastAdjacency: {
    fr: 'Des mots tout près de ce que tu apprends — Paco prépare ça, bientôt !',
    es: 'Palabras muy cerca de lo que aprendes — Paco lo está preparando, ¡pronto!',
  },
  toastLevel: {
    fr: '« L’essentiel A2–B1 » arrive bientôt — Paco la prépare avec soin.',
    es: '«Lo esencial A2–B1» llega pronto — Paco lo está preparando con cuidado.',
  },
  // Generation
  genTitle: { fr: 'Paco choisit des mots de', es: 'Paco elige palabras de' },
  genPhaseSelect: { fr: 'Sélection des mots du thème', es: 'Selección de palabras del tema' },
  genPhaseDefs: { fr: 'Définitions & exemples', es: 'Definiciones y ejemplos' },
  genPhaseConfuse: { fr: 'Mots à ne pas confondre', es: 'Palabras que no confundir' },
  genPhasePhon: { fr: 'Phonétique', es: 'Fonética' },
  errorMsg: { fr: "Une erreur s'est produite.", es: 'Ha ocurrido un error.' },
  retry: { fr: 'Réessayer', es: 'Reintentar' },
  // Card
  cardReveal: { fr: 'Afficher en français', es: 'Toca para traducir' },
  learnStamp: { fr: 'À apprendre', es: 'Por aprender' },
  knowStamp: { fr: 'Je connais', es: 'Ya la sé' },
  swipeLeft: { fr: '← glisse à gauche', es: '← desliza a la izq.' },
  swipeRight: { fr: 'glisse à droite →', es: 'desliza a la der. →' },
  // Bilan
  themeDone: { fr: 'Thème terminé', es: 'Tema terminado' },
  arrivalLine: {
    fr: 'Tes nouveaux mots arrivent dans « Mes mots » — ça peut prendre jusqu’à 30 s.',
    es: 'Tus nuevas palabras llegan a «Mis palabras» — puede tardar hasta 30 s.',
  },
  reviewNow: { fr: 'Réviser maintenant', es: 'Repasar ahora' },
  backHome: { fr: "Retour à l'accueil", es: 'Volver al inicio' },
  discoverAnother: { fr: 'Découvrir un autre thème', es: 'Descubrir otro tema' },
  // Exhausted
  exhaustedBody: {
    fr: 'Plus de nouveaux mots pour ce thème. Paco se repose — explore un autre thème.',
    es: 'No hay más palabras nuevas para este tema. Paco descansa — explora otro tema.',
  },
  chooseAnother: { fr: 'Choisir un autre thème', es: 'Elegir otro tema' },
} as const satisfies Record<string, ChromePair>
