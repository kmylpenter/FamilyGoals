/**
 * Model PULI dla źródeł cyklicznych (żądanie Kamila 2026-07-25):
 * wpłaty (dowolne daty) sumują się jak saldo rachunku i pokrywają kolejne
 * miesiące od activeFrom po expectedAmount/mies. — wstecz i w przód.
 * Red-first.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

function withSource(run, extra = '') {
  return run(`dataManager.addIncomeSource({ name: 'Gotówka', expectedAmount: 20000, owner: 'husband', incomeType: 'recurring', isActive: true, activeFrom: '2026-01'${extra} })`);
}
const fresh = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-07-15T12:00:00' });

test('pula: 60k wpłacone raz → styczeń/luty/marzec complete, kwiecień pending', () => {
  const { run } = fresh();
  const src = withSource(run);
  run(`dataManager.recordPayment('${src.id}', { amount: 60000, date: '2026-03-10' })`);
  const st = (y, m) => run(`dataManager.getIncomeSourcesStatus(${y}, ${m})[0]`);
  assert.equal(st(2026, 0).status, 'complete', 'styczeń pokryty z puli');
  assert.equal(st(2026, 2).status, 'complete', 'marzec pokryty');
  assert.equal(st(2026, 3).status, 'pending', 'kwiecień jeszcze nie');
  assert.equal(st(2026, 0).totalReceived, 20000, 'alokacja miesięczna = expected');
});

test('pula: 100k przy 20k/mies → pokrywa 5 miesięcy W PRZÓD', () => {
  const { run } = fresh();
  const src = withSource(run, ", activeFrom: '2026-07'");
  run(`dataManager.recordPayment('${src.id}', { amount: 100000, date: '2026-07-15' })`);
  assert.equal(run(`dataManager.getIncomeSourcesStatus(2026, 6)[0].status`), 'complete', 'lipiec');
  assert.equal(run(`dataManager.getIncomeSourcesStatus(2026, 10)[0].status`), 'complete', 'listopad (5. miesiąc)');
  assert.equal(run(`dataManager.getIncomeSourcesStatus(2026, 11)[0].status`), 'pending', 'grudzień już nie');
});

test('pula: wpłata 5k przy 20k → miesiąc partial 25%', () => {
  const { run } = fresh();
  const src = withSource(run);
  run(`dataManager.recordPayment('${src.id}', { amount: 5000, date: '2026-01-20' })`);
  const s = run('dataManager.getIncomeSourcesStatus(2026, 0)[0]');
  assert.equal(s.status, 'partial');
  assert.equal(s.totalReceived, 5000);
  assert.equal(s.percentReceived, 25);
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 1)[0].status'), 'pending', 'luty pusty');
});

test('wykres: trend pokazuje FAKTYCZNE wpłaty wg dat (nie alokację z puli)', () => {
  const { run } = fresh();
  const src = withSource(run);
  run(`dataManager.recordPayment('${src.id}', { amount: 60000, date: '2026-06-01' })`);
  const trend = run('dataManager.getTrendByOwner(6)');
  const byMonth = {};
  trend.forEach(t => { byMonth[t.month] = t.husbandIncome; });
  assert.equal(byMonth[5], 60000, 'czerwiec: cała wpłata w miesiącu zaksięgowania');
  assert.equal(byMonth[1], 0, 'luty: zero (bez wygładzania)');
  assert.equal(byMonth[2], 0, 'marzec: zero');
});

test('pula: jednorazowe źródła bez zmian (data księgowania)', () => {
  const { run } = fresh();
  const src = run(`dataManager.addIncomeSource({ name: 'Premia', expectedAmount: 900, owner: 'wife', incomeType: 'oneoff', isActive: true, forMonth: '2026-05' })`);
  run(`dataManager.recordPayment('${src.id}', { amount: 900, date: '2026-05-11' })`);
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 4)[0].status'), 'complete');
});

test("pula: getTrendByOwner('auto') zaczyna okno od najwcześniejszych danych", () => {
  const { run } = fresh(); // now = 2026-07-15
  const src = withSource(run); // activeFrom 2026-01
  run(`dataManager.recordPayment('${src.id}', { amount: 20000, date: '2026-02-10' })`);
  const trend = run(`dataManager.getTrendByOwner('auto')`);
  assert.equal(trend.length, 6, 'sty..cze 2026 = 6 miesięcy (bez trwającego lipca)');
  assert.equal(trend[0].year, 2026);
  assert.equal(trend[0].month, 0, 'okno startuje w styczniu (activeFrom)');
  assert.equal(trend[trend.length - 1].month, 5, 'kończy na ostatnim zamkniętym (czerwiec)');
});

test("pula: 'auto' bez activeFrom bierze najwcześniejszą wpłatę", () => {
  const { run } = fresh();
  const src = run(`dataManager.addIncomeSource({ name: 'X', expectedAmount: 100, owner: 'wife', incomeType: 'recurring', isActive: true })`);
  run(`dataManager.recordPayment('${src.id}', { amount: 100, date: '2025-11-05' })`);
  const trend = run(`dataManager.getTrendByOwner('auto')`);
  assert.equal(trend[0].year, 2025);
  assert.equal(trend[0].month, 10, 'listopad 2025 = najwcześniejsza wpłata');
});

test('alerty: BEZ widmowego celu z domyślnego configu (2000) gdy user nie ma celów', async () => {
  // Wiernie jak w APK: fetch data/*.json PADA -> init podstawia _getDefaultConfig
  const { createBrowserEnv } = require('./harness/browser-env');
  const env = createBrowserEnv({ now: '2026-07-25T12:00:00' }); // 25. dzień (>15)
  env.fetch = () => Promise.reject(new Error('file://'));
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], env });
  await run('dataManager.init()');
  run(`dataManager.addIncomeSource({ name: 'B', expectedAmount: 700, owner: 'husband', incomeType: 'oneoff', isActive: true, forMonth: '2026-07' })`);
  run(`dataManager.addIncome({ amount: 700, source: 'B', date: '2026-07-10' })`);
  const alerts = run('dataManager.getAllAlerts()');
  const phantom = alerts.filter(a => /do celu|Cel osiągnięty/.test(a.message || ''));
  assert.equal(phantom.length, 0, `widmowy alert: ${JSON.stringify(phantom[0] || null)}`);
});
