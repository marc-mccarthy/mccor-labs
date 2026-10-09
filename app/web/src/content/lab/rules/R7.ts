import type { Rule } from '../rubric'

export const R7: Rule = {
  id: 'R7',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'changes'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'yes' &&
    a.changes === 'no',
  verdict: 'plain-code',
  humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes',
  why: 'The information and the result both come in a fixed form, the decision is a checklist your team rarely changes, and a mistake is cheap or checked first. A simple program does this the same way every time.',
}
