import { describe, it, expect } from 'vitest'
import { deleteToastMessage } from './delete-toast'

describe('deleteToastMessage', () => {
  it('names the single deleted word', () => {
    expect(deleteToastMessage(['comer'])).toBe('« comer » supprimé')
  })

  it('counts a bulk deletion (M5.4c shape)', () => {
    expect(deleteToastMessage(['comer', 'beber', 'vivir'])).toBe('3 mots supprimés')
  })
})
