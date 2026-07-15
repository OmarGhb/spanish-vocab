import type { ImmersionMode } from './immersion'

// Pure copy for the deferred-delete undo toast. `labels` = the deleted word(s):
// one in M5.4b, N once M5.4c passes a bulk selection. Mode-aware (M6.1c); ES uses the
// feminine agreement (palabra → eliminada). Defaults to fr_es (byte-identical to before).
export function deleteToastMessage(labels: string[], mode: ImmersionMode = 'fr_es'): string {
  if (mode === 'fr_es') {
    if (labels.length === 1) return `« ${labels[0]} » supprimé`
    return `${labels.length} mots supprimés`
  }
  if (labels.length === 1) return `«${labels[0]}» eliminada`
  return `${labels.length} palabras eliminadas`
}
