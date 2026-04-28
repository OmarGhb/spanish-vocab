export default function IdiomCardPlaceholder() {
  return (
    <div className="bg-card rounded-card shadow-card overflow-hidden">
      {/* Placeholder image block — real image in M2.3 */}
      <div className="w-full aspect-video bg-tint flex items-center justify-center">
        <span className="text-accent/30 text-4xl select-none">¿</span>
      </div>

      <div className="p-5 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-muted">Le saviez-vous ?</p>
        <p className="font-serif text-base text-ink leading-relaxed">
          Bientôt : 50 expressions espagnoles à découvrir pendant le chargement de chaque mot.
        </p>
      </div>
    </div>
  )
}
