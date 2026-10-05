import type { NavItem } from './types'

export const nav: readonly NavItem[] = [
  { label: 'Services', href: '/services/' },
  { label: 'Process', href: '/process/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
]

export const footerNav: readonly NavItem[] = [
  ...nav,
  { label: 'Careers', href: '/careers/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
]
