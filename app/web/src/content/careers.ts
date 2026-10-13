import type { Role } from './types'

export const roles: readonly Role[] = [
  {
    slug: 'software-engineer-i',
    title: 'Software Engineer I',
    level: 'Early career',
    summary:
      'Your first or second engineering job, on real client work, with people who will actually review your code.',
    youWillDo: [
      'Build features across the stack on client websites and applications',
      "Have every pull request reviewed properly, and review others'",
      'Write the tests for what you build',
      'Sit in on client calls from early on, listening before talking',
      'Ask the question nobody else asked',
    ],
    weAreLookingFor: [
      'Working knowledge of JavaScript or TypeScript and one back-end language',
      'Evidence you can finish something — a project, a course, a contribution, anything you took to done',
      'Willingness to say "I don’t know that yet"',
      'Care about the person who uses what you build',
    ],
    applySubject: 'Application: Software Engineer I',
  },
  {
    slug: 'software-engineer-ii',
    title: 'Software Engineer II',
    level: 'Mid-level',
    summary:
      'You have shipped things, broken things, and fixed them. Now own projects rather than tickets.',
    youWillDo: [
      'Own the delivery of a client project end to end, with support',
      'Make architectural calls and explain them to people who are paying',
      "Review the Software Engineer I's work, and mean it",
      'Take the on-call-shaped problems: the intermittent bug, the slow query, the thing that only fails in production',
      'Help decide what we say yes and no to',
    ],
    weAreLookingFor: [
      'Three or more years building and maintaining production software',
      'Comfort across the stack, and honesty about where your depth actually is',
      "Experience inheriting someone else's codebase without rewriting it on reflex",
      'The judgment to know when good enough is good enough',
    ],
    applySubject: 'Application: Software Engineer II',
  },
  {
    slug: 'ai-engineer',
    title: 'AI-forward engineer',
    level: 'Mid to senior',
    summary:
      'Build AI features that can be evaluated, for clients who need them to be right rather than impressive.',
    youWillDo: [
      'Build LLM features, MCP servers and retrieval systems into client products',
      'Build the evaluation alongside the feature, so quality is measurable',
      'Model cost and latency before we commit a client to an approach',
      'Tell a client when a language model is the wrong tool — this is most of the value',
      'Keep up with a field that moves faster than anyone can comfortably track',
    ],
    weAreLookingFor: [
      'Shipped LLM work in production, not only prototypes',
      'Understanding of evaluation: how you know an output is good, and how you know it stayed good',
      'Solid software engineering underneath the AI work — this is an engineering role, not a prompt role',
      'Scepticism. Including about AI.',
    ],
    applySubject: 'Application: AI-Forward Engineer',
  },
  {
    slug: 'marketing-specialist',
    title: 'Marketing specialist',
    level: 'Open',
    summary:
      'We are four engineers who would rather build than sell. Own how this firm is found and understood.',
    youWillDo: [
      'Own how the firm presents itself — this site, its content, its search presence',
      'Turn delivered projects into case studies that are specific rather than vague',
      'Generate qualified inbound so we spend less time chasing work',
      'Decide what to measure and report it honestly, including when it is not working',
      'Work directly with engineers who will happily explain the technical substance',
    ],
    weAreLookingFor: [
      'Demonstrable B2B marketing results, ideally in technical services',
      'Ability to write about software without either dumbing it down or bluffing',
      'Comfort with being the only marketing person in the room',
      'Preference for measurable over decorative',
    ],
    applySubject: 'Application: Marketing Specialist',
  },
  {
    slug: 'general',
    title: 'Speculative',
    level: 'Open',
    summary: 'None of the above, but you think you should work here.',
    youWillDo: ['Tell us what you would do and why we need it'],
    weAreLookingFor: [
      'A specific proposition rather than a general availability — "I do X, and here is why that matters to a firm like yours" gets a reply. A CV with no message usually does not.',
    ],
    applySubject: 'Application: Speculative',
  },
] as const
