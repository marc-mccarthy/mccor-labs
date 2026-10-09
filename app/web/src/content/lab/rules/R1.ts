import type { Rule } from '../rubric'

export const R1: Rule = {
  id: 'R1',
  reads: ['costly'],
  when: (a) => a.costly !== 'yes' && a.costly !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'We need to know what a mistake here would cost before we can suggest a tool. Answer question 3.',
}
