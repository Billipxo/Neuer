import type { Household, HouseholdMember, JoinStatus } from '../types'

/** Unter diesem Schlüssel merkt sich die App eine Einladung, bis Anmeldung und Einrichtung durch sind */
export const PENDING_INVITE_KEY = 'teller-einladung'

/** Eingetippten Einladungscode vereinheitlichen (wie die Datenbank): Großbuchstaben, ohne Trennzeichen, O→0, I/L→1 */
export function normalizeInviteCode(input: string): string {
  const c = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  return c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c
}

export function isInviteCode(input: string): boolean {
  return /^[0-9A-F]{5}-[0-9A-F]{5}$/.test(normalizeInviteCode(input))
}

/** Code aus einer Eingabe lesen – eingetippt oder als ganzer Einladungslink eingefügt */
export function codeFromInput(input: string): string {
  const fromLink = /beitreten\/([0-9A-Za-z-]+)/.exec(input)
  return normalizeInviteCode(fromLink ? fromLink[1] : input)
}

/** Code aus dem Pfad eines Einladungslinks (/beitreten/XXXXX-XXXXX), sonst null */
export function inviteCodeFromPath(pathname: string): string | null {
  const m = /^\/beitreten\/([^/]+)\/?$/.exec(pathname)
  if (!m) return null
  const code = normalizeInviteCode(decodeURIComponent(m[1]))
  return isInviteCode(code) ? code : null
}

export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/beitreten/${code}`
}

/** Text der Einladung zum Verschicken */
export function inviteText(household: Pick<Household, 'name' | 'invite_code'>, link: string): string {
  return [
    `Komm in unseren Haushalt „${household.name}“ bei Teller – dann planen wir das Essen gemeinsam und teilen uns die Einkaufsliste.`,
    '',
    link,
    '',
    `Oder in der App unter Profil → Gemeinsamer Haushalt diesen Code eingeben: ${household.invite_code}`,
  ].join('\n')
}

export const JOIN_MESSAGES: Record<Exclude<JoinStatus, 'joined'>, string> = {
  not_found: 'Diesen Code gibt es nicht (mehr). Bitte prüfen oder eine neue Einladung schicken lassen.',
  too_many_attempts: 'Zu viele Versuche. Bitte in einer Stunde noch einmal probieren.',
  already_member: 'Du bist bereits in einem Haushalt. Verlasse ihn zuerst, um einem anderen beizutreten.',
  full: 'Dieser Haushalt hat schon die Höchstzahl von acht Mitgliedern.',
}

/** Anzeigename eines Mitglieds; ohne eingetragenen Namen „Mitglied“ */
export function displayName(member: Pick<HouseholdMember, 'display_name'> | undefined | null): string {
  return member?.display_name.trim() || 'Mitglied'
}

export function findMember(household: Household | null | undefined, userId: string | null | undefined): HouseholdMember | undefined {
  return userId ? household?.members.find((m) => m.user_id === userId) : undefined
}

/** „von Anna“ für Einträge anderer Mitglieder – für eigene Einträge oder Unbekannte null */
export function authorLabel(household: Household | null | undefined, authorId: string | null | undefined, myId: string | null | undefined): string | null {
  if (!household || !authorId || authorId === myId) return null
  const member = findMember(household, authorId)
  return member ? `von ${displayName(member)}` : null
}

/** Die anderen Mitglieder als Aufzählung: „Ben“, „Ben und Cem“, „Ben, Cem und Dana“ */
export function othersLabel(household: Household, myId: string | null | undefined): string {
  const names = household.members.filter((m) => m.user_id !== myId).map(displayName)
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`
}

/** Kurze Zeile zur Lage des Haushalts, z. B. für Planer und Einkaufsliste */
export function sharedHint(household: Household, myId: string | null | undefined): string {
  const others = othersLabel(household, myId)
  return others ? `Gemeinsam mit ${others}` : 'Gemeinsamer Haushalt – noch ohne weitere Mitglieder'
}

/** Rechnet Plan-Portionen (pro Person) auf alle am Tisch hoch – für die Einkaufsliste */
export function forAllEaters<T extends { servings: number }>(items: T[], eaters: number): T[] {
  const factor = Math.max(1, Math.round(eaters))
  return factor === 1 ? items : items.map((i) => ({ ...i, servings: i.servings * factor }))
}
