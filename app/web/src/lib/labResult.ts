import {
  sendCopy,
  signOffCopy,
  verdictCopy,
  fillTemplate,
  stepLabel,
} from '@/content/lab/copy'
import { MAX_STEPS, NAME_MAX } from '@/content/lab/limits'
import {
  QUESTION_KEYS,
  RUBRIC_VERSION,
  RULE_IDS,
  VERDICTS,
  getRule,
  type RubricResult,
  type RuleId,
  type StepAnswers,
  type Verdict,
} from '@/content/lab/rubric'
import { MAILTO_BODY_MAX } from '@/lib/contact'

export { MAILTO_BODY_MAX }

const FORMAT_VERSION = 1
const VERSION_MAX = 20
const STEP_KEYS = ['name', 'verdict', 'humanSignOff', 'ruleId', 'unanswered']

export interface LabResultStep {
  readonly name: string | null
  readonly verdict: Verdict
  readonly humanSignOff: boolean
  readonly ruleId: RuleId
  readonly unanswered: boolean
}

export interface LabResult {
  readonly rubricVersion: string
  readonly steps: readonly LabResultStep[]
}

function isUnanswered(answers: StepAnswers): boolean {
  return answers.frequency === null && QUESTION_KEYS.every((key) => answers[key] === null)
}

export function toLabResult(
  steps: readonly { name: string; result: RubricResult; answers: StepAnswers }[],
  includeNames: boolean,
): LabResult {
  return {
    rubricVersion: RUBRIC_VERSION,
    steps: steps.map(({ name, result, answers }) => ({
      name: includeNames ? name : null,
      verdict: result.verdict,
      humanSignOff: result.humanSignOff,
      ruleId: result.ruleId,
      unanswered: isUnanswered(answers),
    })),
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export function encodeLabResult(result: LabResult): string {
  return toBase64Url(
    JSON.stringify({
      v: FORMAT_VERSION,
      rubricVersion: result.rubricVersion,
      steps: result.steps,
    }),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length && actual.every((key, i) => key === expected[i])
  )
}

function parseStep(value: unknown): LabResultStep | null {
  if (!isRecord(value) || !hasExactKeys(value, STEP_KEYS)) return null
  const { name, verdict, humanSignOff, ruleId, unanswered } = value
  if (name !== null && (typeof name !== 'string' || name.length > NAME_MAX)) return null
  const knownVerdict = VERDICTS.find((candidate) => candidate === verdict)
  const knownRule = RULE_IDS.find((candidate) => candidate === ruleId)
  if (knownVerdict === undefined || knownRule === undefined) return null
  if (getRule(knownRule).verdict !== knownVerdict) return null
  if (typeof humanSignOff !== 'boolean' || typeof unanswered !== 'boolean') return null
  const noSignOff = knownVerdict === 'do-not-automate' || knownVerdict === 'unclear'
  if (humanSignOff && noSignOff) return null
  if (unanswered && knownRule !== 'R1') return null
  return {
    name,
    verdict: knownVerdict,
    humanSignOff,
    ruleId: knownRule,
    unanswered,
  }
}

function parseSteps(value: unknown): LabResultStep[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_STEPS) return null
  const parsed = value.map(parseStep)
  return parsed.every((step) => step !== null) ? parsed : null
}

function parseLabResult(value: unknown): LabResult | null {
  if (!isRecord(value) || !hasExactKeys(value, ['v', 'rubricVersion', 'steps'])) {
    return null
  }
  const { v, rubricVersion, steps } = value
  if (v !== FORMAT_VERSION) return null
  if (
    typeof rubricVersion !== 'string' ||
    rubricVersion.length < 1 ||
    rubricVersion.length > VERSION_MAX
  ) {
    return null
  }
  const parsedSteps = parseSteps(steps)
  return parsedSteps === null ? null : { rubricVersion, steps: parsedSteps }
}

export function decodeLabResult(encoded: string): LabResult | null {
  try {
    return parseLabResult(JSON.parse(fromBase64Url(encoded)))
  } catch {
    return null
  }
}

function verdictText(step: LabResultStep): string {
  if (step.unanswered) return sendCopy.notAnswered
  const label = verdictCopy[step.verdict].label
  return step.humanSignOff ? `${label} ${signOffCopy}` : label
}

export function formatLabResult(result: LabResult): string {
  const lines = result.steps.map((step, i) =>
    fillTemplate(sendCopy.line, {
      step: stepLabel(i + 1, step.name ?? ''),
      verdict: verdictText(step),
      rule: step.ruleId,
      version: result.rubricVersion,
    }),
  )
  return [sendCopy.intro, ...lines, sendCopy.ask].join('\n')
}

function capBody(text: string): string {
  const lines = text.split('\n')
  const intro = lines.slice(0, 1)
  const stepLines = lines.slice(1, -1)
  const ask = lines.slice(-1)
  const build = (kept: readonly string[]) =>
    [
      ...intro,
      ...kept,
      ...(kept.length < stepLines.length ? [sendCopy.truncated] : []),
      ...ask,
    ].join('\n')
  let kept = stepLines
  while (kept.length > 0 && encodeURIComponent(build(kept)).length > MAILTO_BODY_MAX) {
    kept = kept.slice(0, -1)
  }
  return build(kept)
}

export function labMailtoHref(email: string, text: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(sendCopy.subject)}&body=${encodeURIComponent(capBody(text))}`
}
