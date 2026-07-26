/**
 * Edycja wpłat z historii (żądanie Kamila 2026-07-25).
 * Red-first: updatePayment ma zmieniać wpłatę w źródle ORAZ lustro w income
 * (po paymentId; legacy po sourceId+data+kwota — jak przy usuwaniu, B-M1).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

const setup = (run) => {
  run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'wife', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  const srcId = run('dataManager.getIncomeSources()[0].id');
  run(`dataManager.recordPayment('${srcId}', { amount: 6000, date: '2026-07-09', note: 'Przelew' })`);
  const payId = run('dataManager.getIncomeSources()[0].payments[0].id');
  return { srcId, payId };
};

test('updatePayment zmienia kwotę/datę/nazwę wpłaty w źródle', () => {
  const { run } = dm('2026-07-15T12:00:00');
  const { srcId, payId } = setup(run);
  run(`dataManager.updatePayment('${srcId}', '${payId}', { amount: 6100, date: '2026-07-10', note: 'Premia' })`);
  const p = run('dataManager.getIncomeSources()[0].payments[0]');
  assert.equal(p.amount, 6100);
  assert.equal(p.date, '2026-07-10');
  assert.equal(p.note, 'Premia');
});

test('updatePayment aktualizuje lustro w income (po paymentId)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  const { srcId, payId } = setup(run);
  run(`dataManager.updatePayment('${srcId}', '${payId}', { amount: 5500, note: 'Korekta' })`);
  const mirror = run(`dataManager.getIncome().find(i => i.paymentId === '${payId}')`);
  assert.ok(mirror, 'lustro istnieje');
  assert.equal(mirror.amount, 5500, 'kwota lustra zaktualizowana');
  assert.equal(mirror.description, 'Korekta', 'opis lustra zaktualizowany');
});

test('updatePayment domyka legacy lustro (bez paymentId, po dacie+kwocie)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  const { srcId, payId } = setup(run);
  // zasymuluj stare lustro: zdejmij paymentId
  run(`(function(){ const inc = dataManager.getIncome(); inc.find(i => i.paymentId === '${payId}').paymentId = undefined; dataManager._setCached(dataManager.constructor.STORAGE_KEYS.income, inc); })()`);
  run(`dataManager.updatePayment('${srcId}', '${payId}', { amount: 4800 })`);
  const mirror = run(`dataManager.getIncome().find(i => i.paymentId === '${payId}')`);
  assert.ok(mirror, 'legacy lustro dopasowane po starej dacie+kwocie i domknięte paymentId');
  assert.equal(mirror.amount, 4800);
});

test('po edycji suma miesiąca i wykres widzą nową kwotę', () => {
  const { run } = dm('2026-07-15T12:00:00');
  const { srcId, payId } = setup(run);
  run(`dataManager.updatePayment('${srcId}', '${payId}', { amount: 7000 })`);
  const trend = run('dataManager.getTrendByOwner(1)');
  assert.equal(trend[0].wifeIncome, 7000, 'wykres: nowa kwota');
});

test('recordPayment bez nazwy dostaje etykietę "{źródło} za {miesiąc rok}"', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`window.__s = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  run(`dataManager.recordPayment(window.__s.id, { amount: 6000, date: '2026-07-15' })`);
  run(`dataManager.recordPayment(window.__s.id, { amount: 500, date: '2026-06-10', note: 'Premia specjalna' })`);
  const p = run('dataManager.getIncomeSources()[0].payments');
  assert.equal(p[0].note, 'Pensja za lipiec 2026', 'auto-etykieta z daty wpłaty');
  assert.equal(p[1].note, 'Premia specjalna', 'własna nazwa zostaje');
  assert.equal(run('dataManager.getIncome()[0].description'), 'Pensja za lipiec 2026', 'lustro z tą samą etykietą');
});
