// Pure voice-selection for the Web-Speech fallback (Commit B). Extracted from AudioButton so the
// gate logic is unit-testable without a DOM: given the device's installed voices, return a SPANISH
// voice if one exists, else undefined. A caller that gets undefined must NOT speak — reading Spanish
// text with the device-default (English) voice is the wrong-accent bug this closes.
//
// Typed structurally (not against the DOM lib) so this stays importable in a plain node test env.
export type VoiceLike = { lang: string }

export function pickSpanishVoice<V extends VoiceLike>(voices: readonly V[]): V | undefined {
  return voices.find((v) => v.lang === 'es-ES') ?? voices.find((v) => v.lang.startsWith('es'))
}
