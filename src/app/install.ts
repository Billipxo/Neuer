/**
 * Teller als App auf dem Handy: Chrome/Edge/Samsung Internet (Android, Desktop) bieten über `beforeinstallprompt` einen
 * eigenen Installieren-Dialog an; Safari auf iPhone/iPad nicht – dort hilft eine Anleitung („Teilen → Zum Home-Bildschirm“).
 */
import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Früh aufrufen (beim Start), damit das Angebot des Browsers nicht verloren geht */
export function captureInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    // Den Browser-Hinweis zurückhalten – die App bietet „Installieren“ selbst an
    e.preventDefault()
    deferred = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export type InstallPlatform = 'ios' | 'android' | 'other'

export function installPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  // iPadOS meldet sich als Mac – erkennbar an der Touch-Bedienung
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(userAgent)) return 'android'
  return 'other'
}

/** Läuft Teller schon als installierte App (eigenes Fenster, ohne Adressleiste)? */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
}

export function useInstall() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const l = () => rerender((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return {
    installed: isInstalled(),
    platform: installPlatform(navigator.userAgent, navigator.maxTouchPoints),
    /** Der Browser bietet einen eigenen Installieren-Dialog an */
    canPrompt: !!deferred,
    async prompt(): Promise<boolean> {
      const event = deferred
      if (!event) return false
      await event.prompt()
      const { outcome } = await event.userChoice
      deferred = null
      notify()
      return outcome === 'accepted'
    },
  }
}
