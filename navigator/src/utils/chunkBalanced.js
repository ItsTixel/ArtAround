// Divide `items` in gruppi il più uniformi possibile di al massimo `maxCols`
// elementi, distribuendo l'eventuale resto nelle righe iniziali — es. 5
// elementi con maxCols 3 diventano righe da [3, 2], mai [3, 1, 1] o
// [1, 1, 1, 1, 1]. Usato da Comandi.jsx per la griglia dei pulsanti servizio.
export function chunkBalanced(items, maxCols) {
  if (items.length === 0) return []
  if (!maxCols || maxCols >= items.length) return [items]
  const rows = Math.ceil(items.length / maxCols)
  const result = []
  let i = 0
  for (let r = 0; r < rows; r++) {
    const count = Math.ceil((items.length - i) / (rows - r))
    result.push(items.slice(i, i + count))
    i += count
  }
  return result
}
