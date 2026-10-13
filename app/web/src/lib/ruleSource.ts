import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { RuleId } from '@/content/lab/rubric'

const RULES_DIR = join(process.cwd(), 'src', 'content', 'lab', 'rules')

export function readRuleSource(id: RuleId): string {
  return readFileSync(join(RULES_DIR, `${id}.ts`), 'utf8').trimEnd()
}
