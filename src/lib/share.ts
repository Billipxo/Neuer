export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Text über das Teilen-Menü des Geräts verschicken (Messenger, E-Mail …).
 * Wo es kein Teilen-Menü gibt (viele Desktop-Browser), landet der Text in der Zwischenablage.
 */
export async function shareText(input: { title: string; text: string }): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(input)
      return 'shared'
    }
    await navigator.clipboard.writeText(input.text)
    return 'copied'
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

/** Nur kopieren – z. B. für einen Code */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
