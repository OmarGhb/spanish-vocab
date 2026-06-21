import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  canSubmitPasswordChange,
  PASSWORD_POLICY_TEXT,
  MIN_PASSWORD_LENGTH,
} from './password-policy'

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('marie.dupont@email.com')).toBe(true)
    expect(isValidEmail('  a@b.co  ')).toBe(true) // trims
  })
  it('rejects malformed / missing', () => {
    expect(isValidEmail('marie.dupont@emai')).toBe(false) // no TLD dot
    expect(isValidEmail('no-at-sign.com')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('requires ≥ 8 chars AND a digit (mirrors POLICY_TEXT)', () => {
    expect(isValidPassword('MonMotDePasse1')).toBe(true)
    expect(isValidPassword('abc12345')).toBe(true)
    expect(isValidPassword('short1')).toBe(false) // 6 chars
    expect(isValidPassword('noDigitsHere')).toBe(false) // no digit
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword(null)).toBe(false)
  })
  it('POLICY_TEXT states exactly the enforced rule', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(PASSWORD_POLICY_TEXT).toContain('8')
    expect(PASSWORD_POLICY_TEXT.toLowerCase()).toContain('chiffre')
  })
})

describe('canSubmitPasswordChange', () => {
  it('true only when current present, new valid, and confirm === new', () => {
    expect(canSubmitPasswordChange({ current: 'old', next: 'abc12345', confirm: 'abc12345' })).toBe(true)
  })
  it('false when current empty', () => {
    expect(canSubmitPasswordChange({ current: '', next: 'abc12345', confirm: 'abc12345' })).toBe(false)
  })
  it('false when new fails policy', () => {
    expect(canSubmitPasswordChange({ current: 'old', next: 'weak', confirm: 'weak' })).toBe(false)
  })
  it('false when confirm mismatches', () => {
    expect(canSubmitPasswordChange({ current: 'old', next: 'abc12345', confirm: 'abc12346' })).toBe(false)
  })
})
