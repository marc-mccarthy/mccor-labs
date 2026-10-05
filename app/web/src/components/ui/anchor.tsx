interface AnchorProps {
  id: string
}

export function Anchor({ id }: AnchorProps) {
  return <div id={id} aria-hidden="true" className="scroll-mt-16" />
}
