import { codeToHtml, createCssVariablesTheme, type BundledLanguage } from 'shiki'

const theme = createCssVariablesTheme({
  name: 'mccor',
  variablePrefix: '--shiki-',
  fontStyle: true,
})

export async function highlight(code: string, lang: string): Promise<string> {
  return codeToHtml(code, { lang: lang as BundledLanguage, theme })
}
