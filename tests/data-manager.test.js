/**
 * Testy charakteryzujące js/data-manager.js — CRUD, płatności per miesiąc,
 * spójność cache↔localStorage. Pinują obecne zachowanie przed naprawami.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

function fresh(now) {
  // utils + data-manager wystarczą (event-bus itd. niepotrzebne dla CRUD)
  return loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });
}

test('income sources: add → get → update (merge) → delete', () => {
  const { run } = fresh();
  const created = run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000, owner: "wife" })');
  assert.ok(created.id, 'addIncomeSource nadaje id');
  assert.equal(run('dataManager.getIncomeSources().length'), 1);

  run(`dataManager.updateIncomeSource("${created.id}", { amount: 6000 })`);
  const after = run('dataManager.getIncomeSources()[0]');
  assert.equal(after.amount, 6000);
  assert.equal(after.name, 'Pensja', 'update nie gubi pozostałych pól (merge, nie replace)');

  run(`dataManager.deleteIncomeSource("${created.id}")`);
  assert.equal(run('dataManager.getIncomeSources().length'), 0);
});

test('cache↔storage: zapis przez API jest widoczny w kolejnym odczycie', () => {
  const { run } = fresh();
  run('dataManager.getIncomeSources()'); // wypełnia cache
  run('dataManager.addIncomeSource({ name: "X", amount: 100 })');
  assert.equal(run('dataManager.getIncomeSources().length'), 1, 'add invaliduje/aktualizuje cache');
  // Kontrola krzyżowa: localStorage też zaktualizowany
  const raw = run('localStorage.getItem("familygoals_income_sources")');
  assert.equal(JSON.parse(raw).length, 1);
});

test('cache bypass (charakteryzacja OWN-2): bezpośredni zapis localStorage NIE odświeża cache', () => {
  const { run } = fresh();
  run('dataManager.addIncomeSource({ name: "A", amount: 1 })');
  run('dataManager.getIncomeSources()'); // cache załadowany (1 pozycja)
  // Symulacja ścieżki importu z app.js: surowy setItem z pominięciem API
  run('localStorage.setItem("familygoals_income_sources", JSON.stringify([{id:"i1",name:"B",amount:2},{id:"i2",name:"C",amount:3}]))');
  assert.equal(
    run('dataManager.getIncomeSources().length'),
    1,
    'ZNANE ZACHOWANIE (bug OWN-2): cache nadal zwraca stare dane po surowym zapisie'
  );
});

test('recordPayment + getPaymentsByMonth: filtrowanie po roku i miesiącu', () => {
  const { run } = fresh();
  const src = run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000 })');
  run(`dataManager.recordPayment("${src.id}", { amount: 5000, date: "2026-03-10" })`);
  run(`dataManager.recordPayment("${src.id}", { amount: 4800, date: "2026-04-10" })`);
  assert.equal(run(`dataManager.getPaymentsByMonth("${src.id}", 2026, 2).length`), 1, 'marzec (month 0-index=2)');
  assert.equal(run(`dataManager.getPaymentsByMonth("${src.id}", 2026, 3).length`), 1, 'kwiecień');
  assert.equal(run(`dataManager.getPaymentsByMonth("${src.id}", 2026, 5).length`), 0, 'czerwiec pusty');
});

test('planned goals: add → getPlannedExpenses → updateProgress → delete', () => {
  const { run } = fresh();
  const goal = run('dataManager.addPlannedGoal({ name: "Remont", targetAmount: 20000, currentAmount: 0, targetDate: "2027-06-01" })');
  assert.ok(goal.id);
  const found = run(`dataManager.getPlannedExpenses().find(g => g.id === "${goal.id}")`);
  assert.ok(found, 'dodany cel widoczny w getPlannedExpenses');
  run(`dataManager.updatePlannedProgress("${goal.id}", 500)`);
  const after = run(`dataManager.getPlannedExpenses().find(g => g.id === "${goal.id}")`);
  assert.equal(after.currentAmount, 500);
  run(`dataManager.deletePlannedGoal("${goal.id}")`);
  assert.equal(run(`dataManager.getPlannedExpenses().some(g => g.id === "${goal.id}")`), false);
});

test('todos: add → complete → uncomplete → stats', () => {
  const { run } = fresh();
  const todo = run('dataManager.addTodo({ title: "Zakupy", owner: "husband" })');
  assert.ok(todo.id);
  run(`dataManager.completeTodo("${todo.id}")`);
  assert.equal(run('dataManager.getCompletedTodos().length'), 1);
  run(`dataManager.uncompleteTodo("${todo.id}")`);
  assert.equal(run('dataManager.getPendingTodos().length'), 1);
});

test('business costs: add → markPurchased', () => {
  const { run } = fresh();
  const cost = run('dataManager.addBusinessCost({ name: "Laptop", amount: 4000 })');
  assert.ok(cost.id);
  run(`dataManager.markBusinessCostPurchased("${cost.id}")`);
  const after = run('dataManager.getBusinessCosts()[0]');
  assert.ok(after.lastPurchaseDate, 'markBusinessCostPurchased zapisuje lastPurchaseDate');
});

test('getIncomeByMonth / getMonthlyStats: agregacja per miesiąc', () => {
  const { run } = fresh();
  run('dataManager.addIncome({ amount: 1000, source: "A", date: "2026-05-05" })');
  run('dataManager.addIncome({ amount: 2000, source: "B", date: "2026-05-20" })');
  run('dataManager.addIncome({ amount: 999, source: "C", date: "2026-06-01" })');
  assert.equal(run('dataManager.getIncomeByMonth(2026, 4).length'), 2, 'maj = month 4');
  const stats = run('dataManager.getMonthlyStats(2026, 4)');
  assert.equal(stats.totalIncome, 3000);
});
