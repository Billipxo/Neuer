import { describe, expect, it } from 'vitest'
import type { Household } from '../types'
import {
  authorLabel,
  codeFromInput,
  forAllEaters,
  inviteCodeFromPath,
  inviteLink,
  inviteText,
  isInviteCode,
  normalizeInviteCode,
  othersLabel,
  sharedHint,
} from './household'

const household: Household = {
  id: 'h1',
  name: 'WG Sonnenallee',
  invite_code: 'A1B2C-3D4E5',
  eaters: 3,
  created_at: '2026-11-13T10:00:00Z',
  members: [
    { user_id: 'anna', display_name: 'Anna', role: 'owner', joined_at: '2026-11-13T10:00:00Z' },
    { user_id: 'ben', display_name: 'Ben', role: 'member', joined_at: '2026-11-13T11:00:00Z' },
    { user_id: 'cem', display_name: '  ', role: 'member', joined_at: '2026-11-13T12:00:00Z' },
  ],
}

describe('Einladungscode', () => {
  it('vereinheitlicht Eingaben wie die Datenbank', () => {
    expect(normalizeInviteCode(' a1b2c 3d4e5 ')).toBe('A1B2C-3D4E5')
    expect(normalizeInviteCode('a1b2c3d4e5')).toBe('A1B2C-3D4E5')
    // O statt 0, I oder L statt 1 – beim Abtippen leicht verwechselt
    expect(normalizeInviteCode('AOBIC-LD4E5')).toBe('A0B1C-1D4E5')
    expect(normalizeInviteCode('abc')).toBe('ABC')
  })

  it('erkennt gültige Codes', () => {
    expect(isInviteCode('a1b2c-3d4e5')).toBe(true)
    expect(isInviteCode('A1B2C-3D4E')).toBe(false)
    expect(isInviteCode('G1B2C-3D4E5')).toBe(false)
    expect(isInviteCode('')).toBe(false)
  })

  it('liest den Code aus eingefügten Links und aus dem Pfad', () => {
    expect(codeFromInput('https://teller.example/beitreten/a1b2c-3d4e5')).toBe('A1B2C-3D4E5')
    expect(codeFromInput('a1b2c-3d4e5')).toBe('A1B2C-3D4E5')
    expect(inviteCodeFromPath('/beitreten/a1b2c-3d4e5')).toBe('A1B2C-3D4E5')
    expect(inviteCodeFromPath('/beitreten/A1B2C-3D4E5/')).toBe('A1B2C-3D4E5')
    expect(inviteCodeFromPath('/beitreten/kaputt')).toBeNull()
    expect(inviteCodeFromPath('/planer')).toBeNull()
  })

  it('baut Link und Einladungstext', () => {
    const link = inviteLink('https://teller.example/', household.invite_code)
    expect(link).toBe('https://teller.example/beitreten/A1B2C-3D4E5')
    const text = inviteText(household, link)
    expect(text).toContain('„WG Sonnenallee“')
    expect(text).toContain(link)
    expect(text).toContain('A1B2C-3D4E5')
  })
})

describe('Mitglieder', () => {
  it('nennt bei fremden Einträgen, von wem sie stammen', () => {
    expect(authorLabel(household, 'ben', 'anna')).toBe('von Ben')
    expect(authorLabel(household, 'anna', 'anna')).toBeNull()
    // ohne eingetragenen Namen
    expect(authorLabel(household, 'cem', 'anna')).toBe('von Mitglied')
    // nicht (mehr) im Haushalt
    expect(authorLabel(household, 'dana', 'anna')).toBeNull()
    expect(authorLabel(null, 'ben', 'anna')).toBeNull()
  })

  it('zählt die anderen auf', () => {
    expect(othersLabel(household, 'anna')).toBe('Ben und Mitglied')
    expect(othersLabel({ ...household, members: household.members.slice(0, 2) }, 'anna')).toBe('Ben')
    expect(sharedHint(household, 'ben')).toBe('Gemeinsam mit Anna und Mitglied')
    expect(sharedHint({ ...household, members: household.members.slice(0, 1) }, 'anna')).toMatch(/noch ohne weitere Mitglieder/)
  })
})

describe('Einkauf für alle am Tisch', () => {
  it('rechnet Portionen pro Person hoch', () => {
    const items = [{ title: 'Curry', servings: 1 }, { title: 'Suppe', servings: 1.5 }]
    expect(forAllEaters(items, 3)).toEqual([{ title: 'Curry', servings: 3 }, { title: 'Suppe', servings: 4.5 }])
    expect(forAllEaters(items, 1)).toBe(items)
    expect(forAllEaters(items, 0)).toBe(items)
  })
})
