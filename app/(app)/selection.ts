// Selection / active treatments — the ONE rule (board §04), as a single source of truth.
//
// Two treatments, never any other:
//   SELECTION_ACTIVE     — momentary selection (tap): amber fill + ivory text + short shadow.
//                          Consumers: active nav tab (wired in M5.5a), active filter pill,
//                          selected rating, selected swipe choice (per-screen → cluster).
//   SELECTION_PERSISTENT — persistent state (in-progress / due): crème+ tint + 1.5px amber
//                          border + ink text. Consumers: "en cours / à réviser" word rows
//                          (per-screen → Words cluster).
//
// Exported as className strings (the repo's idiom is inline Tailwind) so every consumer
// reads from one place and the treatments can't drift across screens.
export const SELECTION_ACTIVE = 'bg-accent text-ivory shadow-amber-sm'

export const SELECTION_PERSISTENT = 'bg-surface-alt border-[1.5px] border-accent text-ink'
