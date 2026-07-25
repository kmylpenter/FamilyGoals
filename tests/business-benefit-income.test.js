/**
 * Korzyści firmowe = przychód Męża (decyzja Kamila 2026-07-25: firma jest
 * zarządzana przez Męża — bez firmy nie byłoby tych przychodów).
 * Red-first: getTrendByOwner ma wliczać korzyści do husbandIncome,
 * a okno 'auto' ma sięgać najwcześniejszej korzyści (case: zakup z 2023).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

test('cykliczna korzyść wchodzi w przychody Męża na wykresie (w zakresie)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.addBusinessCost({ name: 'Leasing', amount: 600, isRecurring: true, recurringMonths: 1, activeFrom: '2026-06' })`);
  const trend = run('dataManager.getTrendByOwner(3)');
  assert.equal(trend[0].husbandIncome, 0, 'maj: przed zakresem');
  assert.equal(trend[1].husbandIncome, 600, 'czerwiec: start zakresu');
  assert.equal(trend[2].husbandIncome, 600, 'lipiec: w zakresie');
  assert.equal(trend[2].wifeIncome, 0, 'Żona bez zmian');
  assert.equal(trend[2].totalIncome, 600, 'suma miesiąca zawiera korzyść');
});

test('jednorazowa korzyść z datą trafia w miesiąc realizacji (Mąż)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.addBusinessCost({ name: 'Laptop', amount: 4000, lastPurchaseDate: '2026-06-10T10:00:00.000Z' })`);
  const trend = run('dataManager.getTrendByOwner(2)');
  assert.equal(trend[0].husbandIncome, 4000, 'czerwiec: miesiąc zakupu');
  assert.equal(trend[1].husbandIncome, 0, 'lipiec: już nie');
});

test("okno 'auto' sięga najwcześniejszej korzyści (zakup z 2023)", () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.addBusinessCost({ name: 'Stary zakup', amount: 1000, lastPurchaseDate: '2023-03-10T10:00:00.000Z' })`);
  const trend = run(`dataManager.getTrendByOwner('auto')`);
  assert.equal(trend.length, 41, `marzec 2023 → lipiec 2026 = 41 mies., jest ${trend.length}`);
  assert.equal(trend[0].year, 2023, 'okno zaczyna się w 2023');
  assert.equal(trend[0].husbandIncome, 1000, 'marzec 2023: korzyść widoczna na wykresie');
});
