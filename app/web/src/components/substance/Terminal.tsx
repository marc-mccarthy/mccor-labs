export interface TerminalLine {
  kind: 'command' | 'output'
  text: string
}

interface TerminalProps {
  lines: readonly TerminalLine[]
}

export function Terminal({ lines }: TerminalProps) {
  return (
    <div className="rounded-md bg-surface p-4 font-mono text-sm text-text">
      {lines.map((line, index) => (
        <p key={index}>
          {line.kind === 'command' ? <span aria-hidden="true">{'$ '}</span> : null}
          <span>{line.text}</span>
        </p>
      ))}
    </div>
  )
}
