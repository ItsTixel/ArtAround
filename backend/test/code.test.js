// Unit test per la generazione dei codici visita.
// `generateUniqueCode` riceve un modello con `.exists()`: nei test gli si
// passa un finto oggetto, così non serve un database.
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateUniqueCode } = require('../utils/code');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

test('generateUniqueCode restituisce un codice di 6 caratteri dall\'alfabeto previsto', async () => {
  const fakeVisit = { exists: async () => null };
  const code = await generateUniqueCode(fakeVisit);
  assert.equal(code.length, 6);
  for (const ch of code) {
    assert.ok(ALPHABET.includes(ch), `carattere inatteso nel codice: ${ch}`);
  }
});

test('generateUniqueCode non usa mai caratteri ambigui (0 1 O I L)', async () => {
  const fakeVisit = { exists: async () => null };
  for (let i = 0; i < 50; i++) {
    const code = await generateUniqueCode(fakeVisit);
    assert.ok(!/[01OIL]/.test(code), `codice con carattere ambiguo: ${code}`);
  }
});

test('generateUniqueCode ritenta finché il codice non è libero', async () => {
  let calls = 0;
  const fakeVisit = {
    exists: async () => {
      calls += 1;
      return calls < 3; // i primi due risultano occupati, il terzo è libero
    },
  };
  const code = await generateUniqueCode(fakeVisit, 5);
  assert.equal(calls, 3);
  assert.equal(code.length, 6);
});

test('generateUniqueCode lancia dopo aver esaurito i tentativi', async () => {
  const fakeVisit = { exists: async () => true }; // sempre occupato
  await assert.rejects(
    () => generateUniqueCode(fakeVisit, 3),
    /Impossibile generare un codice univoco/
  );
});
