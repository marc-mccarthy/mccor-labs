import type { TeamMember } from './types'

export const team: readonly TeamMember[] = [
  {
    slug: 'marc-m',
    name: 'Marc M.',
    role: 'Founder · Full-stack and AI Engineer',
    email: 'marcm@mccorlabs.com',
    mediaSlot: 'marcm',
    bio: 'Marc has spent four years building full-stack software across a wide range of projects — client websites through to MCP servers running in production for a Medicare company. He owns the parts a client never sees as readily as the parts they do: APIs, data models, deployment, and the monitoring that catches a problem before a customer reports it. He recently moved into an AI role at his corporate employer, and the work outside it runs in the same direction: AI integration for an energy company on a volunteer basis, and LLM-driven analytics over large databases for a major Twin Cities sports franchise. He also runs the firm’s teaching work, pairing with client teams on testing discipline, accessibility and getting genuinely useful results out of AI tooling. Away from the keyboard he is an active dad first, and after that you will find him fishing, at a bonfire with friends, under a barbell, or watching more or less any sport that happens to be on. Lately he has been deliberate about meeting new people and building connections across the local business community.',
  },
  {
    slug: 'nate-b',
    name: 'Nate B.',
    role: 'Consultation Specialist',
    email: 'nateb@mccorlabs.com',
    mediaSlot: 'nateb',
    bio: 'Nate is the first person most clients talk to, and the reason the work that follows tends to be the right work. Eight years in client-facing roles across professional services, where he learned that the brief a client arrives with is rarely the problem they actually have. He runs discovery, turns a vague ambition into a scope the engineers can price, and stays involved through delivery so nothing quietly drifts from what was agreed. He does not write the code, and he is careful never to promise on the engineers’ behalf. Outside work he is restoring a mid-eighties pickup a great deal more slowly than he planned, plays in a recreational hockey league he calls competitive and his teammates call social, and spends as much of the summer as he can on the water up north.',
  },
  {
    slug: 'ashley-t',
    name: 'Ashley T.',
    role: 'Designer and Frontend Engineer',
    email: 'ashleyt@mccorlabs.com',
    mediaSlot: 'ashleyt',
    bio: 'Ashley designs and then builds, which means the handoff problem simply does not exist on her projects. Six years in, split between an in-house brand team and agency work, she has a particular interest in interfaces that stay legible and usable under real conditions — slow connections, older devices, and people who are not paying full attention. She runs the accessibility review on every project the firm ships. She is a printmaker outside of work, which she credits for her patience with getting a detail exactly right, and she is usually training for a race she has described as her last one.',
  },
  {
    slug: 'marie-m',
    name: 'Marie M.',
    role: 'Project Lead and Quality Engineer',
    email: 'mariem@mccorlabs.com',
    mediaSlot: 'mariem',
    bio: "Marie makes sure the thing that ships is the thing that was agreed, and that it works. Eight years across delivery and QA, including a spell in regulated healthcare software where a missed requirement was a compliance finding rather than a bug report. She writes the test plan, runs the client conversations where scope actually gets decided, and is the reason projects here tend to finish on the date given at the start. She coaches a youth soccer team, cooks far more than four people can eat, and has an ongoing and unresolved argument with her garden's rabbits.",
  },
] as const
