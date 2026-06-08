// Selection / active treatments — the ONE rule (board §04), as a single source of truth.
//
// Two treatments, never any other:
//   SELECTION_ACTIVE     — momentary selection (tap): amber fill + ivory text + short shadow.
//                          Consumers: active nav tab (wired in M5.5a), active filter pill,
//                          selected rating, selected swipe choice (per-screen → cluster).
//   SELECTION_PERSISTENT — persistent state (in-progress / due): crème+ tint + a soft
//                          tinted border + ink text. Consumers: the À réviser word rows
//                          (Words cluster). The amber accent on such a row is carried by
//                          its 7px leading dot, not the border — an amber border on every
//                          due row reads too loud, so §04 was RECONCILED at the Words
//                          cluster (M5.5b) from the original "1.5px amber border" to this
//                          softer board-exact treatment. This is the single canonical
//                          "persistent" style; there is no amber-border variant in use.
//
// Exported as className strings (the repo's idiom is inline Tailwind) so every consumer
// reads from one place and the treatments can't drift across screens.
export const SELECTION_ACTIVE = 'bg-accent text-ivory shadow-amber-sm'

export const SELECTION_PERSISTENT = 'bg-surface-alt border border-tinted-border text-ink'
