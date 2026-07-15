// Progress-dot rail for the onboarding tour (onb-flow.jsx `Dots`). The active dot widens into a
// pill; past/future dots are equal circles. Purely presentational.
export default function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="presentation">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-[7px] rounded-full transition-all ${
            i === current ? 'w-[22px] bg-accent' : 'w-[7px] bg-line'
          }`}
        />
      ))}
    </div>
  )
}
