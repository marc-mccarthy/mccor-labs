'use client'

import { useState } from 'react'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { signOffCopy, stepLabel, summaryCopy, verdictCopy } from '@/content/lab/copy'
import type { RubricResult } from '@/content/lab/rubric'

export interface SummaryRow {
  readonly position: number
  readonly name: string
  readonly result: RubricResult
}

type View = 'table' | 'cards'

function VerdictText({ result }: { readonly result: RubricResult }) {
  return (
    <>
      <span>{verdictCopy[result.verdict].label}</span>
      {result.humanSignOff ? (
        <span className="block text-sm text-muted">{signOffCopy}</span>
      ) : null}
    </>
  )
}

function SummaryTableView({ rows }: { readonly rows: readonly SummaryRow[] }) {
  return (
    <div
      role="region"
      aria-label={summaryCopy.scrollLabel}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="mt-6 overflow-x-auto"
    >
      <table className="w-full min-w-xl border-collapse text-left text-sm">
        <caption className="sr-only">{summaryCopy.caption}</caption>
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className="px-3 py-2 font-medium">
              {summaryCopy.columns.step}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {summaryCopy.columns.verdict}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {summaryCopy.columns.reason}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {summaryCopy.columns.rule}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ position, name, result }) => (
            <tr key={position} className="border-b border-border align-top">
              <th scope="row" className="px-3 py-3 font-medium">
                {stepLabel(position, name)}
              </th>
              <td className="px-3 py-3">
                <VerdictText result={result} />
              </td>
              <td className="px-3 py-3 text-muted">{result.why}</td>
              <td className="px-3 py-3 font-mono">{result.ruleId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCardsView({ rows }: { readonly rows: readonly SummaryRow[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-4">
      {rows.map(({ position, name, result }) => (
        <li key={position}>
          <Card>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted">{summaryCopy.columns.step}</dt>
                <dd className="font-medium">{stepLabel(position, name)}</dd>
              </div>
              <div>
                <dt className="text-muted">{summaryCopy.columns.verdict}</dt>
                <dd>
                  <VerdictText result={result} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">{summaryCopy.columns.reason}</dt>
                <dd>{result.why}</dd>
              </div>
              <div>
                <dt className="text-muted">{summaryCopy.columns.rule}</dt>
                <dd className="font-mono">{result.ruleId}</dd>
              </div>
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export function SummaryTable({ rows }: { readonly rows: readonly SummaryRow[] }) {
  const [view, setView] = useState<View>('table')

  return (
    <Section aria-labelledby="lab-summary-heading">
      <Container>
        <h2 id="lab-summary-heading" className="font-display text-2xl">
          {summaryCopy.heading}
        </h2>
        <p className="mt-2 text-muted">{summaryCopy.intro}</p>
        <div role="group" aria-label={summaryCopy.viewLabel} className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="min-w-11"
            type="button"
            aria-pressed={view === 'table'}
            onClick={() => {
              setView('table')
            }}
          >
            {summaryCopy.table}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="min-w-11"
            type="button"
            aria-pressed={view === 'cards'}
            onClick={() => {
              setView('cards')
            }}
          >
            {summaryCopy.cards}
          </Button>
        </div>
        {view === 'table' ? (
          <SummaryTableView rows={rows} />
        ) : (
          <SummaryCardsView rows={rows} />
        )}
      </Container>
    </Section>
  )
}
