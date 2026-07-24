/**
 * Bramka podstawowa: wszystkie moduły logiki ładują się bez wyjątku,
 * a kluczowe globale istnieją. Łapie błędy kolejności ładowania
 * i odwołania do nieistniejących symboli na top-level.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, LOGIC_SCRIPTS, ALL_SCRIPTS } = require('./harness/load-app');

test('moduły logiki ładują się bez wyjątków (kolejność jak w index.html)', () => {
  const { run } = loadApp({ scripts: LOGIC_SCRIPTS });
  assert.equal(run('typeof DataManager'), 'function');
  assert.equal(run('typeof dataManager'), 'object');
  assert.equal(run('typeof PinManager'), 'function');
  assert.equal(run('typeof formatMoney'), 'function');
  assert.equal(run('typeof window.FGUtils'), 'object');
});

test('pełny zestaw łącznie z app.js ładuje się na stubach DOM', () => {
  // Jeśli ten test padnie, a poprzedni przejdzie — app.js wymaga
  // realnych elementów DOM na etapie ładowania (odnotuj, nie maskuj).
  const { run } = loadApp({ scripts: ALL_SCRIPTS });
  assert.notEqual(run('typeof app === "undefined" ? "undefined" : typeof app'), 'undefined');
});
