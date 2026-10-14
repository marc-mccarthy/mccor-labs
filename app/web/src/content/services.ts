import type { Service } from './types'

export const services: readonly Service[] = [
  {
    slug: 'websites',
    title: 'Websites',
    summary:
      'Marketing sites, product sites and landing pages built to be fast, accessible and genuinely maintainable.',
    detail:
      'We design and build the site, not a template with your logo on it. That means a considered visual direction, copy that says something specific, and a front end that scores well on the things that actually affect whether people convert — load time, layout stability, working on a phone, working for someone using a keyboard or a screen reader. You get the code, and it is code your own developers can read.',
    outcome: 'A fast, accessible site you can hand to your own developers.',
    deliverables: [
      'Design direction and page designs',
      'Production front end with a typed content layer',
      'Accessibility review against WCAG 2.2 AA',
      'Performance budget, measured rather than promised',
      'Deployment pipeline and documentation',
      'Handover, with the repository and hosting in your name',
    ],
    capabilities: [
      {
        slug: 'static-build',
        title: 'This Site’s Own Build',
        summary:
          'An excerpt of the production build for this site: settings resolved from 1Password at build time rather than committed, and every route prerendered as static HTML.',
        substance: { kind: 'terminal', ref: 'static-export-build' },
      },
    ],
  },
  {
    slug: 'applications',
    title: 'Applications',
    summary:
      'Web and mobile applications, from a first working version to something with real users on it.',
    detail:
      'Most of what we build is a product with logins, data, permissions and a business process behind it. We are comfortable owning the whole stack — interface, API, database, deployment, monitoring — and equally comfortable slotting into an existing codebase and an existing team. We start with the smallest thing that answers the real question, then build out from what you learn rather than from what was assumed at the start.',
    outcome:
      'A working application, deployed, with the tests and infrastructure behind it.',
    deliverables: [
      'Technical design and data model',
      'Working application, deployed',
      'Authentication, authorization and audit where the domain needs them',
      'Automated tests covering the paths that matter',
      'Infrastructure as code',
      'Runbook and handover',
    ],
  },
  {
    slug: 'ai-engineering',
    title: 'AI Integration',
    summary:
      'MCP servers, LLM features and analytics over data you already have — built to be evaluated, not just demoed.',
    detail:
      'We have shipped MCP servers in production for a Medicare company and LLM-driven analytics across large databases for a major sports franchise. The work that goes wrong here almost always goes wrong the same way: a demo that impresses, then no way to tell whether it is right. So we build the evaluation alongside the feature, keep a human in the loop where being wrong is expensive, and are direct about the cases where a language model is the wrong tool and a query would do.',
    outcome: 'An AI feature with a measured quality baseline, not just a demo.',
    deliverables: [
      'Feasibility assessment, including where AI is the wrong answer',
      'MCP server or LLM feature, integrated with your systems',
      'Evaluation harness and a quality baseline you can re-run',
      'Cost and latency modeling before commitment, not after',
      'Documentation your team can maintain',
    ],
    capabilities: [
      {
        slug: 'ai-integration',
        title: 'Named Integration Surfaces',
        summary:
          'LLM features and MCP servers connected to named integration surfaces in your systems, not a standalone demo.',
        substance: { kind: 'diagram', ref: 'integration-surfaces' },
      },
      {
        slug: 'workflow-automation',
        title: 'Workflow Automation',
        summary:
          'Multi-step agent workflows with approval gates and cost ceilings, so an agent never acts past where a human should sign off.',
        substance: { kind: 'diagram', ref: 'workflow-approval-gate' },
      },
      {
        slug: 'retrieval-pipelines',
        title: 'Retrieval Pipelines',
        summary:
          'Ingestion, chunking, embedding, hybrid retrieval and reranking as named, measured pipeline steps.',
        substance: { kind: 'diagram', ref: 'retrieval-pipeline' },
      },
      {
        slug: 'mcp-servers',
        title: 'MCP Servers',
        summary:
          'MCP servers built on Streamable HTTP, shipped into production rather than prototyped.',
        substance: { kind: 'code', ref: 'mcp-server-transport' },
      },
      {
        slug: 'evaluation',
        title: 'Evaluation',
        summary:
          'A CI-gated eval harness that measures output quality against a baseline and alerts when it drops, rather than a claim that outputs are correct.',
        substance: { kind: 'code', ref: 'eval-assertion' },
      },
    ],
  },
  {
    slug: 'consulting',
    title: 'Developer Consulting',
    summary:
      'A second opinion for development teams — architecture review, code review, and help getting unstuck.',
    detail:
      'Sometimes the useful thing is not another pair of hands but someone who has seen the failure mode before. We review architecture before it is expensive to change, audit code for the problems that only show up under load or in front of an auditor, and work alongside your team on the part of the system nobody wants to touch. We tell you what we actually think, including when the answer is that your existing plan is fine.',
    outcome: 'Prioritized, specific findings your own team can act on.',
    deliverables: [
      'Architecture or code review with prioritized, specific findings',
      'Written recommendations, ordered by what they cost and what they save',
      'Pairing sessions with your developers',
      'Follow-up review once changes land',
    ],
  },
  {
    slug: 'teaching',
    title: 'Hands-On Teaching',
    summary:
      'Practical training for development teams, taught on your codebase rather than a toy example.',
    detail:
      'Training that uses someone else’s example project tends not to survive contact with your repository. We teach on your code, on the problems your team actually has — testing discipline, accessibility, performance work, getting useful results out of AI tooling. Sessions are hands-on and small, and you keep the written material afterwards. Marc leads this work.',
    outcome: 'A team that can keep doing the thing after we leave.',
    deliverables: [
      "Curriculum built from your team's current gaps",
      'Hands-on sessions on your codebase',
      'Written reference material that outlasts the session',
      'Follow-up review to see what stuck',
    ],
  },
] as const
