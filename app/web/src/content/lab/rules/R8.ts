import type { Rule } from '../rubric'

export const R8: Rule = {
  id: 'R8',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'changes'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'yes' &&
    a.changes === 'yes',
  verdict: 'rules',
  humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes',
  why: 'The information and the result both come in a fixed form and the decision is a checklist, but your team changes it more than a few times a year. Keep the checklist where your team can read and change it without a programmer.',
}
