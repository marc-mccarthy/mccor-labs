import type { Rule, RuleId, Verdict } from '../rubric'
import { R1 } from './R1'
import { R10 } from './R10'
import { R11 } from './R11'
import { R12 } from './R12'
import { R13 } from './R13'
import { R2 } from './R2'
import { R3 } from './R3'
import { R4 } from './R4'
import { R5 } from './R5'
import { R6 } from './R6'
import { R7 } from './R7'
import { R8 } from './R8'
import { R9 } from './R9'

export const RULES: readonly Rule[] = [
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
]

export const RULE_VERDICT: Readonly<Record<RuleId, Verdict>> = {
  R1: 'unclear',
  R2: 'do-not-automate',
  R3: 'unclear',
  R4: 'unclear',
  R5: 'language-model',
  R6: 'unclear',
  R7: 'plain-code',
  R8: 'rules',
  R9: 'unclear',
  R10: 'classic-ml',
  R11: 'do-not-automate',
  R12: 'plain-code',
  R13: 'unclear',
}
