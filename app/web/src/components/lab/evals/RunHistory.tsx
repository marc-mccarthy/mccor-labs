import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import type { EvalTrace } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'
import { formatUsd } from '@/lib/labCost'

const NUMBER_CELL = 'px-3 py-2 font-mono tabular-nums text-right'

function resultText(trace: EvalTrace): string {
  const word = trace.pass ? evalsCopy.passed : evalsCopy.failed
  return trace.staged ? `${word} (${evalsCopy.staged})` : word
}

function HistoryRow({ trace }: { readonly trace: EvalTrace }) {
  const cost = formatUsd(trace.totals.costUsd)
  return (
    <tr className="border-b border-border align-top">
      <th scope="row" className="px-3 py-2 font-mono font-normal">
        {trace.date}
      </th>
      <td className="px-3 py-2">{resultText(trace)}</td>
      <td className={NUMBER_CELL}>
        {trace.totals.passed}/{trace.totals.cases}
      </td>
      <td className={NUMBER_CELL}>
        {trace.rubric.passed}/{trace.rubric.passed + trace.rubric.failed}
      </td>
      <td className={NUMBER_CELL}>
        {cost.value} <span className="text-muted">{cost.unit}</span>
      </td>
      <td className="px-3 py-2">
        {trace.runUrl === null ? null : (
          <a href={trace.runUrl} className="underline underline-offset-4">
            {evalsCopy.runLog}
          </a>
        )}
      </td>
    </tr>
  )
}

export function RunHistory({ traces }: { readonly traces: readonly EvalTrace[] }) {
  if (traces.length === 0) return null
  const { columns } = evalsCopy
  return (
    <Section aria-labelledby="evals-history-heading">
      <Container>
        <h2 id="evals-history-heading" className="font-display text-2xl">
          {evalsCopy.historyHeading}
        </h2>
        <div
          role="region"
          aria-label={evalsCopy.historyScrollLabel}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="mt-6 overflow-x-auto"
        >
          <table className="w-full min-w-xl border-collapse text-left text-sm">
            <caption className="sr-only">{evalsCopy.historyCaption}</caption>
            <thead>
              <tr className="border-b border-border-strong">
                <th scope="col" className="px-3 py-2 font-medium">
                  {columns.date}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {columns.result}
                </th>
                <th scope="col" className={`${NUMBER_CELL} font-medium`}>
                  {columns.cases}
                </th>
                <th scope="col" className={`${NUMBER_CELL} font-medium`}>
                  {columns.rubric}
                </th>
                <th scope="col" className={`${NUMBER_CELL} font-medium`}>
                  {columns.cost}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {columns.log}
                </th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => (
                <HistoryRow key={`${trace.date}-${trace.runId}`} trace={trace} />
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  )
}
