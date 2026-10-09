import type { Rule } from '../rubric'

export const R4: Rule = {
  id: 'R4',
  reads: ['costly', 'checkable', 'fixedForm'],
  when: (a) =>
    (a.costly === 'no' ||
      (a.costly === 'yes' && (a.checkable === 'yes' || a.checkable === 'no'))) &&
    a.fixedForm !== 'yes' &&
    a.fixedForm !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'Whether the information and the result both come in a fixed form decides most of this. Answer question 1.',
}
