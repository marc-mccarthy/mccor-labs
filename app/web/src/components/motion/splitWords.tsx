import type { CSSProperties, ReactNode } from 'react'

export function splitWords(text: string): ReactNode {
  let index = 0
  return text.split(/(\s+)/).map((part, position) => {
    if (part === '' || /^\s+$/.test(part)) return part
    const style = { '--i': index++ } as CSSProperties
    return (
      <span key={position} className="inline-block overflow-clip align-bottom">
        <span data-word="" style={style} className="inline-block">
          {part}
        </span>
      </span>
    )
  })
}
