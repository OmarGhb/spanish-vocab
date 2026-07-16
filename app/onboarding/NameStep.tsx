import Image from 'next/image'
import Field from '@/components/form/Field'

// Prénom capture (onb-flow.jsx `NameCapture`) — skippable; feeds the greeting. Controlled by the flow
// (the value persists to profiles.display_name on Continue). French scaffolding.
export default function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="text-center mb-[26px]">
        <Image src="/paco.png" alt="Paco" width={96} height={96} className="object-contain mx-auto mb-2" />
        <h1 className="font-serif text-[27px] font-bold tracking-[-0.02em] text-ink">
          Comment je devrais t&apos;appeler&nbsp;?
        </h1>
        <p className="mt-[11px] mx-auto max-w-[290px] font-sans text-[14px] leading-[1.55] text-muted">
          Juste ton prénom, pour que Paco te salue comme il faut.
        </p>
      </div>
      <Field label="Ton prénom" value={value} onChange={onChange} placeholder="Léa" />
      <p className="mt-3.5 text-center font-sans text-[12.5px] text-faint">
        Tu peux passer — Paco devinera à partir de ton e-mail.
      </p>
    </div>
  )
}
