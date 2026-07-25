/**
 * Zakres od–do źródeł cyklicznych (żądanie Kamila 2026-07-25; audyt B-M7:
 * zakresy istniały tylko w danych demo, logika ich nie czytała).
 * Red-first: getIncomeSourcesStatus ma honorować activeFrom/activeTo (YYYY-MM).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const fresh = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'] });

test('od–do: cykliczne źródło widoczne tylko w miesiącach zakresu', () => {
  const { run } = fresh();
  run(`dataManager.addIncomeSource({ name: 'Pensja', expectedAmount: 6000, owner: 'husband', incomeType: 'recurring', isActive: true, activeFrom: '2026-03', activeTo: '2026-06' })`);
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 1).length'), 0, 'luty: przed zakresem');
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 2).length'), 1, 'marzec: start zakresu');
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 5).length'), 1, 'czerwiec: koniec zakresu');
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 6).length'), 0, 'lipiec: po zakresie');
});

test('od–do: puste "do" = bezterminowo; brak pól = jak dotąd (zawsze)', () => {
  const { run } = fresh();
  run(`dataManager.addIncomeSource({ name: 'Etat', expectedAmount: 5000, owner: 'wife', incomeType: 'recurring', isActive: true, activeFrom: '2025-01' })`);
  run(`dataManager.addIncomeSource({ name: 'Stare', expectedAmount: 100, owner: 'wife', incomeType: 'recurring', isActive: true })`);
  assert.equal(run('dataManager.getIncomeSourcesStatus(2024, 5).length'), 1, 'przed activeFrom Etatu widać tylko Stare');
  assert.equal(run('dataManager.getIncomeSourcesStatus(2027, 5).length'), 2, 'daleko w przód: oba (bezterminowe)');
});

test('od–do: jednorazowe bez zmian (forMonth), zakres ich nie dotyczy', () => {
  const { run } = fresh();
  run(`dataManager.addIncomeSource({ name: 'Premia', expectedAmount: 900, owner: 'wife', incomeType: 'oneoff', isActive: true, forMonth: '2026-05' })`);
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 4).length'), 1, 'maj: widoczna');
  assert.equal(run('dataManager.getIncomeSourcesStatus(2026, 5).length'), 0, 'czerwiec: nie');
});

test('od–do: suma miesiąca liczy tylko źródła aktywne w tym miesiącu', () => {
  const { run } = fresh();
  run(`dataManager.addIncomeSource({ name: 'A', expectedAmount: 1000, owner: 'wife', incomeType: 'recurring', isActive: true, activeFrom: '2026-01', activeTo: '2026-02' })`);
  run(`dataManager.addIncomeSource({ name: 'B', expectedAmount: 2000, owner: 'wife', incomeType: 'recurring', isActive: true })`);
  assert.equal(run('dataManager.getMonthlyIncomeSummary(2026, 0).totalExpected'), 3000, 'styczeń: A+B');
  assert.equal(run('dataManager.getMonthlyIncomeSummary(2026, 6).totalExpected'), 2000, 'lipiec: tylko B');
});
