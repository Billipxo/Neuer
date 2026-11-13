import { describe, expect, it } from 'vitest'
import { fmtCountdown, ingredientKeywords, ingredientsInStep, parseTimers } from './cooking'
import type { RecipeIngredient } from '../types'
import { RECIPES } from './recipes'

const ing = (name: string): RecipeIngredient => ({ name, amount: 1, unit: 'g', category: 'sonstiges' })

describe('Zeitangaben erkennen', () => {
  it('findet Minuten, Spannen, Stunden und Sekunden', () => {
    expect(parseTimers('Die Kartoffeln 20 Minuten garen.')).toEqual([{ label: '20 Min.', seconds: 1200 }])
    expect(parseTimers('Bei 200 °C 8–10 Minuten garen.')).toEqual([{ label: '8–10 Min.', seconds: 480 }])
    expect(parseTimers('Mindestens 2 Stunden quellen lassen.')).toEqual([{ label: '2 Std.', seconds: 7200 }])
    expect(parseTimers('Wraps 20 Sekunden pro Seite erwärmen.')).toEqual([{ label: '20 Sek.', seconds: 20 }])
    expect(parseTimers('Ca. 1,5 Stunden schmoren.')).toEqual([{ label: '1,5 Std.', seconds: 5400 }])
  })
  it('ignoriert Wiederholungen und Temperaturen', () => {
    expect(parseTimers('Alle 5 Minuten schütteln.')).toEqual([])
    expect(parseTimers('Bei 180 °C backen.')).toEqual([])
    expect(parseTimers('Minuten später 4 Minuten weiterbraten, dann noch einmal 4 Minuten.')).toEqual([{ label: '4 Min.', seconds: 240 }])
  })
  it('findet in fast jedem Rezept mindestens einen Timer', () => {
    const withTimer = RECIPES.filter((r) => r.steps.some((s) => parseTimers(s).length > 0))
    expect(withTimer.length / RECIPES.length).toBeGreaterThan(0.7)
  })
})

describe('Countdown', () => {
  it('formatiert Minuten und Stunden', () => {
    expect(fmtCountdown(65_000)).toBe('1:05')
    expect(fmtCountdown(3_725_000)).toBe('1:02:05')
    expect(fmtCountdown(-5)).toBe('0:00')
    expect(fmtCountdown(500)).toBe('0:01')
  })
})

describe('Zutaten im Schritt', () => {
  it('erzeugt sinnvolle Suchbegriffe', () => {
    expect(ingredientKeywords('Gemüsebrühe')).toContain('bruhe')
    expect(ingredientKeywords('Eier')).toContain('ei')
    expect(ingredientKeywords('Kartoffeln')).toContain('kartoffel')
    expect(ingredientsInStep('Das Hähnchen anbraten.', [ing('Hähnchenbrust')])).toEqual([0])
    expect(ingredientKeywords('rote Zwiebel')).not.toContain('rote')
  })
  it('findet erwähnte Zutaten', () => {
    const list = [ing('Zwiebel'), ing('Gemüsebrühe'), ing('Eier'), ing('Olivenöl'), ing('Kartoffeln')]
    expect(ingredientsInStep('Zwiebeln im Öl andünsten und mit Brühe ablöschen.', list)).toEqual([0, 1, 3])
    expect(ingredientsInStep('Das Ei hineinschlagen.', list)).toEqual([2])
    expect(ingredientsInStep('Die Kartoffel schälen.', list)).toEqual([4])
    expect(ingredientsInStep('Den Teig kneten.', list)).toEqual([])
  })
})
