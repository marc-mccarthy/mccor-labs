import type { Rule } from '../rubric'

export const R10: Rule = {
  id: 'R10',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'pastCases'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'no' &&
    a.pastCases === 'yes',
  verdict: 'classic-ml',
  humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes',
  why: 'There is no checklist, but you have a record of past cases where you know the right answer. A model trained on that record can predict the next one.',
}
