import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { answerCopy, questionCopy, whyCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { WhyDrawer } from './WhyDrawer'

const answers = {
  ...EMPTY_ANSWERS,
  costly: 'yes',
  checkable: 'no',
  fixedForm: 'no',
} as const

function setup() {
  render(
    <WhyDrawer
      position={2}
      name="Pay suppliers"
      result={classifyStep(answers)}
      answers={answers}
      snippet={<pre>R2 source</pre>}
    />,
  )
  return screen.getByRole('button', { name: /^Why\?/ })
}

describe('WhyDrawer', () => {
  it('names the step in the button and starts closed', () => {
    const button = setup()
    expect(button).toHaveAccessibleName('Why? for Step 2, Pay suppliers')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(classifyStep(answers).why)).not.toBeVisible()
  })

  it('opens inline, keeps focus on the button, and shows the reason first', async () => {
    const button = setup()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveFocus()
    expect(screen.getByText(classifyStep(answers).why)).toBeVisible()
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBeVisible()
  })

  it('lists only the answers the rule read', async () => {
    await userEvent.click(setup())
    expect(screen.getByText(questionCopy.costly.short)).toBeVisible()
    expect(screen.getByText(questionCopy.checkable.short)).toBeVisible()
    expect(screen.queryByText(questionCopy.pastCases.short)).not.toBeInTheDocument()
    expect(screen.getAllByText(answerCopy.yes).length).toBeGreaterThan(0)
  })

  it('shows the rule as code behind a nested disclosure', async () => {
    await userEvent.click(setup())
    const code = screen.getByRole('button', { name: whyCopy.showCode })
    expect(screen.getByText('R2 source')).not.toBeVisible()
    await userEvent.click(code)
    expect(code).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('R2 source')).toBeVisible()
  })
})
