import Image from 'next/image'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDictionaryState } from '@/lib/dictionary'
import { displayNameFromEmail } from '@/lib/display-name'
import { clampCardsPerSession } from '@/lib/session-cap'
import { GroupHead, SettingsCard } from '@/components/form/SettingsCard'
import { ActiveRow, SoonRow, DisplayRow, NavRow } from '@/components/form/Rows'
import SessionSizeStepper from './SessionSizeStepper'
import { AutoplayToggle, SpeedSegmented } from './AudioControls'
import ThemePicker from './ThemePicker'
import AccountActions from './AccountClient'
import pkg from '../../../package.json'

const fr = (n: number) => n.toLocaleString('fr-FR') // 1320 → "1 320"

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''
  const name = displayNameFromEmail(email) ?? 'Toi'

  // Parallel reads: prefs (live controls) · memorized count + lifetime révisions (BOTH from the one
  // getDictionaryState fetch — révisions = Σ review_cards.reps over the collection, since review_logs
  // is empty due to a separate insert bug) · TOTAL collection words (the delete-warning figure).
  const [{ data: profile }, dict, totalWordsRes] = await Promise.all([
    supabase.from('profiles').select('cards_per_session, autoplay_audio, playback_speed').maybeSingle(),
    getDictionaryState(supabase),
    supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .or('origin.eq.manual,discovery_status.eq.promoted'),
  ])

  const cardsPerSession = clampCardsPerSession(profile?.cards_per_session)
  const reviewCount = dict.totalReviews
  // Render falls back to 0, but surface a real read error instead of masking it as a silent 0.
  if (totalWordsRes.error) console.error('[account] totalWords count failed:', totalWordsRes.error.message)
  const totalWords = totalWordsRes.count ?? 0

  return (
    <div className="flex flex-col flex-1 pb-2">
      {/* Profile header — mascot + identity + stats strip */}
      <div className="px-[22px] pt-1.5 pb-2">
        <div className="flex items-center gap-[15px]">
          <div className="w-[66px] h-[66px] rounded-full bg-amber-light border border-line grid place-items-center overflow-hidden shrink-0">
            <Image src="/paco.png" alt="Paco" width={60} height={60} className="mt-1.5 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold tracking-[-0.02em] text-ink leading-[1.05]">{name}</h1>
            <div className="font-sans text-[13px] text-muted mt-1 truncate">{email}</div>
          </div>
        </div>

        {/* Stats strip — two glanceable figures; "mots mémorisés" tinted sage (Mémorisé semantic) */}
        <div className="mt-4 flex bg-card border border-line rounded-[16px] shadow-card overflow-hidden">
          <div className="flex-1 px-[18px] py-[15px]">
            <div className="font-serif text-[27px] font-bold text-ok leading-none tracking-[-0.01em]">
              {fr(dict.memorizedCount)}
            </div>
            <div className="font-sans text-[12.5px] text-muted mt-1.5">mots mémorisés</div>
          </div>
          <div className="w-px bg-border-soft" />
          <div className="flex-1 px-[18px] py-[15px]">
            <div className="font-serif text-[27px] font-bold text-ink leading-none tracking-[-0.01em]">
              {fr(reviewCount)}
            </div>
            <div className="font-sans text-[12.5px] text-muted mt-1.5">révisions</div>
          </div>
        </div>
      </div>

      {/* Apprentissage */}
      <div className="h-[22px]" />
      <GroupHead>Apprentissage</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label="Cartes par session"
          help="Nombre de cartes par révision."
          control={<SessionSizeStepper initialValue={cardsPerSession} />}
        />
        <SoonRow label="Nouvelles cartes / jour" help="Limite d'introduction quotidienne." />
        <SoonRow label="Objectif de rétention" help="Cible de mémorisation visée." />
        <SoonRow label="Révisions d'entraînement" help="Réviser hors planning, sans impact." />
        <SoonRow label="Mots difficiles" help="Séance ciblée sur les mots qui résistent." />
      </SettingsCard>

      {/* Audio */}
      <div className="h-[22px]" />
      <GroupHead>Audio</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label="Lecture auto à la révélation"
          help="Prononce le mot quand la réponse s'affiche."
          control={<AutoplayToggle />}
        />
        <ActiveRow label="Vitesse de lecture" control={<SpeedSegmented />} />
      </SettingsCard>

      {/* Préférences (all BIENTÔT) */}
      <div className="h-[22px]" />
      <GroupHead>Préférences</GroupHead>
      <SettingsCard>
        <SoonRow first label="Langue de l'interface" help="Français · Español" />
        <SoonRow label="Variante d'espagnol" help="Espagne · Amérique latine" />
        <ThemePicker />
        <SoonRow label="Thèmes Discovery" help="Centres d'intérêt pour la découverte." />
      </SettingsCard>

      {/* Notifications (BIENTÔT) */}
      <div className="h-[22px]" />
      <GroupHead>Notifications</GroupHead>
      <SettingsCard>
        <SoonRow first label="Rappel quotidien de révision" help="Une notification à l'heure choisie." />
      </SettingsCard>

      {/* Compte */}
      <div className="h-[22px]" />
      <GroupHead>Compte</GroupHead>
      <SettingsCard>
        <DisplayRow first icon={Mail} label="E-mail" value={email} />
        <NavRow label="Changer le mot de passe" href="/account/password" />
        <SoonRow label="Exporter mes données" help="Télécharger tes mots au format CSV." />
      </SettingsCard>
      {/* Se déconnecter (secondary) + Supprimer mon compte (destructive) — buttons below the card */}
      <AccountActions totalWords={totalWords} />

      {/* À propos / Support */}
      <div className="h-[22px]" />
      <GroupHead>À propos / Support</GroupHead>
      <SettingsCard>
        <NavRow first label="Envoyer un retour / signaler un bug" href="mailto:contact@paco.app?subject=Retour%20Paco" />
        <DisplayRow label="Version" value={`${pkg.version} (pré-bêta)`} />
        {/* F2: kept live (shipped /legal pages), re-skinned — NOT demoted to BIENTÔT. Both pages
            preserved as two rows rather than the mockup's single inert "Mentions légales". */}
        <NavRow label="Politique de confidentialité" href="/legal/privacy" />
        <NavRow label="Conditions d'utilisation" href="/legal/terms" />
      </SettingsCard>

      {/* Footer — sleeping Paco */}
      <div className="h-7" />
      <div className="flex flex-col items-center gap-1.5 px-[22px] pb-7 opacity-70">
        <Image src="/paco-durmiendo.png" alt="" width={90} height={90} className="object-contain" />
        <div className="font-sans text-[11.5px] text-faint tracking-[0.04em]">Paco · pré-bêta · juin 2026</div>
      </div>
    </div>
  )
}
