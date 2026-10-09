import type { Rule } from '../rubric'

export const R3: Rule = {
  id: 'R3',
  reads: ['costly', 'checkable'],
  when: (a) => a.costly === 'yes' && a.checkable !== 'yes' && a.checkable !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'A mistake here is costly. Whether a person can check the result first decides between automating with a sign-off and keeping a person on it. Answer question 4.',
}
