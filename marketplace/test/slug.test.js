// Unit test per lo slug dei nomi dei musei (copia lato marketplace, gemella
// di navigator/src/utils/slug.js). Runner integrato di Node (`node --test`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../js/slug.js';

test('slugify trasforma un nome in slug minuscolo separato da trattini', () => {
  assert.equal(slugify('Galleria degli Uffizi'), 'galleria-degli-uffizi');
});

test('slugify rimuove i diacritici', () => {
  assert.equal(slugify('Città di Castello'), 'citta-di-castello');
  assert.equal(slugify('Museo Egìzio'), 'museo-egizio');
});

test('slugify collassa spazi e punteggiatura ripetuti in un solo trattino', () => {
  assert.equal(slugify('Palazzo   Pitti!!!'), 'palazzo-pitti');
  assert.equal(
    slugify('Peggy Guggenheim Collection (Venezia)'),
    'peggy-guggenheim-collection-venezia'
  );
});

test('slugify non lascia trattini iniziali o finali', () => {
  assert.equal(slugify('  "Brera"  '), 'brera');
});

test('slugify gestisce input vuoto, nullo o solo simboli', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(null), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify('!!!'), '');
});
