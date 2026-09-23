import Image from 'next/image'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDictionaryState } from '@/lib/dictionary'
import { resolveDisplayName } from '@/lib/display-name'
import { clampCardsPerSession } from '@/lib/session-cap'
import { GroupHead, SettingsCard } from '@/components/form/SettingsCard'
import { ActiveRow, SoonRow, DisplayRow, NavRow } from '@/components/form/Rows'
import { coerceGlossPolicy, coerceSourceLocale, resolveChrome, ACCOUNT_CHROME, type ChromeCtx } from '@/lib/immersion'
import SessionSizeStepper from './SessionSizeStepper'
import { AutoplayToggle, SpeedSegmented } from './AudioControls'
import ThemePicker from './ThemePicker'
import ImmersionModePicker from './ImmersionModePicker'
import ReplayIntroRow from './ReplayIntroRow'
import AccountActions from './AccountClient'
import pkg from '../../../package.json'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? ''

  // Parallel reads: prefs (live controls) · memorized count + lifetime révisions (BOTH from the one
  // getDictionaryState fetch — révisions = Σ review_cards.reps over the collection, since review_logs
  // is empty due to a separate insert bug) · TOTAL collection words (the delete-warning figure).
  const [{ data: profile }, dict, totalWordsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('cards_per_session, autoplay_audio, playback_speed, source_locale, gloss_policy, display_name')
      .maybeSingle(),
    getDictionaryState(supabase),
    supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .or('origin.eq.manual,discovery_status.eq.promoted'),
  ])

  const ctx: ChromeCtx = {
    locale: coerceSourceLocale(profile?.source_locale),
    policy: coerceGlossPolicy(profile?.gloss_policy),
  }
  const name = resolveDisplayName(profile?.display_name, email) ?? 'Toi'
  const num = (n: number) => n.toLocaleString(ctx.policy === 'visible' ? 'fr-FR' : 'es-ES') // 1320 → "1 320"
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
            <div className="font-sans text-[12.5px] text-muted mt-1.5">{resolveChrome(ACCOUNT_CHROME.statsMemorized, ctx)}</div>
          </div>
          <div className="w-px bg-border-soft" />
          <div className="flex-1 px-[18px] py-[15px]">
            <div className="font-serif text-[27px] font-bold text-ink leading-none tracking-[-0.01em]">
              {num(reviewCount)}
            </div>
            <div className="font-sans text-[12.5px] text-muted mt-1.5">{resolveChrome(ACCOUNT_CHROME.statsReviews, ctx)}</div>
          </div>
        </div>
      </div>

      {/* Apprentissage */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghLearning, ctx)}</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label={resolveChrome(ACCOUNT_CHROME.cardsPerSession, ctx)}
          help={resolveChrome(ACCOUNT_CHROME.cardsPerSessionHelp, ctx)}
          control={<SessionSizeStepper initialValue={cardsPerSession} />}
        />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.newCardsDay, ctx)} help={resolveChrome(ACCOUNT_CHROME.newCardsDayHelp, ctx)} />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.retentionGoal, ctx)} help={resolveChrome(ACCOUNT_CHROME.retentionGoalHelp, ctx)} />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.practiceReviews, ctx)} help={resolveChrome(ACCOUNT_CHROME.practiceReviewsHelp, ctx)} />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.hardWords, ctx)} help={resolveChrome(ACCOUNT_CHROME.hardWordsHelp, ctx)} />
      </SettingsCard>

      {/* Audio */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAudio, ctx)}</GroupHead>
      <SettingsCard>
        <ActiveRow
          first
          label={resolveChrome(ACCOUNT_CHROME.autoplay, ctx)}
          help={resolveChrome(ACCOUNT_CHROME.autoplayHelp, ctx)}
          control={<AutoplayToggle />}
        />
        <ActiveRow label={resolveChrome(ACCOUNT_CHROME.playbackSpeed, ctx)} control={<SpeedSegmented />} />
      </SettingsCard>

      {/* Préférences — Mode d'immersion (M6.1a) + Thème actifs; the rest BIENTÔT. The
          ImmersionModePicker renders in the SOURCE LOCALE regardless of policy (the meta-control over
          that choice + the escape hatch out of `hidden`) — it pins policy to 'visible' itself. */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghPreferences, ctx)}</GroupHead>
      <SettingsCard>
        <ImmersionModePicker first />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.spanishVariant, ctx)} help={resolveChrome(ACCOUNT_CHROME.spanishVariantHelp, ctx)} />
        <ThemePicker />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.discoveryThemes, ctx)} help={resolveChrome(ACCOUNT_CHROME.discoveryThemesHelp, ctx)} />
      </SettingsCard>

      {/* Notifications (BIENTÔT) */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghNotifications, ctx)}</GroupHead>
      <SettingsCard>
        <SoonRow first ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.dailyReminder, ctx)} help={resolveChrome(ACCOUNT_CHROME.dailyReminderHelp, ctx)} />
      </SettingsCard>

      {/* Compte */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAccount, ctx)}</GroupHead>
      <SettingsCard>
        <DisplayRow first icon={Mail} label={resolveChrome(ACCOUNT_CHROME.email, ctx)} value={email} />
        <NavRow label={resolveChrome(ACCOUNT_CHROME.changePassword, ctx)} href="/account/password" />
        <SoonRow ctx={ctx} label={resolveChrome(ACCOUNT_CHROME.exportData, ctx)} help={resolveChrome(ACCOUNT_CHROME.exportDataHelp, ctx)} />
      </SettingsCard>
      {/* Se déconnecter (secondary) + Supprimer mon compte (destructive) — buttons below the card */}
      <AccountActions totalWords={totalWords} />

      {/* À propos / Support */}
      <div className="h-[22px]" />
      <GroupHead>{resolveChrome(ACCOUNT_CHROME.ghAbout, ctx)}</GroupHead>
      <SettingsCard>
        <NavRow first label={resolveChrome(ACCOUNT_CHROME.sendFeedback, ctx)} href="mailto:contact@paco.app?subject=Retour%20Paco" />
        {/* Replay the first-run onboarding (M6.2a). Intentionally FR (launches the French-only flow). */}
        <ReplayIntroRow />
        <DisplayRow label={resolveChrome(ACCOUNT_CHROME.version, ctx)} value={`${pkg.version} (${resolveChrome(ACCOUNT_CHROME.preBeta, ctx)})`} />
        {/* F2: kept live (shipped /legal pages), re-skinned — NOT demoted to BIENTÔT. Both pages
            preserved as two rows rather than the mockup's single inert "Mentions légales". */}
        <NavRow label={resolveChrome(ACCOUNT_CHROME.privacyPolicy, ctx)} href="/legal/privacy" />
        <NavRow label={resolveChrome(ACCOUNT_CHROME.terms, ctx)} href="/legal/terms" />
      </SettingsCard>

      {/* Footer — sleeping Paco */}
      <div className="h-7" />
      <div className="flex flex-col items-center gap-1.5 px-[22px] pb-7 opacity-70">
        <Image src="/paco-durmiendo.png" alt="" width={90} height={90} className="object-contain" />
        <div className="font-sans text-[11.5px] text-faint tracking-[0.04em]">{resolveChrome(ACCOUNT_CHROME.footer, ctx)}</div>
      </div>
    </div>
  )
}
