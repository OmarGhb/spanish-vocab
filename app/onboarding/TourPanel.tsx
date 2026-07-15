import type { ReactNode } from 'react'

// A tour body: small "Étape …" eyebrow + a big Lora step name over the real app surface, with a
// richer explanation below. Serves both the 5 journey steps and the ¡Uy! mistake deep-look (which
// passes a shorter, larger-wrapping title). Body only — the flow owns the shell + footer CTA.
export default function TourPanel({
  eyebrow,
  title,
  titleClassName = 'text-[32px] leading-none',
  surface,
  body,
}: {
  eyebrow: string
  title: string
  titleClassName?: string
  surface: ReactNode
  body: string
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center">
      <div className="text-center mb-4">
        <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">{eyebrow}</span>
        <h1 className={`mt-2 font-serif font-bold tracking-[-0.02em] text-ink ${titleClassName}`}>{title}</h1>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-[322px]">{surface}</div>
      </div>
      <p className="mt-[18px] mx-auto font-sans text-[14.5px] leading-[1.6] text-muted max-w-[318px] text-center">
        {body}
      </p>
    </div>
  )
}
