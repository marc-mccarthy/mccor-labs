import type { Rule } from '../rubric'

export const R12: Rule = {
  id: 'R12',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist'],
  when: (a) =>
    a.costly === 'yes' &&
    a.checkable === 'no' &&
    a.fixedForm === 'yes' &&
    a.checklist === 'yes',
  verdict: 'plain-code',
  humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes',
  why: 'The information and the result both come in a fixed form and the decision is a checklist, so a simple program applies it the same way every time. A mistake is costly and nobody checks the result first, so test the program on past cases before you rely on it.',
}
