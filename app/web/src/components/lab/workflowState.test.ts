import { describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS } from '@/content/lab/rubric'
import { MAX_STEPS, NAME_MAX } from '@/content/lab/limits'
import {
  initialWorkflow,
  workflowReducer,
  type WorkflowAction,
  type WorkflowState,
} from './workflowState'

function run(...actions: WorkflowAction[]): WorkflowState {
  return actions.reduce(workflowReducer, initialWorkflow())
}

const ids = (state: WorkflowState) => state.steps.map((step) => step.id)

describe('workflowReducer', () => {
  it('starts with one empty step', () => {
    expect(initialWorkflow().steps).toEqual([
      { id: 'step-1', name: '', answers: EMPTY_ANSWERS },
    ])
  })

  it('adds steps up to the limit and no further', () => {
    const adds = Array.from({ length: MAX_STEPS + 2 }, (): WorkflowAction => ({
      type: 'add',
    }))
    expect(run(...adds).steps).toHaveLength(MAX_STEPS)
  })

  it('caps names at the name limit', () => {
    const state = run({ type: 'rename', id: 'step-1', name: 'x'.repeat(NAME_MAX + 5) })
    expect(state.steps[0]!.name).toHaveLength(NAME_MAX)
  })

  it('records an answer and a frequency', () => {
    const state = run(
      { type: 'answer', id: 'step-1', key: 'costly', value: 'yes' },
      { type: 'frequency', id: 'step-1', value: 'weekly' },
    )
    expect(state.steps[0]!.answers).toEqual({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      frequency: 'weekly',
    })
  })

  it('moves a step and ignores a move past either edge', () => {
    const state = run(
      { type: 'add' },
      { type: 'add' },
      { type: 'move', id: 'step-3', direction: 'up' },
    )
    expect(ids(state)).toEqual(['step-1', 'step-3', 'step-2'])
    expect(
      ids(workflowReducer(state, { type: 'move', id: 'step-1', direction: 'up' })),
    ).toEqual(ids(state))
    expect(
      ids(workflowReducer(state, { type: 'move', id: 'step-2', direction: 'down' })),
    ).toEqual(ids(state))
  })

  it('removes a step, remembers it, and restores it in place on undo', () => {
    const removed = run(
      { type: 'add' },
      { type: 'add' },
      { type: 'remove', id: 'step-2' },
    )
    expect(ids(removed)).toEqual(['step-1', 'step-3'])
    expect(removed.removed?.index).toBe(1)
    const restored = workflowReducer(removed, { type: 'undo' })
    expect(ids(restored)).toEqual(['step-1', 'step-2', 'step-3'])
    expect(restored.removed).toBeNull()
  })

  it('returns the same state from undo when the steps are full again', () => {
    const adds = Array.from({ length: 8 }, (): WorkflowAction => ({ type: 'add' }))
    const state = run(...adds, { type: 'remove', id: 'step-2' }, { type: 'add' })
    expect(state.steps).toHaveLength(MAX_STEPS)
    expect(state.removed).not.toBeNull()
    expect(workflowReducer(state, { type: 'undo' })).toBe(state)
  })

  it('never removes the last step', () => {
    expect(run({ type: 'remove', id: 'step-1' }).steps).toHaveLength(1)
  })

  it('forgets the removed step when undo expires', () => {
    const state = run(
      { type: 'add' },
      { type: 'remove', id: 'step-2' },
      { type: 'expire-undo' },
    )
    expect(state.removed).toBeNull()
    expect(ids(workflowReducer(state, { type: 'undo' }))).toEqual(['step-1'])
  })

  it('replaces every step when a preset loads, with fresh ids', () => {
    const seeds = [
      { name: 'One', answers: EMPTY_ANSWERS },
      { name: 'Two', answers: EMPTY_ANSWERS },
    ]
    const state = run({ type: 'add' }, { type: 'load', seeds })
    expect(state.steps.map((step) => step.name)).toEqual(['One', 'Two'])
    expect(ids(state)).toEqual(['step-3', 'step-4'])
    expect(state.removed).toBeNull()
  })
})
