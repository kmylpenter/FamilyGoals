/**
 * FALA 2 — testy regresyjne (red-first) dla MAJOR-ów z logs/AUDIT-2026-07-24.md.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, LOGIC_SCRIPTS } = require('./harness/load-app');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

// --- B-M3: jedna instancja DataManagera dostępna jako window.dataManager ---
test('B-M3: singleton DataManagera wystawiony na window (SSOT instancji)', () => {
  const { run } = loadApp({ scripts: LOGIC_SCRIPTS });
  assert.equal(run('typeof window.dataManager'), 'object', 'window.dataManager nie istnieje');
  assert.equal(run('window.dataManager === dataManager'), true, 'window.dataManager to inna instancja niż globalny singleton');
});

// --- B-M5: trend nie fabrykuje historii z expectedAmount ---
test('B-M5: getTrendByOwner zwraca 0 dla miesięcy bez wpłat (bez fabrykacji expectedAmount)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run('dataManager.addIncomeSource({ name: "Pensja", owner: "wife", expectedAmount: 5000, isActive: true })');
  const srcId = run('dataManager.getIncomeSources()[0].id');
  run(`dataManager.recordPayment("${srcId}", { amount: 4800, date: "2026-07-10" })`);
  const trend = run('dataManager.getTrendByOwner(2)');
  assert.equal(trend.length, 2);
  assert.equal(trend[0].wifeIncome, 0, `czerwiec sfabrykowany: ${trend[0].wifeIncome} (expectedAmount zamiast 0)`);
  assert.equal(trend[1].wifeIncome, 4800, 'lipiec = realna wpłata');
});

// --- B-M7: alerty celów bez Infinity/NaN i bez fałszywych alertów dla celów cyklicznych ---
test('B-M7: getGoalAlerts nie produkuje komunikatów z Infinity dla celu bez planu wpłat', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run('dataManager.addPlannedGoal({ name: "Remont", targetAmount: 10000, currentAmount: 0 })'); // bez monthlyContribution i bez targetDate
  const alerts = run('dataManager.getGoalAlerts()');
  const infinityAlerts = alerts.filter((a) => String(a.message).includes('Infinity') || a.months === Infinity);
  // uwaga: length, nie deepEqual — tablice z vm mają obcy Array.prototype
  assert.equal(infinityAlerts.length, 0, `alert z Infinity: ${JSON.stringify(infinityAlerts[0] || null)}`);
});

test('B-M7b: cel cykliczny (zobowiązanie) nie generuje alertu "nie zdążysz"', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run('dataManager.addPlannedGoal({ name: "Leasing", type: "recurring", monthlyContribution: 1200, targetAmount: 1200 })');
  const alerts = run('dataManager.getGoalAlerts()');
  const leasing = alerts.filter((a) => a.goalName === 'Leasing');
  assert.equal(leasing.length, 0, `fałszywy alert dla zobowiązania cyklicznego: ${JSON.stringify(leasing[0] || null)}`);
});

// --- C-M5: korzyści firmowe liczone dla wskazanego miesiąca, nie "teraz" ---
test('C-M5: calculateBusinessSavings(year, month) filtruje zakupy jednorazowe per miesiąc', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run('dataManager.addBusinessCost({ name: "Laptop", amount: 4000 })');
  const id = run('dataManager.getBusinessCosts()[0].id');
  // zakup w czerwcu
  run(`(function(){ const costs = dataManager.getBusinessCosts(); costs[0].lastPurchaseDate = "2026-06-10T10:00:00.000Z"; dataManager._saveBusinessCosts(costs); })()`);
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 5)'), 4000, 'czerwiec powinien liczyć zakup');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 6)'), 0, 'lipiec nie powinien liczyć czerwcowego zakupu');
});

// --- D-M4: couple-streak nie wywala się bez GamificationManagera ---
test('D-M4: recordLogin obojga bez gm (null) nie rzuca TypeError', () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/engagement-manager.js'] });
  run('const em = new EngagementManager(null, null)');
  assert.doesNotThrow(() => {
    run('em.recordLogin("wife")');
    run('em.recordLogin("husband")'); // oboje dziś → gałąź couple → this.gm.unlockedAchievements
  });
});
