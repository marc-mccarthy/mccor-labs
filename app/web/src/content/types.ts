export interface NavItem {
  label: string
  href: string
}

export interface Capability {
  slug: string
  title: string
  summary: string
  substance: { kind: 'code' | 'diagram'; ref: string }
}

export interface Service {
  slug: string
  title: string
  summary: string
  detail: string
  outcome: string
  deliverables: readonly string[]
  capabilities?: readonly Capability[]
}

export interface ProofPoint {
  text: string
}

export interface Role {
  slug: string
  title: string
  level: string
  summary: string
  youWillDo: readonly string[]
  weAreLookingFor: readonly string[]
  applySubject: string
}

export interface TeamMember {
  slug: string
  name: string
  role: string
  bio: string
  email: string
  mediaSlot: string | null
  links?: readonly { label: string; href: string }[]
}

export interface ProcessStage {
  index: number
  title: string
  summary: string
  duration: string
}
