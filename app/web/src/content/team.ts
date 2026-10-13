import type { TeamMember } from './types'

export const team: readonly TeamMember[] = [
  {
    slug: 'marc-m',
    name: 'Marc M.',
    role: 'Founder · Full-stack and AI Engineer',
    email: 'marcm@mccorlabs.com',
    mediaSlot: 'marcm',
    bio: 'Marc founded the firm and still builds most of what it ships, with AI at the center of the work. By day he works in AI for a corporate employer, and his work runs in production: MCP servers that connect language models to live systems for a Medicare company, and, as a volunteer, AI pipelines and LLM-driven analytics over large databases for a sports franchise. Underneath it is four years of full-stack engineering, from websites built from scratch to APIs, data models and deployment. He previously taught software engineering at a local academy, and leads the firm’s teaching work as well. Away from the keyboard he is a devoted dad of five kids, six and under, and the neighborhood dad whose driveway every kid on the block seems to end up in. He is a heavy lifter, and has recently started training in mixed martial arts. You will also find him learning to cook, at a bonfire swapping stories with friends, or three episodes into a TV series he knows is terrible but cannot give up on.',
  },
  {
    slug: 'nate-b',
    name: 'Nate B.',
    role: 'Consultation Specialist',
    email: 'nateb@mccorlabs.com',
    mediaSlot: 'nateb',
    bio: 'Nate is the first person most clients talk to, and the reason the work that follows tends to be the right work. He brings eleven years in client-facing roles across professional services, where he learned that the brief a client arrives with is rarely the problem they actually have. He also runs his own Medicare health insurance firm, so he knows first-hand what a small business needs from the people it hires. He runs discovery, turns a vague ambition into a scope the engineers can price, and stays involved through delivery so nothing quietly drifts from what was agreed. Behind the scenes he keeps the books and runs the day-to-day management of the firm. Outside work he plays volleyball, is an active dad to his daughter, and spends as much time as he can with his dogs, Doyle and Mitka. He is a lifelong basketball fan who rarely misses a game, and summer weekends usually mean the family cabin in Wisconsin, where his daughter and the dogs set the schedule and nobody checks email.',
  },
  {
    slug: 'ashley-t',
    name: 'Ashley T.',
    role: 'Designer and Frontend Engineer',
    email: 'ashleyt@mccorlabs.com',
    mediaSlot: 'ashleyt',
    bio: 'Ashley designs and then builds, so there is no handoff problem on her projects. Six years in, split between an in-house brand team and agency work, she has a particular interest in interfaces that stay legible and usable under real conditions — slow connections, older devices, and people who are not paying full attention. She runs the accessibility review on every project the firm ships, and tests each one with a keyboard and screen reader. She would rather fix a confusing screen before launch than explain it to users after. Before joining the team, she taught software engineering at a university on the West Coast. She is a printmaker outside of work, which she credits for her patience with getting a detail exactly right. Most weekends find her in a Pilates or yoga class, and when the snow comes she trades the mat for a snowboard. A competitive gymnast growing up, she now coaches third graders through their first cartwheels and handstands. At night, she is happy to finish a bingeworthy TV series in one sitting.',
  },
  {
    slug: 'marie-m',
    name: 'Marie M.',
    role: 'Project Lead and Quality Engineer',
    email: 'mariem@mccorlabs.com',
    mediaSlot: 'mariem',
    bio: 'Marie makes sure the thing that ships is the thing that was agreed, and that it works. Eight years across delivery and QA, including a spell in regulated healthcare software where a missed requirement was a compliance finding rather than a bug report. She still tests everything the way a client will use it, not the way it was built. She writes the test plan, runs the client conversations where scope gets decided, and is the reason projects here tend to finish on the date given at the start. She would much rather catch a problem in a test plan than in front of a client, and clients tend to notice the difference. Outside work she coaches a youth soccer team, where she is known more for her patience than her tactics. She cooks far more than four people can eat, and has an ongoing and unresolved argument with her garden’s rabbits. And when the weather finally turns warm, she would rather be out on a boat or stretched out on a beach than anywhere else.',
  },
] as const
