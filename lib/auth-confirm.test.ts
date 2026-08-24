import { describe, it, expect } from 'vitest'
import { parseConfirmParams } from './auth-confirm'

const q = (s: string) => new URLSearchParams(s)

describe('parseConfirmParams — invite-confirm route seam', () => {
  it('valid invite params → parsed, next defaulted to /auth/set-password', () => {
    expect(parseConfirmParams(q('token_hash=abc123&type=invite'))).toEqual({
      token_hash: 'abc123',
      type: 'invite',
      next: '/auth/set-password',
    })
  })

  it('honours a same-origin relative next', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=/auth/set-password'))?.next).toBe(
      '/auth/set-password',
    )
  })

  it('missing token_hash → null', () => {
    expect(parseConfirmParams(q('type=invite'))).toBeNull()
  })

  it('missing type → null', () => {
    expect(parseConfirmParams(q('token_hash=abc'))).toBeNull()
  })

  it('non-invite types are rejected (recovery/email/signup not accepted yet) → null', () => {
    for (const t of ['recovery', 'email', 'signup', 'magiclink', 'email_change', '']) {
      expect(parseConfirmParams(q(`token_hash=abc&type=${t}`)), t).toBeNull()
    }
  })

  it('open-redirect guard: protocol-relative next → default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=//evil.com'))?.next).toBe(
      '/auth/set-password',
    )
  })

  it('open-redirect guard: absolute URL next → default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=https://evil.com/x'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=mailto:a@b.c'))?.next).toBe(
      '/auth/set-password',
    )
  })

  it('open-redirect guard: a bare non-slash next → default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=evil.com'))?.next).toBe(
      '/auth/set-password',
    )
  })
})
