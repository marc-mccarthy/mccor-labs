export interface NavItem {
  label: string
  href: string
}

export interface Service {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: readonly string[]
}

export interface TeamMember {
  slug: string
  name: string
  role: string
  bio: string
  /** Media slot id resolved through the media manifest, or null for a
   *  non-photographic treatment. */
  mediaSlot: string | null
  links?: readonly { label: string; href: string }[]
}

export interface ProcessStage {
  index: number
  title: string
  summary: string
  duration: string
}
