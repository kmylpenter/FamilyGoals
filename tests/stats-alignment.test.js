/**
 * Wyrównanie statystyk miesiąca (zgoda Kamila 2026-07-25):
 * 1) „odłożone" (getMonthlyStats.savings) liczy się z WPŁAT ŹRÓDEŁ (prawda
 *    kasowa, jak wykres/karta przychodów) + korzyści firmowych — nie z luster
 *    income[] (600 zł wpłat bez lustra ginęło, korzyści nie były liczone);
 * 2) savingsTarget = suma z REALNYCH celów usera, nie z config.json (2000).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

test('odłożone: wpłaty źródeł + korzyści firmowe (jak karta przychodów)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true })`);
  const srcId = run('dataManager.getIncomeSources()[0].id');
  run(`dataManager.recordPayment('${srcId}', { amount: 3300, date: '2026-07-10' })`);
  run(`dataManager.addBusinessCost({ name: 'Abonament', amount: 300, isRecurring: true, recurringMonths: 1, activeFrom: '2026-01' })`);
  const stats = run('dataManager.getMonthlyStats(2026, 6)');
  assert.equal(stats.totalIncome, 3600, 'wpłata 3300 + korzyść 300');
  assert.equal(stats.savings, 3600, 'bez wydatków odłożone = przychód');
});

test('odłożone: wpłata BEZ lustra w income[] też się liczy (prawda kasowa)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true })`);
  run(`(function(){
    const s = dataManager.getIncomeSources();
    s[0].payments = [{ id: 'p-bez-lustra', amount: 600, date: '2026-07-05', note: '' }];
    dataManager._saveIncomeSources(s);
  })()`);
  assert.equal(run('dataManager.getIncome().length'), 0, 'lustra celowo brak');
  assert.equal(run('dataManager.getMonthlyStats(2026, 6).totalIncome'), 600, 'wpłata liczona mimo braku lustra');
});

test('savingsTarget: z realnych celów usera, nie z config.json', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run(`dataManager.config = { goals: { monthlySavingsTarget: 2000 } }`);
  assert.equal(run('dataManager.getMonthlyStats(2026, 6).savingsTarget'), 0, 'bez celów target = 0 (nie 2000 z config)');
  run(`dataManager.addPlannedGoal({ name: 'Poduszka', type: 'recurring', monthlyContribution: 300 })`);
  assert.equal(run('dataManager.getMonthlyStats(2026, 6).savingsTarget'), 300, 'target = suma z celów');
});
