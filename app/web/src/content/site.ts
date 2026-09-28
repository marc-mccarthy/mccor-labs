export const site = {
  name: 'McCor Labs',
  tagline:
    'A small senior team building websites, applications and AI features for companies that need them to actually work.',
  // Booking URL now lives in NEXT_PUBLIC_BOOKING_URL — see src/lib/env.ts.
  // The admin mailbox from infra/settings.auto.tfvars.
  contactEmail: 'marcm@mccorlabs.com',
  budgetOptions: ['Under $10k', '$10k – $25k', '$25k – $50k', '$50k+', 'Not sure yet'],
} as const
