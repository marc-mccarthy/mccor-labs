'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { labLive } from '@/content/lab/copy'
import type { RaceExample } from '@/lib/lab'

export const MAX_EXAMPLES = 5
export const MIN_EXAMPLES = 2

const FIELD =
  'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-text'
const LIMIT_CLASS = 'min-w-11 aria-disabled:opacity-50 aria-disabled:hover:bg-surface'

export interface RaceInputsProps {
  readonly examples: readonly RaceExample[]
  readonly onChange: (next: RaceExample[]) => void
}

export function isExampleFilled({ input, expected }: RaceExample): boolean {
  return input.trim() !== '' && expected.trim() !== ''
}

export function filledExamples(examples: readonly RaceExample[]): RaceExample[] {
  return examples.filter(isExampleFilled)
}

export function isRaceReady(examples: readonly RaceExample[]): boolean {
  return filledExamples(examples).length >= MIN_EXAMPLES
}

export function RaceInputs({ examples, onChange }: RaceInputsProps) {
  const baseId = useId()
  const noticeId = `${baseId}-notice`
  const limitId = `${baseId}-limit`
  const nextKey = useRef(examples.length)
  const [keys, setKeys] = useState<number[]>(() => examples.map((_item, at) => at))
  const firstFields = useRef(new Map<number, HTMLTextAreaElement>())
  const pendingFocus = useRef<number | null>(null)
  const atLimit = examples.length >= MAX_EXAMPLES
  const canRemove = examples.length > MIN_EXAMPLES

  useEffect(() => {
    const target = pendingFocus.current
    if (target === null) return
    pendingFocus.current = null
    firstFields.current.get(target)?.focus()
  })

  function keyAt(index: number): number {
    return keys[index] ?? index
  }

  function update(index: number, patch: Partial<RaceExample>) {
    onChange(examples.map((item, at) => (at === index ? { ...item, ...patch } : item)))
  }

  function add() {
    if (atLimit) return
    const key = nextKey.current
    nextKey.current += 1
    setKeys([...examples.map((_item, at) => keyAt(at)), key])
    onChange([...examples, { input: '', expected: '' }])
  }

  function remove(index: number) {
    const target = index + 1 < examples.length ? keyAt(index + 1) : keyAt(index - 1)
    pendingFocus.current = target
    setKeys(examples.map((_item, at) => keyAt(at)).filter((_key, at) => at !== index))
    onChange(examples.filter((_item, at) => at !== index))
  }

  return (
    <div className="space-y-4">
      <p id={noticeId} className="text-sm text-muted">
        {labLive.inputNotice}
      </p>
      <ol className="space-y-4">
        {examples.map((example, index) => {
          const position = index + 1
          const key = keyAt(index)
          const inputId = `${baseId}-input-${String(key)}`
          const expectedId = `${baseId}-expected-${String(key)}`
          return (
            <li key={key} className="space-y-3">
              <div>
                <label htmlFor={inputId} className="mb-1 block text-sm text-text">
                  {labLive.exampleInputLabel(position)}
                </label>
                <textarea
                  ref={(element) => {
                    if (element === null) firstFields.current.delete(key)
                    else firstFields.current.set(key, element)
                  }}
                  id={inputId}
                  rows={2}
                  maxLength={500}
                  className={FIELD}
                  value={example.input}
                  aria-describedby={noticeId}
                  onChange={(event) => {
                    update(index, { input: event.target.value })
                  }}
                />
              </div>
              <div>
                <label htmlFor={expectedId} className="mb-1 block text-sm text-text">
                  {labLive.exampleExpectedLabel(position)}
                </label>
                <input
                  id={expectedId}
                  type="text"
                  maxLength={40}
                  className={FIELD}
                  value={example.expected}
                  aria-describedby={noticeId}
                  onChange={(event) => {
                    update(index, { expected: event.target.value })
                  }}
                />
              </div>
              {canRemove ? (
                <Button
                  variant="secondary"
                  size="md"
                  className="min-w-11"
                  type="button"
                  onClick={() => {
                    remove(index)
                  }}
                >
                  {labLive.removeExample(position)}
                </Button>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          className={LIMIT_CLASS}
          type="button"
          aria-disabled={atLimit ? 'true' : undefined}
          aria-describedby={atLimit ? limitId : undefined}
          onClick={add}
        >
          {labLive.addExample}
        </Button>
        {atLimit ? (
          <p id={limitId} className="text-sm text-muted">
            {labLive.upToExamples}
          </p>
        ) : null}
      </div>
    </div>
  )
}
