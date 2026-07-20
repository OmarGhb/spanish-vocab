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
        // inline-block (not inline) so the blank wraps to the next line as one unit instead of its
        // side padding overflowing the card at a line end; max-w-full caps it to the container. The
        // &nbsp; (a NON-collapsing space, unlike a plain " " which collapses inside an inline-block)
        // gives the box a real text baseline so the underline sits ON the line — an EMPTY inline-block
        // baselines at its bottom edge and drops the underline. align-baseline lines that baseline up
        // with the surrounding text, matching the mid-sentence cloze look.
        <span className="inline-block max-w-full border-b-2 border-faint px-6 align-baseline" aria-hidden>
          &nbsp;
        </span>
      )}
    </Fragment>
  ))
}
