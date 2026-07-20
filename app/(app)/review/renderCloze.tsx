import { Fragment } from 'react'
import type React from 'react'
import { BLANK_TOKEN } from '@/lib/blank-definition'

// Render a string that may contain BLANK_TOKEN sentinels, drawing each as a clean underline blank (a
// bottom border under a nbsp) instead of literal underscore glyphs — the serif font spaces underscores
// out into "- - - -". Shared by the cloze example sentence AND the blanked ES/FR definition + gloss
// strings (from blankTargetInDefinition), so both look identical. A string with no sentinel is
// returned verbatim (e.g. a definition where the target didn't appear, or a gloss with no leak). Any
// preserved plural suffix ("_____s") renders as normal text right after the underline.
export function renderCloze(text: string): React.ReactNode {
  const parts = text.split(BLANK_TOKEN)
  if (parts.length === 1) return text
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="border-b-2 border-faint px-6 align-baseline" aria-hidden>
          {' '}
        </span>
      )}
    </Fragment>
  ))
}
