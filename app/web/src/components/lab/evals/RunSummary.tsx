import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { fillTemplate } from '@/content/lab/copy'
import type { EvalTrace, TraceCase } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'
import { formatUsd } from '@/lib/labCost'

function failureDetail(item: TraceCase): string {
  const check = item.code.checks.find((c) => !c.pass)
  if (check) return `${check.name}: ${check.detail}`
  return item.judge && !item.judge.pass ? item.judge.reason : ''
}

function FailedCases({ cases }: { readonly cases: readonly TraceCase[] }) {
  const failed = cases.filter((item) => !item.pass)
  if (failed.length === 0) return null
  return (
    <div className="mt-6">
      <h3 id="evals-failed-heading" className="font-medium">
        {evalsCopy.failedCases}
      </h3>
      <ul aria-labelledby="evals-failed-heading" className="mt-2 grid gap-2 text-sm">
        {failed.map((item) => (
          <li key={item.id}>
            <span className="font-mono">{item.id}</span>
            <span className="block text-muted">{failureDetail(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Latest({ trace }: { readonly trace: EvalTrace }) {
  const cost = formatUsd(trace.totals.costUsd)
  return (
    <Card className="mt-6">
      <p className="flex flex-wrap items-center gap-3">
        <span className="font-display text-xl">
          {trace.pass ? evalsCopy.passed : evalsCopy.failed}
        </span>
        {trace.staged ? <Badge>{evalsCopy.staged}</Badge> : null}
        <span className="font-mono text-sm text-muted">{trace.date}</span>
      </p>
      <ul className="mt-4 grid gap-1 text-sm">
        <li>
          {fillTemplate(evalsCopy.casesPassed, {
            passed: trace.totals.passed,
            cases: trace.totals.cases,
          })}
        </li>
        <li>
          {fillTemplate(evalsCopy.rubricTests, {
            passed: trace.rubric.passed,
            total: trace.rubric.passed + trace.rubric.failed,
          })}
        </li>
        <li>{fillTemplate(evalsCopy.rubricVersion, { version: trace.rubricVersion })}</li>
        <li>{fillTemplate(evalsCopy.model, { model: trace.modelId })}</li>
        <li>
          {evalsCopy.cost} <span className="font-mono tabular-nums">{cost.value}</span>{' '}
          <span className="text-muted">{cost.unit}</span>
        </li>
      </ul>
      <FailedCases cases={trace.cases} />
      {trace.runUrl === null ? null : (
        <p className="mt-6 text-sm">
          <a href={trace.runUrl} className="underline underline-offset-4">
            {evalsCopy.runLog}
          </a>
        </p>
      )}
    </Card>
  )
}

export function RunSummary({ trace }: { readonly trace: EvalTrace | null }) {
  return (
    <Section aria-labelledby="evals-latest-heading">
      <Container>
        <h2 id="evals-latest-heading" className="font-display text-2xl">
          {evalsCopy.latestHeading}
        </h2>
        {trace === null ? (
          <p className="mt-2 text-muted">{evalsCopy.empty}</p>
        ) : (
          <Latest trace={trace} />
        )}
      </Container>
    </Section>
  )
}
