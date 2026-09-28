import type { NavItem } from './types'

/** Primary header navigation. Trailing slashes match next.config trailingSlash. */
export const nav: readonly NavItem[] = [
  { label: 'Services', href: '/services/' },
  { label: 'Work', href: '/work/' },
  { label: 'Process', href: '/process/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
]

/** Footer navigation, including the routes kept out of the header. */
export const footerNav: readonly NavItem[] = [
  ...nav,
  { label: 'Careers', href: '/careers/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
]
