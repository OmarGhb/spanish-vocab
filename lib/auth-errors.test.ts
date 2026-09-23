import { describe, it, expect } from 'vitest'
import { loginErrorKind, resendResult } from './auth-errors'

describe('loginErrorKind', () => {
  it('maps email_not_confirmed → unverified', () => {
    expect(loginErrorKind('email_not_confirmed')).toBe('unverified')
  })

  it('maps invalid_credentials → invalid', () => {
    expect(loginErrorKind('invalid_credentials')).toBe('invalid')
  })

  it('maps any other / unknown / missing code → other', () => {
    expect(loginErrorKind('over_request_rate_limit')).toBe('other')
    expect(loginErrorKind('some_future_code')).toBe('other')
    expect(loginErrorKind(undefined)).toBe('other')
    expect(loginErrorKind(null)).toBe('other')
  })
})

describe('resendResult', () => {
  it('no error code (null/undefined) → sent', () => {
    expect(resendResult(null)).toBe('sent')
    expect(resendResult(undefined)).toBe('sent')
  })

  it('over_email_send_rate_limit → rate_limited', () => {
    expect(resendResult('over_email_send_rate_limit')).toBe('rate_limited')
  })

  it('any other error code → error', () => {
    expect(resendResult('unexpected_failure')).toBe('error')
    expect(resendResult('validation_failed')).toBe('error')
  })
})
