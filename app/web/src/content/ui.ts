/** Strings a visitor reads, including accessible names. Copy lives in
 *  content; structural ARIA attributes stay inline in components. */
export const ui = {
  skipToContent: 'Skip to content',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  bookCall: 'Book a 30-minute call',
  contactFallback: 'Email us directly',
  formSubmit: 'Send message',
  formSending: 'Sending…',
  formSuccess: 'Thanks — we will reply within one working day.',
  formErrorValidation:
    'Something was wrong with that submission. Please check and retry.',
  formErrorRateLimit: 'Too many attempts. Please wait a minute and try again.',
  formErrorServer: 'We could not send that. Please email us instead.',
  footerRights: 'All rights reserved.',
} as const
