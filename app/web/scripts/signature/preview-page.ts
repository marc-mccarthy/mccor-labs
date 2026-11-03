import { pathToFileURL } from 'node:url'
import { type DarkMode, applyDarkMode } from './dark-mode'

export type Engine = 'chromium' | 'webkit' | 'firefox'
export type Scheme = 'light' | 'dark'

export interface Client {
  slug: string
  name: string
  engine: Engine
  dark: DarkMode
  canvas: Record<Scheme, string>
}

export const CLIENTS: readonly Client[] = [
  {
    slug: 'gmail-web',
    name: 'Gmail web (Chrome)',
    engine: 'chromium',
    dark: 'none',
    canvas: { light: '#ffffff', dark: '#1f1f1f' },
  },
  {
    slug: 'apple-mail',
    name: 'Apple Mail (macOS, iOS)',
    engine: 'webkit',
    dark: 'none',
    canvas: { light: '#ffffff', dark: '#1e1e1e' },
  },
  {
    slug: 'outlook-com',
    name: 'Outlook.com (Firefox)',
    engine: 'firefox',
    dark: 'partial',
    canvas: { light: '#ffffff', dark: '#292827' },
  },
  {
    slug: 'gmail-android',
    name: 'Gmail app (Android)',
    engine: 'chromium',
    dark: 'partial',
    canvas: { light: '#ffffff', dark: '#202124' },
  },
  {
    slug: 'gmail-ios',
    name: 'Gmail app (iOS)',
    engine: 'webkit',
    dark: 'full',
    canvas: { light: '#ffffff', dark: '#000000' },
  },
  {
    slug: 'outlook-windows',
    name: 'Outlook desktop (Windows)',
    engine: 'chromium',
    dark: 'full',
    canvas: { light: '#ffffff', dark: '#262626' },
  },
]

const DARK_LABEL: Record<DarkMode, string> = {
  none: 'no colour change in dark mode',
  partial: 'partial invert in dark mode',
  full: 'full invert in dark mode',
}

export function rewriteAssets(
  html: string,
  assetBase: string,
  assetsDir: string,
): string {
  const local = pathToFileURL(assetsDir).href.replace(/\/$/, '')
  return html.replaceAll(assetBase, local)
}

export function framePage(signature: string, client: Client, scheme: Scheme): string {
  const canvas = client.canvas[scheme]
  const body = scheme === 'dark' ? applyDarkMode(signature, client.dark) : signature
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:${canvas}"><div id="frame" style="display:inline-block;padding:16px;background:${canvas}">${body}</div></body></html>`
}

export function shotName(client: Client, scheme: Scheme): string {
  return `${client.slug}-${scheme}.png`
}

export interface ReportPalette {
  page: string
  ink: string
  muted: string
}

export function reportPage(
  title: string,
  clients: readonly Client[],
  palette: ReportPalette,
): string {
  const rows = clients
    .map(
      (client) =>
        `<tr><th>${client.name}<small>${client.engine} engine, ${DARK_LABEL[client.dark]}</small></th><td><img src="${shotName(client, 'light')}" alt="${client.name} light"></td><td><img src="${shotName(client, 'dark')}" alt="${client.name} dark"></td></tr>`,
    )
    .join('\n')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="margin:0;padding:24px;background:${palette.page};font-family:-apple-system,Helvetica,Arial,sans-serif;color:${palette.ink}">
<h1 style="font-size:18px;margin:0 0 4px">${title}</h1>
<p style="font-size:12px;margin:0 0 16px;max-width:900px">Light and dark mode per client. Dark mode is simulated from each client's documented behaviour (Litmus dark-mode support chart): no change, partial invert (light backgrounds darken, dark text lightens) or full invert (every colour flips). Images are never recoloured. Outlook on Windows also uses the Word engine, whose layout quirks are not simulated. Confirm a final design with a real test send.</p>
<table style="border-collapse:collapse;font-size:12px">
<tr><th></th><th style="padding:4px 8px">Light</th><th style="padding:4px 8px">Dark</th></tr>
${rows}
</table>
<style>th{text-align:left;vertical-align:middle;padding:8px}th small{display:block;font-weight:400;color:${palette.muted}}td{padding:8px}td img{display:block;width:532px}</style>
</body></html>`
}
