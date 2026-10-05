import { ui } from '@/content/ui'

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
    >
      {ui.skipToContent}
    </a>
  )
}
