// Unit test per l'escape delle regex usato nei filtri di ricerca.
// Runner: quello integrato di Node (`node --test`), nessuna dipendenza.
const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex, buildSearchRegex, buildExactRegex } = require('../utils/regex');

test('escapeRegex fa l\'escape di tutti i metacaratteri regex', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
  assert.equal(escapeRegex('(a+)+$'), '\\(a\\+\\)\\+\\$');
  assert.equal(escapeRegex('[foo]'), '\\[foo\\]');
  assert.equal(escapeRegex('a\\b'), 'a\\\\b');
});

test('escapeRegex lascia intatti i caratteri normali', () => {
  assert.equal(escapeRegex('Galleria degli Uffizi'), 'Galleria degli Uffizi');
});

test('escapeRegex forza a stringa un input non stringa', () => {
  assert.equal(escapeRegex(42), '42');
  assert.equal(escapeRegex(null), 'null');
});

test('buildSearchRegex produce una RegExp case-insensitive', () => {
  const re = buildSearchRegex('uffizi');
  assert.ok(re instanceof RegExp);
  assert.equal(re.flags, 'i');
  assert.ok(re.test('Galleria degli UFFIZI'));
});

test('buildSearchRegex tratta i metacaratteri come testo letterale, non come pattern', () => {
  // Senza escape "." e "*" matcherebbero qualunque cosa: qui devono
  // matchare solo la sottostringa ".*".
  const re = buildSearchRegex('.*');
  assert.ok(re.test('nome con .* dentro'));
  assert.ok(!re.test('qualsiasi altra cosa'));
});

test('buildSearchRegex non lancia su input che sarebbe una regex non valida', () => {
  assert.doesNotThrow(() => buildSearchRegex('('));
  assert.doesNotThrow(() => buildSearchRegex('[a-'));
});

test('buildSearchRegex fa trim dell\'input', () => {
  const re = buildSearchRegex('  ciao  ');
  assert.equal(re.source, 'ciao');
  assert.ok(re.test('dico ciao a te'));
});

test('buildSearchRegex tronca l\'input a maxLen', () => {
  const long = 'a'.repeat(500);
  assert.equal(buildSearchRegex(long, 10).source, 'a'.repeat(10));
});

test('buildExactRegex combacia solo col nome esatto, non come sottostringa', () => {
  const re = buildExactRegex('Venere di Urbino');
  assert.ok(re.test('venere di urbino')); // case-insensitive
  assert.ok(!re.test('La Venere di Urbino'));
  assert.ok(!re.test('Venere di Urbino (copia)'));
});

test('buildExactRegex tratta i metacaratteri del nome come testo letterale', () => {
  // Senza escape "(a+)+$" combacerebbe come pattern (o farebbe backtracking
  // catastrofico); qui deve cercare solo il nome letterale, ancorato.
  const re = buildExactRegex('Ritratto (Uomo)');
  assert.ok(re.test('Ritratto (Uomo)'));
  assert.ok(!re.test('Ritratto Uomo'));
});

test('buildExactRegex non lancia su un nome che sarebbe una regex non valida', () => {
  assert.doesNotThrow(() => buildExactRegex('('));
});
