import { describe, it, expect } from 'vitest'
import { chunkBalanced } from './chunkBalanced'

describe('chunkBalanced', () => {
  it('con elenco vuoto restituisce nessuna riga', () => {
    expect(chunkBalanced([], 3)).toEqual([])
  })

  it('se gli elementi stanno in una riga sola la restituisce intera', () => {
    expect(chunkBalanced([1, 2], 3)).toEqual([[1, 2]])
    expect(chunkBalanced([1, 2, 3], 3)).toEqual([[1, 2, 3]])
  })

  it('con maxCols mancante o zero restituisce una riga sola', () => {
    expect(chunkBalanced([1, 2, 3], 0)).toEqual([[1, 2, 3]])
    expect(chunkBalanced([1, 2, 3], undefined)).toEqual([[1, 2, 3]])
  })

  it('distribuisce il resto nelle righe iniziali (5 elementi, maxCols 3 → [3, 2])', () => {
    expect(chunkBalanced([1, 2, 3, 4, 5], 3)).toEqual([
      [1, 2, 3],
      [4, 5],
    ])
  })

  it('bilancia invece di lasciare righe da un elemento (4 elementi, maxCols 3 → [2, 2])', () => {
    expect(chunkBalanced([1, 2, 3, 4], 3)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('più righe: 7 elementi con maxCols 3 → [3, 2, 2]', () => {
    expect(chunkBalanced([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([
      [1, 2, 3],
      [4, 5],
      [6, 7],
    ])
  })

  it('con maxCols 1 mette un elemento per riga', () => {
    expect(chunkBalanced([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  it('invarianti su tante combinazioni: righe ≤ maxCols, ordine e contenuto intatti, scarto tra righe ≤ 1', () => {
    for (const n of [1, 2, 5, 8, 11, 20]) {
      for (const cols of [1, 2, 3, 4, 5]) {
        const items = Array.from({ length: n }, (_, i) => i)
        const rows = chunkBalanced(items, cols)
        expect(rows.flat()).toEqual(items)
        for (const row of rows) expect(row.length).toBeLessThanOrEqual(cols)
        const lengths = rows.map((r) => r.length)
        if (lengths.length > 1) {
          expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
