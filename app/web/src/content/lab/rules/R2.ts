import type { Rule } from '../rubric'

export const R2: Rule = {
  id: 'R2',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist'],
  when: (a) =>
    a.costly === 'yes' &&
    a.checkable === 'no' &&
    (a.fixedForm === 'no' || (a.fixedForm === 'yes' && a.checklist === 'no')),
  verdict: 'do-not-automate',
  humanSignOff: () => false,
  why: 'A mistake here is costly, nobody can check the result before it takes effect, and the decision is not a fixed checklist. The judgment is the job, so keep a person on it.',
}
