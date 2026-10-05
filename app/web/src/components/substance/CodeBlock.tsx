import { highlight } from '@/lib/highlight'

interface CodeBlockProps {
  code: string
  lang: string
  filename?: string
}

export async function CodeBlock({ code, lang, filename }: CodeBlockProps) {
  const html = await highlight(code, lang)

  return (
    <div className="overflow-hidden rounded-md border border-border">
      {filename ? (
        <p className="border-b border-border px-4 py-2 font-mono text-sm text-muted">
          {filename}
        </p>
      ) : null}
      <div
        className="overflow-x-auto text-sm [&>pre]:p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
