import { describe, it, expect } from 'vitest'
import { deleteToastMessage } from './delete-toast'
import { chromeCtxFromMode } from './immersion'

describe('deleteToastMessage', () => {
  it('names the single deleted word', () => {
    expect(deleteToastMessage(['comer'])).toBe('« comer » supprimé')
  })

  it('counts a bulk deletion (M5.4c shape)', () => {
    expect(deleteToastMessage(['comer', 'beber', 'vivir'])).toBe('3 mots supprimés')
  })

  it('renders Spanish under the tap/hidden policies (feminine agreement)', () => {
    expect(deleteToastMessage(['comer'], chromeCtxFromMode('immersion'))).toBe('«comer» eliminada')
    expect(deleteToastMessage(['comer', 'beber', 'vivir'], chromeCtxFromMode('totale'))).toBe(
      '3 palabras eliminadas',
    )
  })
})
