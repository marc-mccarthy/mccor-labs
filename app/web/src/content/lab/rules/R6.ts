import type { Rule } from '../rubric'

export const R6: Rule = {
  id: 'R6',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist'],
  when: (a) =>
    (a.costly === 'no' ||
      (a.costly === 'yes' && (a.checkable === 'yes' || a.checkable === 'no'))) &&
    a.fixedForm === 'yes' &&
    a.checklist !== 'yes' &&
    a.checklist !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'The information and the result both come in a fixed form. Whether you could write the decision as a checklist decides the rest. Answer question 2.',
}
