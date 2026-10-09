import type { Rule } from '../rubric'

export const R11: Rule = {
  id: 'R11',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'pastCases'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'no' &&
    a.pastCases === 'no',
  verdict: 'do-not-automate',
  humanSignOff: () => false,
  why: 'There is no checklist and no record of right answers to learn from, so for now the judgment is the job. Keeping a record of each decision is the first step to automating it later.',
}
