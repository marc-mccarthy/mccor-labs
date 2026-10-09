import { describe, expect, it } from 'vitest'

import { normalizeAnswer, programAnswers, scoreAnswers } from './score'

describe('normalizeAnswer', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalizeAnswer('  Billing   Issue ')).toBe('billing issue')
  })
})

describe('scoreAnswers', () => {
  it('counts normalized matches and treats empty answers as wrong', () => {
    expect(
      scoreAnswers(['Billing', '', 'account'], ['billing', 'account', 'account']),
    ).toEqual({
      correct: 2,
      total: 3,
    })
  })

  it('totals by the expected list', () => {
    expect(scoreAnswers([], ['a', 'b'])).toEqual({ correct: 0, total: 2 })
  })
})

describe('programAnswers', () => {
  it('picks the answer of the other example with the most shared words', () => {
    const examples = [
      { input: 'card charged twice', expected: 'billing' },
      { input: 'charged twice this month', expected: 'billing' },
      { input: 'reset my password', expected: 'account' },
      { input: 'forgot password again', expected: 'account' },
    ]
    expect(programAnswers(examples)).toEqual(['billing', 'billing', 'account', 'account'])
  })

  it('falls back to the most common other answer when nothing is shared', () => {
    const examples = [
      { input: 'alpha', expected: 'x' },
      { input: 'beta', expected: 'account' },
      { input: 'gamma', expected: 'Account' },
      { input: 'delta', expected: 'billing' },
    ]
    expect(programAnswers(examples)[0]).toBe('account')
  })

  it('breaks a full tie by the first other example in order', () => {
    const examples = [
      { input: 'alpha', expected: 'x' },
      { input: 'beta', expected: 'billing' },
      { input: 'gamma', expected: 'account' },
    ]
    expect(programAnswers(examples)[0]).toBe('billing')
  })

  it('breaks a score tie by the more common answer', () => {
    const examples = [
      { input: 'shared word', expected: 'x' },
      { input: 'shared one', expected: 'rare' },
      { input: 'word two', expected: 'common' },
      { input: 'other', expected: 'common' },
    ]
    expect(programAnswers(examples)[0]).toBe('common')
  })

  it('returns the other example answer as written', () => {
    const examples = [
      { input: 'same words', expected: 'x' },
      { input: 'same words', expected: ' Billing ' },
    ]
    expect(programAnswers(examples)[0]).toBe(' Billing ')
  })

  it('is pure and does not mutate its input', () => {
    const examples = [
      { input: 'card charged twice', expected: 'billing' },
      { input: 'reset my password', expected: 'account' },
    ]
    const copy = structuredClone(examples)
    expect(programAnswers(examples)).toEqual(programAnswers(examples))
    expect(examples).toEqual(copy)
  })
})
