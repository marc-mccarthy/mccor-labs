'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  answerCopy,
  builderCopy,
  fillTemplate,
  frequencyCopy,
  frequencyQuestionCopy,
  questionCopy,
  stepLabel,
} from '@/content/lab/copy'
import { NAME_MAX } from '@/content/lab/limits'
import {
  visibleQuestions,
  type Answer,
  type Frequency,
  type QuestionKey,
} from '@/content/lab/rubric'

import type { Step } from './workflowState'

export type StepControl = 'name' | 'up' | 'down' | 'remove' | 'toggle'

export interface StepCardProps {
  readonly step: Step
  readonly position: number
  readonly total: number
  readonly onRename: (name: string) => void
  readonly onAnswer: (key: QuestionKey, value: Answer) => void
  readonly onFrequency: (value: Frequency) => void
  readonly onMove: (direction: 'up' | 'down') => void
  readonly onRemove: () => void
  readonly controlRef: (control: StepControl, element: HTMLElement | null) => void
  readonly children?: ReactNode
}

const ANSWERS = ['yes', 'no', 'not-sure'] as const
const FREQUENCIES = ['daily', 'weekly', 'monthly-or-less'] as const

const OPTION =
  'flex min-h-11 min-w-11 items-center gap-2 rounded-lg border border-border-strong px-3 has-checked:bg-elevated has-checked:font-semibold'
const RADIO =
  'size-5 appearance-none rounded-full border-2 border-border-strong checked:border-[6px] checked:border-text'
const FIELD =
  'border-border-strong bg-surface text-text placeholder:text-muted min-h-11 w-full rounded-lg border px-3 py-2'

interface Option<Value extends string> {
  readonly value: Value
  readonly text: string
}

interface ChoiceGroupProps<Value extends string> {
  readonly name: string
  readonly legend: ReactNode
  readonly example: string
  readonly exampleId: string
  readonly options: readonly Option<Value>[]
  readonly selected: Value | null
  readonly onSelect: (value: Value) => void
}

function ChoiceGroup<Value extends string>({
  name,
  legend,
  example,
  exampleId,
  options,
  selected,
  onSelect,
}: ChoiceGroupProps<Value>) {
  return (
    <fieldset aria-describedby={exampleId} className="min-w-0">
      <legend className="mb-1 font-medium">{legend}</legend>
      <p id={exampleId} className="mb-2 text-sm text-muted">
        {example}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={OPTION}>
            <input
              type="radio"
              className={RADIO}
              name={name}
              value={option.value}
              checked={selected === option.value}
              onChange={() => {
                onSelect(option.value)
              }}
            />
            {option.text}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const ANSWER_OPTIONS: readonly Option<NonNullable<Answer>>[] = ANSWERS.map((value) => ({
  value,
  text: answerCopy[value],
}))

const FREQUENCY_OPTIONS: readonly Option<NonNullable<Frequency>>[] = FREQUENCIES.map(
  (value) => ({ value, text: frequencyCopy[value] }),
)

interface StepControlsProps {
  readonly label: string
  readonly position: number
  readonly total: number
  readonly onMove: (direction: 'up' | 'down') => void
  readonly onRemove: () => void
  readonly controlRef: StepCardProps['controlRef']
}

function StepControls({
  label,
  position,
  total,
  onMove,
  onRemove,
  controlRef,
}: StepControlsProps) {
  const atTop = position === 1
  const atBottom = position === total
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="md"
        className="min-w-11"
        type="button"
        aria-disabled={atTop ? 'true' : undefined}
        ref={(element: HTMLButtonElement | null) => {
          controlRef('up', element)
        }}
        onClick={() => {
          if (!atTop) onMove('up')
        }}
      >
        {fillTemplate(builderCopy.moveUp, { step: label })}
      </Button>
      <Button
        variant="ghost"
        size="md"
        className="min-w-11"
        type="button"
        aria-disabled={atBottom ? 'true' : undefined}
        ref={(element: HTMLButtonElement | null) => {
          controlRef('down', element)
        }}
        onClick={() => {
          if (!atBottom) onMove('down')
        }}
      >
        {fillTemplate(builderCopy.moveDown, { step: label })}
      </Button>
      {total > 1 && (
        <Button
          variant="ghost"
          size="md"
          className="min-w-11"
          type="button"
          ref={(element: HTMLButtonElement | null) => {
            controlRef('remove', element)
          }}
          onClick={onRemove}
        >
          {fillTemplate(builderCopy.remove, { step: label })}
        </Button>
      )}
    </div>
  )
}

export function StepCard({
  step,
  position,
  total,
  onRename,
  onAnswer,
  onFrequency,
  onMove,
  onRemove,
  controlRef,
  children,
}: StepCardProps) {
  const label = stepLabel(position, step.name)
  return (
    <li data-testid={`step-${String(position)}`}>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg">{label}</h3>
          <StepControls
            label={label}
            position={position}
            total={total}
            onMove={onMove}
            onRemove={onRemove}
            controlRef={controlRef}
          />
        </div>
        <div id={`${step.id}-body`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${step.id}-name`} className="font-medium">
              {fillTemplate(builderCopy.stepNameLabel, { n: position })}
            </label>
            <input
              id={`${step.id}-name`}
              className={FIELD}
              maxLength={NAME_MAX}
              placeholder={builderCopy.stepNamePlaceholder}
              value={step.name}
              ref={(element) => {
                controlRef('name', element)
              }}
              onChange={(event) => {
                onRename(event.target.value)
              }}
            />
          </div>
          {visibleQuestions(step.answers).map((key) => (
            <ChoiceGroup
              key={key}
              name={`${step.id}-${key}`}
              legend={questionCopy[key].text}
              example={questionCopy[key].example}
              exampleId={`${step.id}-${key}-example`}
              options={ANSWER_OPTIONS}
              selected={step.answers[key]}
              onSelect={(value) => {
                onAnswer(key, value)
              }}
            />
          ))}
          <ChoiceGroup
            name={`${step.id}-frequency`}
            legend={
              <>
                {frequencyQuestionCopy.text}{' '}
                <span className="font-normal text-muted">{builderCopy.optional}</span>
              </>
            }
            example={frequencyQuestionCopy.example}
            exampleId={`${step.id}-frequency-example`}
            options={FREQUENCY_OPTIONS}
            selected={step.answers.frequency}
            onSelect={onFrequency}
          />
          {children}
        </div>
      </Card>
    </li>
  )
}
