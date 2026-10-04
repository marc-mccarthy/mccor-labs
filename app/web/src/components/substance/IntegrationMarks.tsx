interface IntegrationMarksProps {
  heading: string
  tools: readonly string[]
}

export function IntegrationMarks({ heading, tools }: IntegrationMarksProps) {
  return (
    <div>
      <h2 className="font-mono text-sm text-muted">{heading}</h2>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-text">
        {tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
    </div>
  )
}
