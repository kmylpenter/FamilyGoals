/**
 * Testy charakteryzujące js/pin-manager.js — zamrażają poprawne zachowania
 * (hash+weryfikacja, migracja starego formatu, rate limiting, sesja),
 * żeby naprawy w obszarze PIN niczego nie cofnęły.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

function fresh() {
  return loadApp({ scripts: ['js/utils.js', 'js/pin-manager.js'] });
}

test('setPin + verify: poprawny PIN przechodzi, błędny odlicza próby', async () => {
  const { run } = fresh();
  await run('PinManager.setPin("1234")');
  const ok = await run('PinManager.verify("1234")');
  assert.equal(ok.success, true);
  const bad = await run('PinManager.verify("9999")');
  assert.equal(bad.success, false);
  assert.equal(bad.attemptsLeft, 4);
});

test('rate limiting: 5 błędnych prób → lockout, poprawny PIN nie działa w lockout', async () => {
  const { run } = fresh();
  await run('PinManager.setPin("1234")');
  let last;
  for (let i = 0; i < 5; i++) last = await run('PinManager.verify("0000")');
  assert.equal(last.locked, true);
  const duringLockout = await run('PinManager.verify("1234")');
  assert.equal(duringLockout.success, false);
  assert.equal(duringLockout.locked, true);
});

test('sukces resetuje licznik prób', async () => {
  const { run } = fresh();
  await run('PinManager.setPin("1234")');
  await run('PinManager.verify("0000")');
  await run('PinManager.verify("0000")');
  await run('PinManager.verify("1234")'); // reset
  const bad = await run('PinManager.verify("0000")');
  assert.equal(bad.attemptsLeft, 4); // licznik zaczął od nowa
});

test('migracja starego formatu (btoa) → SHA-256 przy pierwszym verify', async () => {
  const { run } = fresh();
  // Stary format sprzed sesji 11: btoa(pin + salt)
  run('localStorage.setItem("familygoals_pin", btoa("4321" + "familygoals_2025"))');
  const res = await run('PinManager.verify("4321")');
  assert.equal(res.success, true);
  // Po migracji stored = 64-znakowy hex SHA-256
  const stored = run('localStorage.getItem("familygoals_pin")');
  assert.match(stored, /^[0-9a-f]{64}$/);
  // I dalej działa
  const again = await run('PinManager.verify("4321")');
  assert.equal(again.success, true);
});

test('requiresUnlock: false bez PIN, true z PIN bez sesji, false po startSession', async () => {
  const { run } = fresh();
  assert.equal(run('PinManager.requiresUnlock()'), false); // świeża instalacja
  await run('PinManager.setPin("1234")');
  assert.equal(run('PinManager.requiresUnlock()'), true);
  run('PinManager.startSession()');
  assert.equal(run('PinManager.requiresUnlock()'), false);
});

test('setPin waliduje format: 4 cyfry', async () => {
  const { run } = fresh();
  await assert.rejects(run('PinManager.setPin("12")'));
  await assert.rejects(run('PinManager.setPin("abcd")'));
  await assert.rejects(run('PinManager.setPin("12345")'));
});
