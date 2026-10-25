import { env } from '@/lib/env'

import type { Answer, Frequency, QuestionKey, StepAnswers, Verdict } from './rubric'

interface VerdictText {
  readonly label: string
  readonly gloss: string
}

interface QuestionText {
  readonly text: string
  readonly short: string
  readonly example: string
}

const METHOD_RULES =
  'Every verdict comes from a fixed set of rules written in code. For any set of answers exactly one rule matches, so the same answers always give the same verdict.'

export const labPageCopy = {
  title: 'Should This Be AI?',
  subtitle: 'The Wrong-Tool Test',
  headerDescription:
    'Find out which steps of your work need AI, and which need a simple program, a checklist or a person.',
  metaDescription:
    'A free test that sorts each step of a workflow into the tool that fits it, with the reason in plain words.',
  howItWorksHeading: 'How It Works',
  howItWorks: [
    'Name the steps of one workflow.',
    'Answer a few short questions about each step.',
    'See which tool fits each step, and the rule that decided it.',
  ],
  methodHeading: 'How the Verdicts Are Made',
  methodBody: env.labLive
    ? `${METHOD_RULES} Nothing you type leaves this page unless you send it to us, or run a live test, which sends that test's text to Amazon Bedrock.`
    : `${METHOD_RULES} Nothing you type leaves this page unless you send it to us.`,
  evalsLink: 'See the Eval Runs',
  rubricVersion: 'Rubric Version {version}',
} as const

const frequencyPhrase = {
  daily: 'once a day',
  weekly: 'once a week',
  'monthly-or-less': 'once a month or less',
} as const satisfies Record<Exclude<Frequency, null>, string>

export const labLive = {
  panelHeading: 'Try a Step Live',
  stepPicker: 'Step to Test',
  raceHeading: 'Race This Step',
  raceButton: 'Race This Step',
  racing: 'Racing…',
  argueHeading: 'Argue the Other Side',
  argueButton: 'Argue the Other Side',
  arguing: 'Arguing…',
  argueInputLabel: 'What This Step Does',
  argueVerdictLabel: 'The Rubric Says',
  argueDisabledNoName: 'Name this step first, then argue against its verdict.',
  argueAttribution: 'written by a model; the verdict is from the rubric',
  raceNeedsExamples: 'Fill in at least 2 examples',
  inputNotice:
    "Sent to Amazon Bedrock to run this test, not stored by us. Don't paste customer names or personal details.",
  exampleInputLabel: (n: number) => `Example ${String(n)}`,
  exampleExpectedLabel: (n: number) => `Right Answer for Example ${String(n)}`,
  addExample: 'Add an Example',
  removeExample: (n: number) => `Remove Example ${String(n)}`,
  upToExamples: 'Up to 5 examples',
  measured: 'measured',
  laneModel: 'Nova 2 Lite',
  laneProgram: 'A Simple Program',
  accuracy: (correct: number, total: number) =>
    `${String(correct)} of ${String(total)} correct`,
  columns: {
    lane: 'Lane',
    accuracy: 'Accuracy',
    time: 'Time',
    tokens: 'Tokens',
    cost: 'Cost',
  },
  costOfRun: 'Cost of This Run',
  recordedCost: 'Recorded Cost',
  frequencyPhrase,
  monthly: (frequency: Exclude<Frequency, null>, usd: string) =>
    `If this runs ${frequencyPhrase[frequency]}, one item each time: about ${usd} USD a month for the model, against about 0 USD for a simple program`,
  monthlyUnderFloor: (frequency: Exclude<Frequency, null>) =>
    `If this runs ${frequencyPhrase[frequency]}, one item each time: less than 0.0001 USD a month for the model, against about 0 USD for a simple program`,
  priceNote: (date: string) => `AWS list prices on ${date}; excludes hosting`,
  runsLeft: (n: number) => `${String(n)} live runs left today`,
  recordedCap: (time: string) =>
    `Recording from ${time}, live runs are used up for today`,
  recordedOff: (time: string) => `Recording from ${time}, live runs are off`,
  recordedPreview: (time: string) => `Recorded run from ${time}`,
  recordedArgueFor: (summary: string) => `Recorded for the example step: ${summary}`,
  blocked: 'The safety filter stopped this run. Try different wording.',
  errorNetwork: 'Could not reach the lab. Check your connection and retry.',
  errorServer: 'The lab had a problem. Retry in a moment.',
  errorTimeout: 'The run took longer than 20 seconds. Retry.',
  errorValidation: 'Check each example has text and a right answer, then retry.',
  argueErrorValidation: 'Check this step has a name, then retry.',
  stepPickerBusy: 'Wait for the running test to finish before switching steps.',
  retry: 'Retry',
  announceRunning: (lane: string) => `${lane}: running`,
  announceDone: (lane: string) => `${lane}: result ready`,
  recordedHeading: 'A Recorded Race',
} as const

export const verdictCopy: Readonly<Record<Verdict, VerdictText>> = {
  'plain-code': { label: 'A Simple Program', gloss: 'Fixed steps, no judgment' },
  rules: { label: 'A Checklist Your Team Can Edit', gloss: 'If this, then that' },
  'classic-ml': {
    label: 'A Model Trained on Your Past Cases',
    gloss: 'Predicts from history',
  },
  'language-model': { label: 'An AI Language Model', gloss: 'Reads and writes text' },
  'do-not-automate': { label: 'Keep a Person on It', gloss: 'The judgment is the job' },
  unclear: {
    label: 'Worth a Conversation',
    gloss: 'Answer the not-sure questions to sharpen this',
  },
}

export const signOffCopy = '+ human sign-off'

export const questionCopy: Readonly<Record<QuestionKey, QuestionText>> = {
  fixedForm: {
    text: 'Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs?',
    short: 'Fixed Form',
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
    short: 'Checklist Changes Often',
    example:
      'Yes: shipping rates that change every month. No: a returns policy that has stayed the same for years.',
  },
  costly: {
    text: 'If it gets one wrong, does it cost money, a customer, or a legal problem?',
    short: 'Costly Mistake',
    example: 'Yes: paying the wrong supplier. No: tagging an email with the wrong topic.',
  },
  checkable: {
    text: 'Can a person check the result before it takes effect?',
    short: 'Checked First',
    example:
      'Yes: a draft reply waits for approval. No: the payment goes out on its own.',
  },
  pastCases: {
    text: 'Do you have past cases where you know the right answer, say 200 or more?',
    short: 'Past Cases',
    example: 'Yes: two years of quotes with the final price. No: each case is new.',
  },
}

export const frequencyQuestionCopy: QuestionText = {
  text: 'How often does it happen?',
  short: 'How Often',
  example: 'Optional. A later version uses it to estimate cost.',
}

export const answerCopy: Readonly<Record<NonNullable<Answer> | 'unanswered', string>> = {
  yes: 'Yes',
  no: 'No',
  'not-sure': 'Not Sure',
  unanswered: 'Not Answered',
}

export const frequencyCopy: Readonly<Record<NonNullable<Frequency>, string>> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'monthly-or-less': 'Monthly or Less',
}

export const builderCopy = {
  heading: 'Your Workflow',
  intro: 'Up to 8 steps. Names stay in this browser tab and are not stored.',
  stepLabel: 'Step {n}',
  stepLabelNamed: 'Step {n}, {name}',
  stepNameLabel: 'Name of Step {n}',
  stepNamePlaceholder: 'For example: send invoices',
  optional: '(optional)',
  add: 'Add a Step',
  addLimit: 'Up to 8 steps',
  moveUp: 'Move {step} Up',
  moveDown: 'Move {step} Down',
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
  triggered: 'Your Answers That Decided It',
  showCode: 'Show the Rule as Code',
  codeLabel: 'Rule {rule} as Code',
  ruleLine: 'Rule {rule}, Rubric {version}',
} as const

export const summaryCopy = {
  heading: 'Your Workflow at a Glance',
  intro: 'This is also what "Send us this result" sends.',
  viewLabel: 'Show As',
  cards: 'Cards',
  table: 'Table',
  caption: 'Each step, its verdict, the reason and the rule that decided it',
  scrollLabel: 'Workflow Summary Table',
  columns: { step: 'Step', verdict: 'Verdict', reason: 'Reason', rule: 'Rule' },
} as const

export const progressCopy = {
  heading: 'So Far',
  resolved: '{resolved} of {total} steps answered',
} as const

export const sendCopy = {
  heading: 'Send Us This Result',
  body: 'Opens our contact page with these results in the message. You can edit them before sending.',
  includeNames: 'Include My Step Names',
  previewLabel: 'Exactly What We Will Receive',
  button: 'Send Us This Result',
  intro: 'Results from Should This Be AI? (the wrong-tool test)',
  line: '{step}: {verdict} (rule {rule}, rubric {version})',
  truncated: 'More steps were cut to fit an email.',
  subject: 'Should This Be AI? results',
  notAnswered: 'not answered yet',
  ask: 'What I would like help with: ',
} as const

export const contactLabCopy = {
  added: 'We added your results. Edit or remove them.',
  emailResults: 'Email Us These Results',
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

const verdictPhrases: Readonly<Record<Verdict, string>> = {
  'plain-code': 'a simple program',
  rules: 'a checklist your team can edit',
  'classic-ml': 'a model trained on your past cases',
  'language-model': 'an AI language model',
  'do-not-automate': 'keep a person on it',
  unclear: 'worth a conversation',
}

export function verdictPhrase(verdict: Verdict, humanSignOff: boolean): string {
  const phrase = verdictPhrases[verdict]
  return humanSignOff ? `${phrase} ${signOffCopy}` : phrase
}

export const presetsCopy = {
  heading: 'Load an Example Workflow',
  intro: 'Each example replaces your steps with four answered ones.',
  load: 'Load {preset}',
} as const

export interface Preset {
  readonly id: 'invoice-intake' | 'support-inbox' | 'quote-requests'
  readonly title: string
  readonly steps: readonly { readonly name: string; readonly answers: StepAnswers }[]
}

type Six = readonly [Answer, Answer, Answer, Answer, Answer, Answer]

function seed(
  name: string,
  [fixedForm, checklist, changes, costly, checkable, pastCases]: Six,
  frequency: Frequency,
) {
  return {
    name,
    answers: { fixedForm, checklist, changes, costly, checkable, pastCases, frequency },
  }
}

export const presets: readonly Preset[] = [
  {
    id: 'invoice-intake',
    title: 'Invoice Intake',
    steps: [
      seed(
        "Read the supplier's invoice PDF",
        ['no', 'no', null, 'no', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Match the invoice to its purchase order',
        ['yes', 'yes', 'no', 'yes', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Send invoices over the spending limit to the right approver',
        ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'],
        'weekly',
      ),
      seed(
        'Decide whether to dispute a charge',
        ['yes', 'no', null, 'yes', 'no', 'no'],
        'monthly-or-less',
      ),
    ],
  },
  {
    id: 'support-inbox',
    title: 'Support Inbox',
    steps: [
      seed(
        'Sort incoming emails by topic',
        ['no', 'no', null, 'no', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Fill the order-status reply template from the order system',
        ['yes', 'yes', 'no', 'no', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Flag customers likely to cancel',
        ['yes', 'no', null, 'no', 'yes', 'yes'],
        'weekly',
      ),
      seed(
        'Reply to a complaint about a late delivery',
        ['no', 'no', null, 'yes', 'yes', 'yes'],
        'daily',
      ),
    ],
  },
  {
    id: 'quote-requests',
    title: 'Quote Requests',
    steps: [
      seed(
        'Pull job details from the request email',
        ['no', 'no', null, 'no', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Price a standard job from the rate card',
        ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'],
        'daily',
      ),
      seed(
        'Estimate how long a custom job takes',
        ['yes', 'no', null, 'yes', 'yes', 'yes'],
        'weekly',
      ),
      seed(
        'Decide whether to take on an unusual job',
        ['yes', 'no', null, 'yes', 'yes', 'no'],
        'monthly-or-less',
      ),
    ],
  },
]
