import { describe, it, expect } from 'vitest'
import { parseConfirmParams } from './auth-confirm'

const q = (s: string) => new URLSearchParams(s)

describe('parseConfirmParams — email-confirm route seam', () => {
  it('valid invite params → parsed, next defaulted to /auth/set-password', () => {
    expect(parseConfirmParams(q('token_hash=abc123&type=invite'))).toEqual({
      token_hash: 'abc123',
      type: 'invite',
      next: '/auth/set-password',
    })
  })

  // v0.12.31 — this type was rejected until email confirmation was re-enabled.
  it('valid signup params → parsed, next defaulted to /onboarding', () => {
    expect(parseConfirmParams(q('token_hash=abc123&type=signup'))).toEqual({
      token_hash: 'abc123',
      type: 'signup',
      next: '/onboarding',
    })
  })

  it('the default next is per-TYPE, not global', () => {
    // The whole point of the v0.12.31 change: an invitee has no password yet and must land on the
    // set-password form, while a confirming signup already has one and goes straight to first-run.
    expect(parseConfirmParams(q('token_hash=abc&type=invite'))?.next).toBe('/auth/set-password')
    expect(parseConfirmParams(q('token_hash=abc&type=signup'))?.next).toBe('/onboarding')
  })

  it('honours a same-origin relative next, for either type', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=/auth/set-password'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=signup&next=/words'))?.next).toBe('/words')
  })

  it('missing token_hash → null', () => {
    expect(parseConfirmParams(q('type=invite'))).toBeNull()
    expect(parseConfirmParams(q('type=signup'))).toBeNull()
  })

  it('missing type → null', () => {
    expect(parseConfirmParams(q('token_hash=abc'))).toBeNull()
  })

  it('types with no validated next of their own are still rejected → null', () => {
    // recovery/magiclink/email_change have no landing target defined yet (forgot-password is a
    // stub). They join NEXT_BY_TYPE deliberately, with tests, when those flows are built.
    for (const t of ['recovery', 'email', 'magiclink', 'email_change', 'sign-up', 'INVITE', '']) {
      expect(parseConfirmParams(q(`token_hash=abc&type=${t}`)), t).toBeNull()
    }
  })

  it('open-redirect guard: protocol-relative next → the type default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=//evil.com'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=signup&next=//evil.com'))?.next).toBe(
      '/onboarding',
    )
  })

  it('open-redirect guard: absolute URL next → the type default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=https://evil.com/x'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=mailto:a@b.c'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=signup&next=https://evil.com/x'))?.next).toBe(
      '/onboarding',
    )
  })

  it('open-redirect guard: a bare non-slash next → the type default', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=invite&next=evil.com'))?.next).toBe(
      '/auth/set-password',
    )
    expect(parseConfirmParams(q('token_hash=abc&type=signup&next=evil.com'))?.next).toBe(
      '/onboarding',
    )
  })
})
