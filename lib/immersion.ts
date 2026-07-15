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

// TopNav chrome (M6.1c). French + vetted ES.
export const NAV_CHROME = {
  home: { fr: 'Accueil', es: 'Inicio' },
  myWords: { fr: 'Mes mots', es: 'Mis palabras' },
  add: { fr: 'Ajouter', es: 'Añadir' },
  review: { fr: 'Réviser', es: 'Repaso' },
  discover: { fr: 'Découvrir', es: 'Descubrir' },
  dictionary: { fr: 'Dictionnaire', es: 'Diccionario' },
  dictionaryLocked: { fr: 'Dictionnaire (verrouillé)', es: 'Diccionario (bloqueado)' },
  account: { fr: 'Compte', es: 'Cuenta' },
} as const satisfies Record<string, ChromePair>

// Home chrome (M6.1c) — page.tsx / ReviewHero / HubCards / CollectionSection. Dynamic count lines
// ({n} mots à revoir, Voir les {n} mots) build per-language at the render site.
export const HOME_CHROME = {
  continueWithPaco: { fr: 'Continuer avec Paco', es: 'Sigue con Paco' },
  addTitle: { fr: 'Ajouter', es: 'Añadir' },
  addDesc: { fr: 'Un nouveau mot.', es: 'Una nueva palabra.' },
  discoverTitle: { fr: 'Découvrir', es: 'Descubrir' },
  discoverDesc: { fr: 'Des mots par thème.', es: 'Palabras por tema.' },
  conjTitle: { fr: 'Conjugaison', es: 'Conjugación' },
  conjDesc: { fr: 'Tes verbes en contexte.', es: 'Tus verbos en contexto.' },
  conjUnit: { fr: 'verbes', es: 'verbos' },
  dictTitle: { fr: 'Dictionnaire', es: 'Diccionario' },
  dictDesc: { fr: 'Ton dico personnel.', es: 'Tu diccionario personal.' },
  dictUnit: { fr: 'mémorisés', es: 'memorizados' },
  reviewAvailable: { fr: 'Révision disponible', es: 'Repaso disponible' },
  reviewEyebrow: { fr: 'Révision', es: 'Repaso' },
  startReview: { fr: 'Commencer la révision', es: 'Empezar el repaso' },
  allUpToDate: { fr: 'Tout est à jour', es: 'Todo al día' },
  firstReviewSoon: { fr: 'Bientôt ta première révision', es: 'Pronto tu primer repaso' },
  firstReviewEyebrow: { fr: 'Première révision', es: 'Primer repaso' },
  caughtUpCopy: {
    fr: 'Rien à réviser — Paco se repose. Reviens un peu plus tard.',
    es: 'Nada que repasar — Paco descansa. Vuelve un poco más tarde.',
  },
  firstReviewCopy: {
    fr: 'Tu pourras lancer ta première révision dès que tu auras ajouté tes premiers mots.',
    es: 'Podrás empezar tu primer repaso en cuanto añadas tus primeras palabras.',
  },
  taCollection: { fr: 'Ta collection', es: 'Tu colección' },
  collectionEmpty: { fr: 'Ta collection est vide', es: 'Tu colección está vacía' },
  emptyCopy: {
    fr: 'Ajoute ton premier mot — ou laisse Paco t’en proposer par thème.',
    es: 'Añade tu primera palabra — o deja que Paco te proponga algunas por tema.',
  },
  addWordBtn: { fr: '+ Ajouter un mot', es: '+ Añadir una palabra' },
  seeAll: { fr: 'Tout voir', es: 'Ver todo' },
  firstWords: { fr: 'Tes premiers mots', es: 'Tus primeras palabras' },
} as const satisfies Record<string, ChromePair>

// Status pill DISPLAYED labels (M6.1c). Keyed by the 4 pill KINDS (the map keys "À rappeler"/"En
// apprentissage" fold into review/progress and are never displayed, so no pair needed).
export const STATUS_CHROME = {
  review: { fr: 'À réviser', es: 'Por repasar' },
  progress: { fr: 'En cours', es: 'En curso' },
  new: { fr: 'Nouveau', es: 'Nuevo' },
  memorise: { fr: 'Mémorisé', es: 'Memorizado' },
} as const satisfies Record<string, ChromePair>

// Words list chrome (M6.1c) — WordList / SwipeRow / DeferredDelete. Dynamic ({n} mot(s), the
// query/delete-count lines) build per-language at the render site.
export const WORDS_CHROME = {
  filterAll: { fr: 'Tous', es: 'Todas' },
  filterReview: { fr: 'À revoir', es: 'Por repasar' },
  filterMemorised: { fr: 'Mémorisés', es: 'Memorizadas' },
  sortAlpha: { fr: 'Alphabétique', es: 'Alfabético' },
  sortDate: { fr: 'Date', es: 'Fecha' },
  sortFamiliarity: { fr: 'Familiarité', es: 'Familiaridad' },
  sortLabel: { fr: 'Trier', es: 'Ordenar' },
  searchPlaceholder: { fr: 'Rechercher…', es: 'Buscar…' },
  searchAria: { fr: 'Rechercher un mot', es: 'Buscar una palabra' },
  clearSearch: { fr: 'Effacer la recherche', es: 'Borrar la búsqueda' },
  myWords: { fr: 'Mes mots', es: 'Mis palabras' },
  firstWordWaiting: { fr: 'Ton premier mot t’attend', es: 'Tu primera palabra te espera' },
  firstWordCopy: {
    fr: 'Ajoute un mot et Paco s’en souviendra avec toi — il te le ramènera au bon moment.',
    es: 'Añade una palabra y Paco la recordará contigo — te la traerá en el momento justo.',
  },
  addWord: { fr: 'Ajouter un mot', es: 'Añadir una palabra' },
  noResults: { fr: 'Aucun résultat', es: 'Sin resultados' },
  noneMemorised: { fr: 'Aucun mot mémorisé', es: 'Ninguna palabra memorizada' },
  nothingToReview: { fr: 'Rien à réviser', es: 'Nada que repasar' },
  memorisedEmptyCopy: {
    fr: 'Continue tes révisions — tes mots arriveront ici une fois bien ancrés.',
    es: 'Sigue con tus repasos — tus palabras llegarán aquí una vez bien afianzadas.',
  },
  caughtUpCopy: {
    fr: 'Tu es à jour. Paco se repose — reviens un peu plus tard.',
    es: 'Estás al día. Paco descansa — vuelve un poco más tarde.',
  },
  delete: { fr: 'Supprimer', es: 'Eliminar' },
  undo: { fr: 'Annuler', es: 'Cancelar' },
} as const satisfies Record<string, ChromePair>

// Word-detail chrome (M6.1c) — WordDetailContent / WordDetailActions / page. The FR "relearn" label
// is reschedule-for-review (not relearn-from-scratch), so ES is "Volver a repasar".
export const DETAIL_CHROME = {
  formEyebrow: { fr: 'Forme', es: 'Forma' },
  definitionEyebrow: { fr: 'Définition', es: 'Definición' },
  examplesEyebrow: { fr: 'Exemples', es: 'Ejemplos' },
  similarEyebrow: { fr: 'Mots similaires', es: 'Palabras similares' },
  revealDef: { fr: 'Voir en français', es: 'Ver traducción' },
  hideDef: { fr: 'Masquer le français', es: 'Ocultar traducción' },
  revealEx: { fr: 'Traduction', es: 'Traducción' },
  hideEx: { fr: 'Masquer la traduction', es: 'Ocultar traducción' },
  myWordsBack: { fr: 'Mes mots', es: 'Mis palabras' },
  relearn: { fr: 'Remettre à réviser', es: 'Volver a repasar' },
  delete: { fr: 'Supprimer', es: 'Eliminar' },
  notReviewedYet: { fr: 'Pas encore révisé', es: 'Aún sin repasar' },
} as const satisfies Record<string, ChromePair>

// Drill chrome (M6.1d-i). French + vetted ES. Reuses elsewhere: "Conjugaison"/"verbes" (HOME_CHROME),
// "← Accueil" (NAV_CHROME.home), "Fermer" (DISCOVER_CHROME.close), "Valider" (REVIEW_CHROME.submit),
// "du premier coup" (REVIEW_CHROME.noteFirstTry), "Ta réponse" (REVIEW_CHROME.yourAnswer), the recap
// "À revoir" CATEGORY label (WORDS_CHROME.filterReview → Por repasar). Dynamic/plural lines build
// per-language at the render site. The drill instruction is the tú form (≠ Review's vous form).
export const DRILL_CHROME = {
  quit: { fr: "Quitter l'entraînement", es: 'Salir del entrenamiento' },
  back: { fr: 'Retour', es: 'Volver' },
  eyebrow: { fr: 'Entraînement', es: 'Entrenamiento' },
  finishedEyebrow: { fr: 'Entraînement terminé', es: 'Entrenamiento terminado' },
  time: { fr: 'Temps', es: 'Tiempo' },
  severalPossible: { fr: 'plusieurs possibles', es: 'varias posibles' },
  persons: { fr: 'Personnes', es: 'Personas' },
  start: { fr: 'Commencer', es: 'Empezar' },
  instruction: { fr: 'Complète la phrase', es: 'Completa la frase' },
  seeConjugation: { fr: 'Voir la conjugaison', es: 'Ver la conjugación' },
  theConjugation: { fr: 'La conjugaison', es: 'La conjugación' },
  promptHint: {
    fr: 'La case à compléter correspond à la personne demandée —',
    es: 'La casilla a completar corresponde a la persona indicada —',
  },
  almost: { fr: 'presque', es: 'casi' },
  notQuite: { fr: 'pas tout à fait', es: 'no del todo' },
  theAnswer: { fr: 'La réponse', es: 'La respuesta' },
  wasAnswer: { fr: "C'était", es: 'Era' },
  next: { fr: 'Suivant', es: 'Siguiente' },
  seeSummary: { fr: 'Voir le bilan', es: 'Ver el resumen' },
  finish: { fr: 'Terminer', es: 'Terminar' },
  replay: { fr: 'Rejouer', es: 'Jugar de nuevo' },
} as const satisfies Record<string, ChromePair>

// Shared-component chrome (M6.1d-ii) — the last 3 parked components flip here (their remaining
// French consumers join now). answerAria reuses REVIEW_CHROME.yourAnswer (done in M6.1d-i).
export const SHARED_CHROME = {
  audioAria: { fr: 'Écouter la prononciation', es: 'Escuchar la pronunciación' },
  loadingWait: { fr: 'Pendant que tu attends', es: 'Mientras esperas' },
  genFor: { fr: 'Paco creuse pour', es: 'Paco busca para' }, // + « {word} » in JSX
} as const satisfies Record<string, ChromePair>

// Dictionary chrome (M6.1d-ii). Reuses NAV_CHROME.dictionary (Diccionario). Dynamic count lines
// (N mémorisés, N restant(s), N mots dans ton dictionnaire, the "Plus que N" nudge) build per-lang.
export const DICT_CHROME = {
  personalLexicon: { fr: 'Lexique personnel', es: 'Vocabulario personal' },
  dictWaits: { fr: 'Ton dictionnaire t’attend', es: 'Tu diccionario te espera' },
  lockedBody: {
    fr: 'Mémorise 10 mots et il s’ouvre. Chacun s’y rangera tout seul, de A à Z — ta collection à toi, rien que les mots que tu sais.',
    es: 'Memoriza 10 palabras y se abre. Cada una se ordenará sola, de la A a la Z — tu colección personal, solo las palabras que sabes.',
  },
  unlocked: { fr: 'Débloqué', es: 'Desbloqueado' },
  dictUnlocked: { fr: 'Ton dictionnaire est débloqué !', es: '¡Tu diccionario está desbloqueado!' },
  shelvedBody: {
    fr: 'Rangés de A à Z, rien que les tiens. Le premier rayon d’une longue étagère.',
    es: 'Ordenadas de la A a la Z, solo las tuyas. El primer estante de una larga estantería.',
  },
  openMyDict: { fr: 'Ouvrir mon dictionnaire', es: 'Abrir mi diccionario' },
  later: { fr: 'Plus tard', es: 'Más tarde' },
} as const satisfies Record<string, ChromePair>

// Add-flow chrome (M6.1d-ii). Reuses DETAIL_CHROME (form/def/examples eyebrows + reveal/hide toggles),
// DISCOVER_CHROME.retry/genPhasePhon, WORDS_CHROME.undo, DRILL_CHROME.back. Many dynamic/interpolated
// lines (word/lemma/count/days) build per-language at the render site.
export const ADD_CHROME = {
  newWord: { fr: 'Nouveau mot', es: 'Nueva palabra' },
  enterWord: { fr: 'Entre un mot espagnol', es: 'Escribe una palabra en español' },
  helperParagraph: {
    fr: 'Paco va générer la définition, des exemples et des mots similaires pour enrichir ton apprentissage.',
    es: 'Paco generará la definición, ejemplos y palabras similares para enriquecer tu aprendizaje.',
  },
  search: { fr: 'Rechercher', es: 'Buscar' }, // + → in JSX
  didYouMean: { fr: 'Voulais-tu dire…', es: '¿Querías decir…?' },
  noneOfThese: { fr: 'Aucune de ces propositions', es: 'Ninguna de estas opciones' },
  conjugatedForm: { fr: 'Forme conjuguée', es: 'Forma conjugada' },
  searchAnother: { fr: 'Chercher un autre mot', es: 'Buscar otra palabra' },
  notInSpanish: { fr: "Ce mot n'existe pas en espagnol", es: 'Esta palabra no existe en español' },
  errorRetry: { fr: 'Erreur — réessayer', es: 'Error — reintentar' },
  errorOccurred: { fr: "Une erreur s'est produite — veuillez réessayer.", es: 'Ha ocurrido un error — inténtalo de nuevo.' },
  listoSub: { fr: 'Voici ce que Paco a trouvé.', es: 'Esto es lo que Paco ha encontrado.' },
  seeCard: { fr: 'Voir la fiche', es: 'Ver la ficha' }, // + → in JSX
  familyWords: { fr: 'Mots de la même famille', es: 'Palabras de la misma familia' },
  similarNotConfuse: { fr: 'Mots similaires à ne pas confondre', es: 'Palabras similares que no debes confundir' },
  similarHelper: {
    fr: "Apprendre des mots de la même famille en parallèle aide ton cerveau à les distinguer en contexte. Touche chaque mot pour l'ajouter à ton vocabulaire.",
    es: 'Aprender palabras de la misma familia en paralelo ayuda a tu cerebro a distinguirlas en contexto. Toca cada palabra para añadirla a tu vocabulario.',
  },
  addToCollection: { fr: 'Ajouter à ma collection', es: 'Añadir a mi colección' },
  selectAll: { fr: 'Tout sélectionner', es: 'Seleccionar todo' },
  deselectAll: { fr: 'Tout désélectionner', es: 'Deseleccionar todo' },
  exampleHide: { fr: 'Masquer', es: 'Ocultar' }, // add's bare "Masquer" (≠ detail's "Masquer la traduction")
  bringTomorrow: { fr: 'Paco te le ramènera demain pour ta première révision.', es: 'Paco te la traerá mañana para tu primer repaso.' },
  nextReviewToday: { fr: 'prochaine révision aujourd’hui', es: 'próximo repaso hoy' },
  noNeedRecreateReview: { fr: 'Pas besoin de le re-créer — ouvre-le pour le réviser.', es: 'No hace falta volver a crearla — ábrela para repasarla.' },
  viewMyWords: { fr: 'Voir mes mots', es: 'Ver mis palabras' },
  addAnother: { fr: 'Ajouter un autre mot', es: 'Añadir otra palabra' },
  wordsEnRouteHelp: {
    fr: 'Tes mots sont en train d’être ajoutés à ta bibliothèque — ça peut prendre jusqu’à 20 secondes. Tu peux continuer à naviguer.',
    es: 'Tus palabras se están añadiendo a tu biblioteca — puede tardar hasta 20 segundos. Puedes seguir navegando.',
  },
} as const satisfies Record<string, ChromePair>

// Account chrome (M6.1d-ii). Reuses DISCOVER_CHROME.soon ("Bientôt"→Pronto) + WORDS_CHROME.undo
// ("Annuler"→Cancelar). NOTE: the ImmersionModePicker's OWN strings are DELIBERATELY left French
// (it's the meta-control about the FR/ES choice + the escape hatch out of `totale`). PASSWORD_POLICY
// is resolved here (mode-aware) so the shared FR constant stays FR for signup.
export const ACCOUNT_CHROME = {
  // Group heads
  ghLearning: { fr: 'Apprentissage', es: 'Aprendizaje' },
  ghAudio: { fr: 'Audio', es: 'Audio' },
  ghPreferences: { fr: 'Préférences', es: 'Preferencias' },
  ghNotifications: { fr: 'Notifications', es: 'Notificaciones' },
  ghAccount: { fr: 'Compte', es: 'Cuenta' },
  ghAbout: { fr: 'À propos / Support', es: 'Acerca de / Soporte' },
  // Learning
  cardsPerSession: { fr: 'Cartes par session', es: 'Tarjetas por sesión' },
  cardsPerSessionHelp: { fr: 'Nombre de cartes par révision.', es: 'Número de tarjetas por repaso.' },
  newCardsDay: { fr: 'Nouvelles cartes / jour', es: 'Tarjetas nuevas / día' },
  newCardsDayHelp: { fr: 'Limite d’introduction quotidienne.', es: 'Límite de introducción diaria.' },
  retentionGoal: { fr: 'Objectif de rétention', es: 'Objetivo de retención' },
  retentionGoalHelp: { fr: 'Cible de mémorisation visée.', es: 'Nivel de memorización deseado.' },
  practiceReviews: { fr: 'Révisions d’entraînement', es: 'Repasos de entrenamiento' },
  practiceReviewsHelp: { fr: 'Réviser hors planning, sans impact.', es: 'Repasar fuera de la programación, sin impacto.' },
  hardWords: { fr: 'Mots difficiles', es: 'Palabras difíciles' },
  hardWordsHelp: { fr: 'Séance ciblée sur les mots qui résistent.', es: 'Sesión centrada en las palabras que se resisten.' },
  // Audio
  autoplay: { fr: 'Lecture auto à la révélation', es: 'Reproducción automática al revelar' },
  autoplayHelp: { fr: 'Prononce le mot quand la réponse s’affiche.', es: 'Pronuncia la palabra cuando aparece la respuesta.' },
  playbackSpeed: { fr: 'Vitesse de lecture', es: 'Velocidad de reproducción' },
  speedSlow: { fr: 'Lent', es: 'Lento' },
  speedNormal: { fr: 'Normal', es: 'Normal' },
  speedFast: { fr: 'Rapide', es: 'Rápido' },
  // Preferences
  themeColor: { fr: 'Thème de couleur', es: 'Tema de color' },
  themeColorHelp: {
    fr: 'L’apparence de l’app. Le vert (mémorisé) et le rouge (suppression) ne changent pas.',
    es: 'El aspecto de la app. El verde (memorizado) y el rojo (eliminar) no cambian.',
  },
  spanishVariant: { fr: 'Variante d’espagnol', es: 'Variante de español' },
  spanishVariantHelp: { fr: 'Espagne · Amérique latine', es: 'España · América Latina' },
  discoveryThemes: { fr: 'Thèmes Discovery', es: 'Temas de Descubrir' },
  discoveryThemesHelp: { fr: 'Centres d’intérêt pour la découverte.', es: 'Intereses para el descubrimiento.' },
  // Notifications
  dailyReminder: { fr: 'Rappel quotidien de révision', es: 'Recordatorio diario de repaso' },
  dailyReminderHelp: { fr: 'Une notification à l’heure choisie.', es: 'Una notificación a la hora elegida.' },
  // Account
  email: { fr: 'E-mail', es: 'E-mail' },
  changePassword: { fr: 'Changer le mot de passe', es: 'Cambiar la contraseña' },
  changePasswordStay: { fr: 'Tu resteras connecté sur cet appareil.', es: 'Seguirás conectado en este dispositivo.' },
  exportData: { fr: 'Exporter mes données', es: 'Exportar mis datos' },
  exportDataHelp: { fr: 'Télécharger tes mots au format CSV.', es: 'Descarga tus palabras en formato CSV.' },
  // About
  sendFeedback: { fr: 'Envoyer un retour / signaler un bug', es: 'Enviar comentarios / reportar un error' },
  privacyPolicy: { fr: 'Politique de confidentialité', es: 'Política de privacidad' },
  terms: { fr: 'Conditions d’utilisation', es: 'Condiciones de uso' },
  version: { fr: 'Version', es: 'Versión' },
  preBeta: { fr: 'pré-bêta', es: 'pre-beta' },
  footer: { fr: 'Paco · pré-bêta · juin 2026', es: 'Paco · pre-beta · junio 2026' },
  statsMemorized: { fr: 'mots mémorisés', es: 'palabras memorizadas' },
  statsReviews: { fr: 'révisions', es: 'repasos' },
  // AccountClient (delete + sign out)
  signOut: { fr: 'Se déconnecter', es: 'Cerrar sesión' },
  deleteAccount: { fr: 'Supprimer mon compte', es: 'Eliminar mi cuenta' },
  deleteTitle: { fr: 'Supprimer ton compte ?', es: '¿Eliminar tu cuenta?' },
  deleting: { fr: 'Suppression…', es: 'Eliminando…' },
  deletePermanently: { fr: 'Supprimer définitivement', es: 'Eliminar definitivamente' },
  networkError: { fr: 'Erreur réseau. Réessayez.', es: 'Error de red. Inténtalo de nuevo.' },
  errorOccurred: { fr: 'Une erreur est survenue.', es: 'Ha ocurrido un error.' },
  typeToConfirm: { fr: 'Tape SUPPRIMER pour confirmer', es: 'Escribe ELIMINAR para confirmar' },
  // The typed word the user must match to confirm — mode-aware so the ES instruction + the gate agree.
  confirmToken: { fr: 'SUPPRIMER', es: 'ELIMINAR' },
  // PasswordForm
  pwdCurrent: { fr: 'Mot de passe actuel', es: 'Contraseña actual' },
  pwdNew: { fr: 'Nouveau mot de passe', es: 'Nueva contraseña' },
  pwdConfirm: { fr: 'Confirmer le nouveau mot de passe', es: 'Confirmar la nueva contraseña' },
  pwdCurrentPh: { fr: 'Ton mot de passe actuel', es: 'Tu contraseña actual' },
  pwdNewPh: { fr: 'Au moins 8 caractères', es: 'Al menos 8 caracteres' },
  pwdConfirmPh: { fr: 'Retape le mot de passe', es: 'Vuelve a escribir la contraseña' },
  pwdPolicy: { fr: 'Au moins 8 caractères, dont un chiffre.', es: 'Al menos 8 caracteres, con al menos un número.' },
  pwdUpdating: { fr: 'Mise à jour…', es: 'Actualizando…' },
  pwdUpdate: { fr: 'Mettre à jour le mot de passe', es: 'Actualizar la contraseña' },
  pwdWrongCurrent: { fr: 'Le mot de passe actuel est incorrect.', es: 'La contraseña actual es incorrecta.' },
  pwdUpdateFailed: { fr: 'Impossible de mettre à jour le mot de passe. Réessaye.', es: 'No se ha podido actualizar la contraseña. Inténtalo de nuevo.' },
} as const satisfies Record<string, ChromePair>
