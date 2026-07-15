import Image from 'next/image'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDictionaryState } from '@/lib/dictionary'
import { displayNameFromEmail } from '@/lib/display-name'
import { clampCardsPerSession } from '@/lib/session-cap'
import { GroupHead, SettingsCard } from '@/components/form/SettingsCard'
import { ActiveRow, SoonRow, DisplayRow, NavRow } from '@/components/form/Rows'
import { coerceImmersionMode, resolveChrome, ACCOUNT_CHROME } from '@/lib/immersion'
import SessionSizeStepper from './SessionSizeStepper'
import { AutoplayToggle, SpeedSegmented } from './AudioControls'
import ThemePicker from './ThemePicker'
import ImmersionModePicker from './ImmersionModePicker'
import AccountActions from './AccountClient'
import pkg from '../../../package.json'

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
    supabase.from('profiles').select('cards_per_session, autoplay_audio, playback_speed, immersion_mode').maybeSingle(),
    getDictionaryState(supabase),
    supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .or('origin.eq.manual,discovery_status.eq.promoted'),
  ])

  const mode = coerceImmersionMode(profile?.immersion_mode)
  const num = (n: number) => n.toLocaleString(mode === 'fr_es' ? 'fr-FR' : 'es-ES') // 1320 → "1 320"
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
              {num(dict.memorizedCount)}
            </div>
            <div className="font-sans text-[12.5px] text-muted mt-1.5">{resolveChrome(ACCOUNT_CHROME.statsMemorized, mode)}</div>
          </div>
          <div className="w-px bg-border-soft" />
          <div className="flex-1 px-[18px] py-[15px]">
            <div className="font-serif text-[27px] font-bold text-ink leading-none tracking-[-0.01em]">
              {num(reviewCount)}
            </div>
            <div className="font-sans text-[12.5px] text-muted mt-1.5">{resolveChrome(ACCOUNT_CHROME.statsReviews, mode)}</div>
          </div>
        </div>
      </div>

      {/* Apprentissage */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghLearning, mode)}</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label={resolveChrome(ACCOUNT_CHROME.cardsPerSession, mode)}
          help={resolveChrome(ACCOUNT_CHROME.cardsPerSessionHelp, mode)}
          control={<SessionSizeStepper initialValue={cardsPerSession} />}
        />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.newCardsDay, mode)} help={resolveChrome(ACCOUNT_CHROME.newCardsDayHelp, mode)} />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.retentionGoal, mode)} help={resolveChrome(ACCOUNT_CHROME.retentionGoalHelp, mode)} />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.practiceReviews, mode)} help={resolveChrome(ACCOUNT_CHROME.practiceReviewsHelp, mode)} />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.hardWords, mode)} help={resolveChrome(ACCOUNT_CHROME.hardWordsHelp, mode)} />
      </SettingsCard>

      {/* Audio */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAudio, mode)}</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label={resolveChrome(ACCOUNT_CHROME.autoplay, mode)}
          help={resolveChrome(ACCOUNT_CHROME.autoplayHelp, mode)}
          control={<AutoplayToggle />}
        />
        <ActiveRow label={resolveChrome(ACCOUNT_CHROME.playbackSpeed, mode)} control={<SpeedSegmented />} />
      </SettingsCard>

      {/* Préférences — Mode d'immersion (M6.1a) + Thème actifs; the rest BIENTÔT. The
          ImmersionModePicker itself STAYS FRENCH by design (the meta-control about the FR/ES choice +
          the escape hatch out of `totale`) — do not make it mode-aware. */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghPreferences, mode)}</GroupHead>
      <SettingsCard>
        <ImmersionModePicker first />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.spanishVariant, mode)} help={resolveChrome(ACCOUNT_CHROME.spanishVariantHelp, mode)} />
        <ThemePicker />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.discoveryThemes, mode)} help={resolveChrome(ACCOUNT_CHROME.discoveryThemesHelp, mode)} />
      </SettingsCard>

      {/* Notifications (BIENTÔT) */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghNotifications, mode)}</GroupHead>
      <SettingsCard>
        <SoonRow first mode={mode} label={resolveChrome(ACCOUNT_CHROME.dailyReminder, mode)} help={resolveChrome(ACCOUNT_CHROME.dailyReminderHelp, mode)} />
      </SettingsCard>

      {/* Compte */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAccount, mode)}</GroupHead>
      <SettingsCard>
        <DisplayRow first icon={Mail} label={resolveChrome(ACCOUNT_CHROME.email, mode)} value={email} />
        <NavRow label={resolveChrome(ACCOUNT_CHROME.changePassword, mode)} href="/account/password" />
        <SoonRow mode={mode} label={resolveChrome(ACCOUNT_CHROME.exportData, mode)} help={resolveChrome(ACCOUNT_CHROME.exportDataHelp, mode)} />
      </SettingsCard>
      {/* Se déconnecter (secondary) + Supprimer mon compte (destructive) — buttons below the card */}
      <AccountActions totalWords={totalWords} />

      {/* À propos / Support */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAbout, mode)}</GroupHead>
      <SettingsCard>
        <NavRow first label={resolveChrome(ACCOUNT_CHROME.sendFeedback, mode)} href="mailto:contact@paco.app?subject=Retour%20Paco" />
        <DisplayRow label={resolveChrome(ACCOUNT_CHROME.version, mode)} value={`${pkg.version} (${resolveChrome(ACCOUNT_CHROME.preBeta, mode)})`} />
        {/* F2: kept live (shipped /legal pages), re-skinned — NOT demoted to BIENTÔT. Both pages
            preserved as two rows rather than the mockup's single inert "Mentions légales". */}
        <NavRow label={resolveChrome(ACCOUNT_CHROME.privacyPolicy, mode)} href="/legal/privacy" />
        <NavRow label={resolveChrome(ACCOUNT_CHROME.terms, mode)} href="/legal/terms" />
      </SettingsCard>

      {/* Footer — sleeping Paco */}
      <div className="h-7" />
      <div className="flex flex-col items-center gap-1.5 px-[22px] pb-7 opacity-70">
        <Image src="/paco-durmiendo.png" alt="" width={90} height={90} className="object-contain" />
        <div className="font-sans text-[11.5px] text-faint tracking-[0.04em]">{resolveChrome(ACCOUNT_CHROME.footer, mode)}</div>
      </div>
    </div>
  )
}
