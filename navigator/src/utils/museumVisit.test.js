import { describe, it, expect } from 'vitest'
import { museumVisitPath } from './museumVisit'

describe('museumVisitPath', () => {
  it('costruisce il percorso dallo slug del nome del museo', () => {
    expect(museumVisitPath({ name: 'Galleria degli Uffizi' })).toBe(
      '/visite/galleria-degli-uffizi'
    )
  })

  it('ripiega sulla home generica delle visite senza un museo', () => {
    expect(museumVisitPath(undefined)).toBe('/visite')
    expect(museumVisitPath(null)).toBe('/visite')
  })

  it('ripiega su /visite se il nome è vuoto o non produce uno slug', () => {
    expect(museumVisitPath({ name: '' })).toBe('/visite')
    expect(museumVisitPath({ name: '   ' })).toBe('/visite')
    expect(museumVisitPath({ name: '!!!' })).toBe('/visite')
  })
})
