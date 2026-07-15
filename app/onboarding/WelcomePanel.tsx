import Image from 'next/image'

// 1 · Welcome — the one allowed editorial mascot beat (onb-flow.jsx `Welcome`). Lands the
// positioning: Paco accompanies, he doesn't claim to teach. Body only — the flow owns the shell
// (no dots / no back / no skip on this screen) and the "Faire connaissance" footer CTA. Lora title,
// Inter eyebrow + body. French, always.
export default function WelcomePanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <Image src="/paco.png" alt="Paco" width={188} height={188} className="object-contain mb-[18px]" priority />
      <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-accent">¡Hola&nbsp;!</span>
      <h1 className="mt-3 font-serif text-[31px] font-bold tracking-[-0.02em] leading-[1.12] text-ink">
        Moi c&apos;est Paco,
        <br />
        ton compagnon d&apos;espagnol.
      </h1>
      <p className="mt-4 font-sans text-[15px] leading-[1.6] text-muted max-w-[308px]">
        Je ne prétends pas t&apos;apprendre l&apos;espagnol. Je t&apos;accompagne pendant que tu
        l&apos;apprends — en t&apos;aidant à retenir le vocabulaire, en parallèle de tes cours.
      </p>
    </div>
  )
}
