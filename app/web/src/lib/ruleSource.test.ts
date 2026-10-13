import { describe, expect, it } from 'vitest'
import { RULE_IDS } from '@/content/lab/rubric'
import { RULES } from '@/content/lab/rules'
import { readRuleSource } from './ruleSource'

describe('readRuleSource', () => {
  it.each(RULE_IDS)(
    'returns the source of rule %s with its condition and reason',
    (id) => {
      const source = readRuleSource(id)
      const rule = RULES.find((candidate) => candidate.id === id)!
      expect(source).toContain(`export const ${id}: Rule`)
      expect(source).toContain('when:')
      expect(source).toContain(rule.why.slice(0, 30))
    },
  )
})
