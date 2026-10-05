export type PortraitSlug = 'marcm' | 'nateb' | 'ashleyt' | 'mariem'

export interface Portrait {
  avif: string
  webp: string
  width: number
  height: number
}

export const portraits: Partial<Record<PortraitSlug, Portrait>> = {
  nateb: {
    avif: 'media/team/nateb.avif',
    webp: 'media/team/nateb.webp',
    width: 320,
    height: 400,
  },
}
