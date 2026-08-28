// Unit test per lo slug del nome file usato allo scarico dei JSON
// (stile della visita, indicazioni delle mappe). `downloadJson` tocca il
// DOM e non viene testato qui: si verifica solo la parte pura.
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugForFilename } from '../js/download-json.js';

test('slugForFilename produce un nome file leggibile', () => {
  assert.equal(slugForFilename('Galleria degli Uffizi'), 'galleria-degli-uffizi');
});

test('slugForFilename rimuove accenti e punteggiatura', () => {
  assert.equal(slugForFilename('Città! (dati)'), 'citta-dati');
});

test('slugForFilename ripiega sul fallback per input vuoto o nullo', () => {
  assert.equal(slugForFilename(''), 'dati');
  assert.equal(slugForFilename(null), 'dati');
  assert.equal(slugForFilename(undefined), 'dati');
  assert.equal(slugForFilename('   '), 'dati');
});

test('slugForFilename accetta un fallback personalizzato', () => {
  assert.equal(slugForFilename('', 'stile-visita'), 'stile-visita');
});
