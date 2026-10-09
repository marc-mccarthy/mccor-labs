import type { Rule } from '../rubric'

export const R13: Rule = {
  id: 'R13',
  reads: ['costly', 'checkable', 'fixedForm', 'checklist', 'changes'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'yes' &&
    a.checklist === 'yes' &&
    a.changes !== 'yes' &&
    a.changes !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'The decision is a checklist. How often your team changes it decides between a simple program and a checklist your team can edit. Answer the follow-up to question 2.',
}
