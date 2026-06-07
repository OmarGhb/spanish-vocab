// Pure copy for the deferred-delete undo toast. `labels` = the deleted word(s):
// one in M5.4b, N once M5.4c passes a bulk selection.
export function deleteToastMessage(labels: string[]): string {
  if (labels.length === 1) return `« ${labels[0]} » supprimé`
  return `${labels.length} mots supprimés`
}
