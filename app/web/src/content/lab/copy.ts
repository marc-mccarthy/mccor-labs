import type { Answer, Frequency, QuestionKey, Verdict } from './rubric'

interface VerdictText {
  readonly label: string
  readonly gloss: string
}

interface QuestionText {
  readonly text: string
  readonly short: string
  readonly example: string
}

export const labPageCopy = {
  title: 'Should This Be AI?',
  subtitle: 'the wrong-tool test',
  headerDescription:
    'The wrong-tool test. Find out which steps of your work need AI, and which need a simple program, a checklist or a person.',
  metaDescription:
    'A free test that sorts each step of a workflow into the tool that fits it, with the reason in plain words.',
  howItWorksHeading: 'How it works',
  howItWorks: [
    'Name the steps of one workflow.',
    'Answer a few short questions about each step.',
    'See which tool fits each step, and the rule that decided it.',
  ],
  methodHeading: 'How the verdicts are made',
  methodBody:
    'Every verdict comes from a fixed set of rules written in code. For any set of answers exactly one rule matches, so the same answers always give the same verdict. Nothing you type leaves this page unless you send it to us.',
  rubricVersion: 'Rubric version {version}',
} as const

export const verdictCopy: Readonly<Record<Verdict, VerdictText>> = {
  'plain-code': { label: 'A simple program', gloss: 'Fixed steps, no judgment' },
  rules: { label: 'A checklist your team can edit', gloss: 'If this, then that' },
  'classic-ml': {
    label: 'A model trained on your past cases',
    gloss: 'Predicts from history',
  },
  'language-model': { label: 'An AI language model', gloss: 'Reads and writes text' },
  'do-not-automate': { label: 'Keep a person on it', gloss: 'The judgment is the job' },
  unclear: {
    label: 'Worth a conversation',
    gloss: 'Answer the not-sure questions to sharpen this',
  },
}

export const signOffCopy = '+ human sign-off'

export const questionCopy: Readonly<Record<QuestionKey, QuestionText>> = {
  fixedForm: {
    text: 'Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs?',
    short: 'Fixed form',
    example:
      'Yes: an order form with the same fields every time. No: people describe what they want in an email, or the result is a written reply.',
  },
  checklist: {
    text: 'Could you write the decision as a checklist a new hire follows without asking you?',
    short: 'Checklist',
    example:
      'Yes: refunds under a set amount are approved. No: it depends on how the request reads.',
  },
  changes: {
    text: 'Does your team change this checklist themselves, more than a few times a year, such as prices, limits or who qualifies?',
    short: 'Checklist changes often',
    example:
      'Yes: shipping rates that change every month. No: a returns policy that has stayed the same for years.',
  },
  costly: {
    text: 'If it gets one wrong, does it cost money, a customer, or a legal problem?',
    short: 'Costly mistake',
    example: 'Yes: paying the wrong supplier. No: tagging an email with the wrong topic.',
  },
  checkable: {
    text: 'Can a person check the result before it takes effect?',
    short: 'Checked first',
    example:
      'Yes: a draft reply waits for approval. No: the payment goes out on its own.',
  },
  pastCases: {
    text: 'Do you have past cases where you know the right answer, say 200 or more?',
    short: 'Past cases',
    example: 'Yes: two years of quotes with the final price. No: each case is new.',
  },
}

export const frequencyQuestionCopy: QuestionText = {
  text: 'How often does it happen?',
  short: 'How often',
  example: 'Optional. A later version uses it to estimate cost.',
}

export const answerCopy: Readonly<Record<NonNullable<Answer> | 'unanswered', string>> = {
  yes: 'Yes',
  no: 'No',
  'not-sure': 'Not sure',
  unanswered: 'Not answered',
}

export const frequencyCopy: Readonly<Record<NonNullable<Frequency>, string>> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'monthly-or-less': 'Monthly or less',
}

export const builderCopy = {
  heading: 'Your workflow',
  intro: 'Up to 8 steps. Names stay in this browser tab and are not stored.',
  stepLabel: 'Step {n}',
  stepLabelNamed: 'Step {n}, {name}',
  stepNameLabel: 'Name of step {n}',
  stepNamePlaceholder: 'For example: send invoices',
  optional: '(optional)',
  add: 'Add a step',
  addLimit: 'Up to 8 steps',
  moveUp: 'Move {step} up',
  moveDown: 'Move {step} down',
  remove: 'Remove {step}',
  removedNotice: 'Step removed.',
  undo: 'Undo',
  answered: '{count} of {total} answered',
  toggle: '{step}. {verdict}. {answered}',
} as const

export const statusCopy = {
  added: '{step} added.',
  movedUp: 'Moved up. Now {step}.',
  movedDown: 'Moved down. Now {step}.',
  removed: '{step} removed. Undo is available for 10 seconds.',
  restored: '{step} restored.',
  verdict: '{step}: {verdict}',
  loaded: 'Loaded the {preset} example with {count} steps.',
} as const

export const whyCopy = {
  button: 'Why?',
  forStep: 'for {step}',
  triggered: 'Your answers that decided it',
  showCode: 'Show the rule as code',
  codeLabel: 'Rule {rule} as code',
  ruleLine: 'Rule {rule}, rubric {version}',
} as const

export const summaryCopy = {
  heading: 'Your workflow at a glance',
  intro: 'This is also what "Send us this result" sends.',
  viewLabel: 'Show as',
  cards: 'Cards',
  table: 'Table',
  caption: 'Each step, its verdict, the reason and the rule that decided it',
  scrollLabel: 'Workflow summary table',
  columns: { step: 'Step', verdict: 'Verdict', reason: 'Reason', rule: 'Rule' },
} as const

export const progressCopy = {
  heading: 'So far',
  resolved: '{resolved} of {total} steps answered',
} as const

export const sendCopy = {
  heading: 'Send us this result',
  body: 'Opens our contact page with these results in the message. You can edit them before sending.',
  includeNames: 'Include my step names',
  previewLabel: 'Exactly what we will receive',
  button: 'Send us this result',
  intro: 'Results from Should This Be AI? (the wrong-tool test)',
  line: '{step}: {verdict} (rule {rule}, rubric {version})',
  truncated: 'More steps were cut to fit an email.',
  subject: 'Should This Be AI? results',
  notAnswered: 'not answered yet',
  ask: 'What I would like help with: ',
} as const

export const contactLabCopy = {
  added: 'We added your results. Edit or remove them.',
  emailResults: 'Email us these results',
} as const

export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key]
    if (value === undefined)
      throw new Error(`Missing value for {${key}} in "${template}"`)
    return String(value)
  })
}

export function stepLabel(position: number, name: string): string {
  const trimmed = name.trim()
  return trimmed === ''
    ? fillTemplate(builderCopy.stepLabel, { n: position })
    : fillTemplate(builderCopy.stepLabelNamed, { n: position, name: trimmed })
}

export function verdictPhrase(verdict: Verdict, humanSignOff: boolean): string {
  const label = verdictCopy[verdict].label
  const lower = label.charAt(0).toLowerCase() + label.slice(1)
  return humanSignOff ? `${lower} ${signOffCopy}` : lower
}
