import { describe, expect, it } from 'vitest'

import raceFixture from '../../scripts/fixtures/race-examples.json'
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
  it('picks the answer of the other example with the most similar words', () => {
    const examples = [
      { input: 'card charged twice', expected: 'billing' },
      { input: 'charged twice this month', expected: 'billing' },
      { input: 'reset my password', expected: 'account' },
      { input: 'forgot password again', expected: 'account' },
    ]
    expect(programAnswers(examples)).toEqual(['billing', 'billing', 'account', 'account'])
  })

  it('ignores stop words and tokens shorter than three characters', () => {
    const examples = [
      { input: 'the and for with you your our', expected: 'x' },
      { input: 'ab cd ef', expected: 'near' },
      { input: 'the and for with', expected: 'far' },
    ]
    expect(programAnswers(examples)[0]).toBe('near')
  })

  it('prefers the smaller union when the shared count is equal', () => {
    const examples = [
      { input: 'invoice paid', expected: 'x' },
      { input: 'invoice monday again later today', expected: 'long' },
      { input: 'invoice unpaid', expected: 'short' },
    ]
    expect(programAnswers(examples)[0]).toBe('short')
  })

  it('breaks a full tie by the lower example index', () => {
    const examples = [
      { input: 'alpha', expected: 'x' },
      { input: 'beta', expected: 'billing' },
      { input: 'gamma', expected: 'account' },
    ]
    expect(programAnswers(examples)[0]).toBe('billing')
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

  it('scores at least 3 of 5 on the recording fixture', () => {
    const { examples } = raceFixture
    const answers = programAnswers(examples)
    const { correct, total } = scoreAnswers(
      answers,
      examples.map((example) => example.expected),
    )
    expect(total).toBe(5)
    expect(correct).toBeGreaterThanOrEqual(3)
  })
})
