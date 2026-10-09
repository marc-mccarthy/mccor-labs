import type { Rule } from '../rubric'

export const R5: Rule = {
  id: 'R5',
  reads: ['costly', 'checkable', 'fixedForm'],
  when: (a) =>
    (a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes')) &&
    a.fixedForm === 'no',
  verdict: 'language-model',
  humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes',
  why: 'The information or the result is free text, such as emails, PDFs, photos or written paragraphs. Reading and writing text is what a language model does well. Use it to read and pull out the facts. If the decision after the reading needs judgment or affects a person, such as hiring or pricing, make that its own step and answer the questions again for it.',
}
