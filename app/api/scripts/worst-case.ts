import { BUDGET_USD, REJECTED_POSTS_USD_PER_10M } from '../src/config'
import { worstCaseArgueUsd, worstCaseMonthlyUsd, worstCaseRaceUsd } from '../src/lab/cost'

process.stdout.write(
  `${JSON.stringify({
    raceRunUsd: worstCaseRaceUsd(),
    argueRunUsd: worstCaseArgueUsd(),
    labMonthlyUsd: worstCaseMonthlyUsd(),
    rejectedPostsPer10mUsd: REJECTED_POSTS_USD_PER_10M,
    budgetUsd: BUDGET_USD,
  })}\n`,
)
