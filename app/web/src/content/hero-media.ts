export const heroMedia = {
  poster: '/media/brand/mccor-stag-hero.webp',
  intros: [
    {
      mp4: '/media/brand/stag-charge-burst-return.mp4',
      webm: '/media/brand/stag-charge-burst-return.webm',
    },
    {
      mp4: '/media/brand/stag-turn-run-burst-return.mp4',
      webm: '/media/brand/stag-turn-run-burst-return.webm',
    },
    {
      mp4: '/media/brand/stag-logo-run-reassemble.mp4',
      webm: '/media/brand/stag-logo-run-reassemble.webm',
    },
  ],
  loop: {
    mp4: '/media/brand/stag-idle-loop.mp4',
    webm: '/media/brand/stag-idle-loop.webm',
  },
} as const

export function pickIntro() {
  const index = Math.floor(Math.random() * heroMedia.intros.length)
  return heroMedia.intros[index] ?? heroMedia.intros[0]
}
