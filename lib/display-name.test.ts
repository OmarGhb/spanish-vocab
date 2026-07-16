import { describe, it, expect } from 'vitest'
import { displayNameFromEmail, resolveDisplayName } from './display-name'

describe('displayNameFromEmail', () => {
  it('title-cases the first token of the email local-part', () => {
    expect(displayNameFromEmail('camille.r@example.com')).toBe('Camille')
    expect(displayNameFromEmail('gahbicheomar@gmail.com')).toBe('Gahbicheomar')
    expect(displayNameFromEmail('JEAN@x.io')).toBe('Jean')
  })

  it('splits on . _ + - and takes the first non-empty segment', () => {
    expect(displayNameFromEmail('jean_pierre@x.io')).toBe('Jean')
    expect(displayNameFromEmail('a-b-c@x.io')).toBe('A')
    expect(displayNameFromEmail('marie+promos@x.io')).toBe('Marie')
    expect(displayNameFromEmail('.leading@x.io')).toBe('Leading') // leading separator skipped
  })

  it('returns null for missing / empty / unparseable input', () => {
    expect(displayNameFromEmail(null)).toBeNull()
    expect(displayNameFromEmail(undefined)).toBeNull()
    expect(displayNameFromEmail('')).toBeNull()
    expect(displayNameFromEmail('@nolocal.com')).toBeNull()
  })
})

describe('resolveDisplayName', () => {
  it('prefers the stored name (trimmed) over the email derivation', () => {
    expect(resolveDisplayName('Léa', 'camille.r@x.io')).toBe('Léa')
    expect(resolveDisplayName('  Théo  ', 'camille.r@x.io')).toBe('Théo')
  })

  it('falls back to the email derivation when the stored name is null/blank', () => {
    expect(resolveDisplayName(null, 'camille.r@x.io')).toBe('Camille')
    expect(resolveDisplayName('   ', 'camille.r@x.io')).toBe('Camille')
    expect(resolveDisplayName(undefined, 'jean_pierre@x.io')).toBe('Jean')
  })

  it('returns null when both are missing', () => {
    expect(resolveDisplayName(null, null)).toBeNull()
    expect(resolveDisplayName(undefined, undefined)).toBeNull()
  })
})
