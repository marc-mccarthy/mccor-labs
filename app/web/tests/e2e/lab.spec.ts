import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  answerCopy,
  builderCopy,
  contactLabCopy,
  fillTemplate,
  questionCopy,
  sendCopy,
  whyCopy,
} from '@/content/lab/copy'
import {
  EMPTY_ANSWERS,
  QUESTION_KEYS,
  classifyStep,
  type QuestionKey,
  type StepAnswers,
} from '@/content/lab/rubric'
import { site } from '@/content/site'
import {
  encodeLabResult,
  formatLabResult,
  labMailtoHref,
  toLabResult,
} from '@/lib/labResult'

const PATH = '/lab/should-this-be-ai/'

async function openStep(page: Page, n: number) {
  const toggle = page.getByTestId(`step-${String(n)}`).locator('[data-step-toggle]')
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await toggle.click()
  }
}

async function answerStep(page: Page, n: number, name: string) {
  await openStep(page, n)
  const step = page.getByTestId(`step-${String(n)}`)
  await step.getByLabel(fillTemplate(builderCopy.stepNameLabel, { n })).fill(name)
  for (const key of QUESTION_KEYS) {
    await step
      .getByRole('group', { name: questionCopy[key].text })
      .getByRole('radio', { name: answerCopy.yes })
      .check()
  }
}

async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let i = 0; i < 80; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press(key)
  }
  throw new Error(`Keyboard focus never reached ${target.toString()}`)
}

function expectedMailto(
  steps: readonly { name: string; answers: StepAnswers }[],
  includeNames: boolean,
) {
  const result = toLabResult(
    steps.map(({ name, answers }) => ({ name, answers, result: classifyStep(answers) })),
    includeNames,
  )
  return {
    encoded: encodeLabResult(result),
    href: labMailtoHref(site.contactEmail, formatLabResult(result)),
  }
}

test.describe('lab at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/lab/should-this-be-ai/ filled with three steps and Why open has no axe violations', async ({
    page,
  }) => {
    await page.goto(PATH)
    const add = page.getByRole('button', { name: builderCopy.add })
    await add.click()
    await add.click()
    for (const [index, name] of [
      'Read invoices',
      'Match orders',
      'Approve payments',
    ].entries()) {
      await answerStep(page, index + 1, name)
    }
    await openStep(page, 1)
    const why = page.getByTestId('step-1').getByRole('button', { name: /^Why\?/ })
    await why.click()
    await expect(why).toHaveAttribute('aria-expanded', 'true')
    const showCode = page
      .getByTestId('step-1')
      .getByRole('button', { name: whyCopy.showCode })
    await showCode.click()
    await expect(showCode).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('step-1').getByRole('region')).toBeVisible()
    await page.waitForFunction(
      () => document.querySelector('[data-reveal="pending"]') === null,
    )
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    expect(
      results.incomplete.filter((result) => result.id === 'aria-prohibited-attr'),
    ).toEqual([])
  })

  test('/lab/should-this-be-ai/ step controls are at least 44 by 44 px', async ({
    page,
  }) => {
    await page.goto(PATH)
    await page.getByRole('button', { name: builderCopy.add }).click()
    await openStep(page, 1)
    const targets = page.locator(
      '[data-testid^=step-] button:visible, [data-testid^=step-] a:visible, [data-testid^=step-] label:has(input[type=radio]):visible',
    )
    const count = await targets.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      const target = targets.nth(i)
      const box = await target.boundingBox()
      const label = (await target.textContent()) ?? String(i)
      expect(box, label).not.toBeNull()
      expect(box!.width, label).toBeGreaterThanOrEqual(44)
      expect(box!.height, label).toBeGreaterThanOrEqual(44)
    }
  })

  test('/lab/should-this-be-ai/ a checked answer has a different fill from an unchecked one', async ({
    page,
  }) => {
    await page.goto(PATH)
    const group = page
      .getByTestId('step-1')
      .getByRole('group', { name: questionCopy.costly.text })
    await group.getByRole('radio', { name: answerCopy.yes, exact: true }).check()
    const fill = (name: string) =>
      group
        .locator('label', { has: page.getByRole('radio', { name, exact: true }) })
        .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(await fill(answerCopy.yes)).not.toBe(await fill(answerCopy.no))
  })
})

test('/lab/should-this-be-ai/ works by keyboard alone through to the contact page', async ({
  page,
}) => {
  await page.goto(PATH)
  const status = page.locator('[data-lab-status]')

  await tabTo(page, page.getByRole('button', { name: builderCopy.add }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name of step 2')).toBeFocused()
  await expect(status).toHaveText('Step 2 added.')

  await page.keyboard.type('Send invoices')
  await expect(status).toHaveText('Step 2 added.')

  const step2 = page.getByTestId('step-2')
  for (const key of QUESTION_KEYS) {
    await tabTo(
      page,
      step2
        .getByRole('group', { name: questionCopy[key].text })
        .getByRole('radio', { name: answerCopy.yes }),
    )
    await page.keyboard.press('Space')
  }
  await expect(status).toHaveText(
    'Step 2, Send invoices: a checklist your team can edit + human sign-off',
  )

  await tabTo(
    page,
    page.getByRole('button', { name: 'Move Step 2, Send invoices up' }),
    'Shift+Tab',
  )
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Move Step 1, Send invoices up' }),
  ).toBeFocused()
  await expect(status).toHaveText('Moved up. Now Step 1, Send invoices.')

  await tabTo(page, page.getByRole('button', { name: 'Remove Step 1, Send invoices' }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name of step 1')).toBeFocused()
  await expect(status).toHaveText(
    'Step 1, Send invoices removed. Undo is available for 10 seconds.',
  )

  const why = page.getByTestId('step-1').getByRole('button', { name: /^Why\?/ })
  await tabTo(page, why)
  await page.keyboard.press('Enter')
  await expect(why).toHaveAttribute('aria-expanded', 'true')
  await expect(why).toBeFocused()

  await page.evaluate(() => {
    ;(window as unknown as { labMarker: boolean }).labMarker = true
  })
  await tabTo(page, page.getByRole('link', { name: sendCopy.button }))
  await page.keyboard.press('Enter')
  await page.waitForURL('**/contact/')
  await expect(page.getByText(contactLabCopy.added)).toBeVisible()
  expect(new URL(page.url()).hash).toBe('')
  expect(
    await page.evaluate(
      () => (window as unknown as { labMarker?: boolean }).labMarker === true,
    ),
  ).toBe(true)
  await expect(
    page.getByRole('link', { name: contactLabCopy.emailResults }),
  ).toHaveAttribute(
    'href',
    expectedMailto([{ name: '', answers: EMPTY_ANSWERS }], false).href,
  )

  await page.goBack()
  await page.waitForURL(`**${PATH}`)
  await page.goForward()
  await page.waitForURL('**/contact/')
  expect(page.url()).not.toContain('#')
  await expect(page.getByText(contactLabCopy.added)).toHaveCount(0)
})

test('/contact/ fills the email from a #lab= link on a full page load', async ({
  page,
}) => {
  const allYes = Object.fromEntries(QUESTION_KEYS.map((key) => [key, 'yes'])) as Record<
    QuestionKey,
    'yes'
  >
  const { encoded, href } = expectedMailto(
    [{ name: 'Send invoices', answers: { ...EMPTY_ANSWERS, ...allYes } }],
    true,
  )
  await page.goto(`/contact/#lab=${encoded}`)
  await expect(page.getByText(contactLabCopy.added)).toBeVisible()
  await expect(
    page.getByRole('link', { name: contactLabCopy.emailResults }),
  ).toHaveAttribute('href', href)
  expect(href).toContain(encodeURIComponent('Step 1, Send invoices'))
  await expect.poll(() => page.url()).not.toContain('#')
})

test.describe('lab by keyboard at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/lab/should-this-be-ai/ keeps the focused control visible after Add, Remove and Undo', async ({
    page,
  }) => {
    await page.goto(PATH)
    const add = page.getByRole('button', { name: builderCopy.add })
    const name2 = page.getByLabel('Name of step 2')

    await tabTo(page, add)
    await page.keyboard.press('Enter')
    await expect(name2).toBeFocused()
    await expect(name2).toBeVisible()

    await tabTo(page, page.getByRole('button', { name: 'Remove Step 2' }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(add).toBeFocused()
    await expect(add).toBeVisible()

    await tabTo(page, page.getByRole('button', { name: builderCopy.undo }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(name2).toBeFocused()
    await expect(name2).toBeVisible()

    const step2 = page.getByTestId('step-2')
    await tabTo(page, step2.getByRole('button', { name: /^Why\?/ }))
    await page.keyboard.press('Enter')
    await tabTo(page, step2.getByRole('button', { name: whyCopy.showCode }))
    await page.keyboard.press('Enter')
    const code = step2.getByRole('region', {
      name: fillTemplate(whyCopy.codeLabel, { rule: 'R1' }),
    })
    await tabTo(page, code)
    await expect(code).toBeFocused()
    await expect(code).toBeVisible()
  })
})
