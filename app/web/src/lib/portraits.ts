export type PortraitSlug = 'marcm' | 'nateb' | 'ashleyt' | 'mariem'

export interface Portrait {
  avif: string
  webp: string
  width: number
  height: number
}

function portrait(slug: PortraitSlug): Portrait {
  return {
    avif: `media/team/${slug}.avif`,
    webp: `media/team/${slug}.webp`,
    width: 320,
    height: 400,
  }
}

export const portraits: Partial<Record<PortraitSlug, Portrait>> = {
  marcm: portrait('marcm'),
  nateb: portrait('nateb'),
  ashleyt: portrait('ashleyt'),
  mariem: portrait('mariem'),
}
