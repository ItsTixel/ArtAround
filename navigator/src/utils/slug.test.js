import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('trasforma un nome in slug minuscolo separato da trattini', () => {
    expect(slugify('Galleria degli Uffizi')).toBe('galleria-degli-uffizi')
  })

  it('rimuove i diacritici', () => {
    expect(slugify('Città di Castello')).toBe('citta-di-castello')
    expect(slugify('Museo Egìzio')).toBe('museo-egizio')
  })

  it('collassa spazi e punteggiatura ripetuti in un solo trattino', () => {
    expect(slugify('Palazzo   Pitti!!!')).toBe('palazzo-pitti')
    expect(slugify('Peggy Guggenheim Collection (Venezia)')).toBe(
      'peggy-guggenheim-collection-venezia'
    )
  })

  it('non lascia trattini iniziali o finali', () => {
    expect(slugify('  "Brera"  ')).toBe('brera')
  })

  it('gestisce input vuoto, nullo o solo simboli', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
    expect(slugify('!!!')).toBe('')
  })
})
