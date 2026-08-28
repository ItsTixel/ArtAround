// Unit test per la normalizzazione Entity API -> formato <opera-card>,
// condivisa tra il catalogo pubblico e il pannello "Opere" del profilo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEntity } from '../js/entity-utils.js';

test('normalizeEntity mappa i campi principali e applica i default', () => {
  const out = normalizeEntity({ _id: 'e1', name: 'Gioconda' });
  assert.equal(out.id, 'e1');
  assert.equal(out.name, 'Gioconda');
  assert.equal(out.artworkAuthor, '');
  assert.equal(out.description, '');
  assert.equal(out.imageUrl, '');
  assert.equal(out.isPhysical, false);
  assert.deepEqual(out.tags, []);
  assert.deepEqual(out.museums, []);
  assert.equal(out.favorited, false);
});

test('normalizeEntity espande i placement con museo come oggetto', () => {
  const out = normalizeEntity({
    _id: 'e2',
    name: 'Nike di Samotracia',
    is_physical: true,
    placements: [
      { museum: { _id: 'm1', name: 'Louvre', address: { city: 'Parigi' } } },
    ],
  });
  assert.equal(out.isPhysical, true);
  assert.deepEqual(out.museums, [{ id: 'm1', name: 'Louvre', city: 'Parigi' }]);
});

test('normalizeEntity gestisce il museo come semplice id stringa', () => {
  const out = normalizeEntity({ _id: 'e3', placements: [{ museum: 'm9' }] });
  assert.deepEqual(out.museums, [{ id: 'm9', name: '', city: '' }]);
});

test('normalizeEntity segna favorited quando l\'id è nel set dei preferiti', () => {
  const favorited = normalizeEntity({ _id: 'e4' }, new Set(['e4']));
  assert.equal(favorited.favorited, true);

  const notFavorited = normalizeEntity({ _id: 'e5' }, new Set(['e4']));
  assert.equal(notFavorited.favorited, false);
});
