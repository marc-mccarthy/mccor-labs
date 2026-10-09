import { MAX_STEPS, NAME_MAX } from '@/content/lab/limits'
import {
  EMPTY_ANSWERS,
  type Answer,
  type Frequency,
  type QuestionKey,
  type StepAnswers,
} from '@/content/lab/rubric'

export interface Step {
  readonly id: string
  readonly name: string
  readonly answers: StepAnswers
}

export interface StepSeed {
  readonly name: string
  readonly answers: StepAnswers
}

export interface RemovedStep {
  readonly step: Step
  readonly index: number
}

export interface WorkflowState {
  readonly steps: readonly Step[]
  readonly nextId: number
  readonly removed: RemovedStep | null
}

export type WorkflowAction =
  | { readonly type: 'add' }
  | { readonly type: 'rename'; readonly id: string; readonly name: string }
  | {
      readonly type: 'answer'
      readonly id: string
      readonly key: QuestionKey
      readonly value: Answer
    }
  | { readonly type: 'frequency'; readonly id: string; readonly value: Frequency }
  | { readonly type: 'move'; readonly id: string; readonly direction: 'up' | 'down' }
  | { readonly type: 'remove'; readonly id: string }
  | { readonly type: 'undo' }
  | { readonly type: 'expire-undo' }
  | { readonly type: 'load'; readonly seeds: readonly StepSeed[] }

export function initialWorkflow(): WorkflowState {
  return {
    steps: [{ id: 'step-1', name: '', answers: EMPTY_ANSWERS }],
    nextId: 2,
    removed: null,
  }
}

function updateStep(
  state: WorkflowState,
  id: string,
  change: (step: Step) => Step,
): WorkflowState {
  return {
    ...state,
    steps: state.steps.map((step) => (step.id === id ? change(step) : step)),
  }
}

function addStep(state: WorkflowState): WorkflowState {
  if (state.steps.length >= MAX_STEPS) return state
  const step: Step = {
    id: `step-${String(state.nextId)}`,
    name: '',
    answers: EMPTY_ANSWERS,
  }
  return { ...state, steps: [...state.steps, step], nextId: state.nextId + 1 }
}

function moveStep(
  state: WorkflowState,
  id: string,
  direction: 'up' | 'down',
): WorkflowState {
  const from = state.steps.findIndex((step) => step.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= state.steps.length) return state
  const steps = [...state.steps]
  const [moving] = steps.splice(from, 1)
  if (moving === undefined) return state
  steps.splice(to, 0, moving)
  return { ...state, steps }
}

function removeStep(state: WorkflowState, id: string): WorkflowState {
  const index = state.steps.findIndex((step) => step.id === id)
  const step = state.steps[index]
  if (step === undefined || state.steps.length <= 1) return state
  return {
    ...state,
    steps: state.steps.filter((s) => s.id !== id),
    removed: { step, index },
  }
}

function undoRemove(state: WorkflowState): WorkflowState {
  if (state.removed === null || state.steps.length >= MAX_STEPS) return state
  const steps = [...state.steps]
  steps.splice(Math.min(state.removed.index, steps.length), 0, state.removed.step)
  return { ...state, steps, removed: null }
}

function loadSeeds(state: WorkflowState, seeds: readonly StepSeed[]): WorkflowState {
  const steps = seeds.slice(0, MAX_STEPS).map((seed, offset) => ({
    id: `step-${String(state.nextId + offset)}`,
    name: seed.name.slice(0, NAME_MAX),
    answers: seed.answers,
  }))
  return { steps, nextId: state.nextId + steps.length, removed: null }
}

export function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case 'add':
      return addStep(state)
    case 'rename':
      return updateStep(state, action.id, (step) => ({
        ...step,
        name: action.name.slice(0, NAME_MAX),
      }))
    case 'answer':
      return updateStep(state, action.id, (step) => ({
        ...step,
        answers: { ...step.answers, [action.key]: action.value },
      }))
    case 'frequency':
      return updateStep(state, action.id, (step) => ({
        ...step,
        answers: { ...step.answers, frequency: action.value },
      }))
    case 'move':
      return moveStep(state, action.id, action.direction)
    case 'remove':
      return removeStep(state, action.id)
    case 'undo':
      return undoRemove(state)
    case 'expire-undo':
      return { ...state, removed: null }
    case 'load':
      return loadSeeds(state, action.seeds)
  }
}
