import type { Rule } from '../rubric'

export const R9: Rule = {
  id: 'R9',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'pastCases'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'no' &&
    a.pastCases !== 'yes' &&
    a.pastCases !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'There is no checklist for this decision, so it depends on whether you have enough past cases to learn from. Answer question 5.',
}
