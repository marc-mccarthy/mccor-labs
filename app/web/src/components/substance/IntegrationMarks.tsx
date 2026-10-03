interface Mark {
  name: string
  src: string
}

interface IntegrationMarksProps {
  heading: string
  marks: readonly Mark[]
}

export function IntegrationMarks({ heading, marks }: IntegrationMarksProps) {
  return (
    <div>
      <h2 className="font-mono text-sm text-muted">{heading}</h2>
      <ul className="mt-4 flex flex-wrap gap-6">
        {marks.map((mark) => (
          <li key={mark.name}>
            <img src={mark.src} alt={mark.name} className="h-8 w-auto" />
          </li>
        ))}
      </ul>
    </div>
  )
}
