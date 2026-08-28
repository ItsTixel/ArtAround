// Unit test per la sanificazione degli URL utente prima dell'uso in `href`
// (js/url.js). Runner integrato di Node (`node --test`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl } from '../js/url.js';

test('safeExternalUrl lascia passare http, https e mailto', () => {
  assert.equal(safeExternalUrl('https://museo.example/sala'), 'https://museo.example/sala');
  assert.equal(safeExternalUrl('http://museo.example'), 'http://museo.example');
  assert.equal(safeExternalUrl('mailto:info@museo.example'), 'mailto:info@museo.example');
});

test('safeExternalUrl promuove a https un valore senza schema', () => {
  assert.equal(safeExternalUrl('www.museo.example'), 'https://www.museo.example');
  assert.equal(safeExternalUrl('museo.example/opere'), 'https://museo.example/opere');
});

test('safeExternalUrl rifiuta gli schemi pericolosi', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), '');
  assert.equal(safeExternalUrl('  javascript:alert(1)  '), '');
  assert.equal(safeExternalUrl('JavaScript:alert(1)'), '');
  assert.equal(safeExternalUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(safeExternalUrl('vbscript:msgbox(1)'), '');
});

test('safeExternalUrl gestisce input vuoto o nullo', () => {
  assert.equal(safeExternalUrl(''), '');
  assert.equal(safeExternalUrl('   '), '');
  assert.equal(safeExternalUrl(null), '');
  assert.equal(safeExternalUrl(undefined), '');
});
