/**
 * Widmowe „Do odłożenia 2700" bez żadnych celów (zgłoszenie Kamila 2026-07-25).
 * Przyczyna: getPlannedExpenses/_getPlannedFromStorage przy braku override
 * wracały do pliku demo data/planned.json (Edukacja 500 + Remont 1500), a
 * pierwszy addPlannedGoal ZATRZASKIWAŁ cele demo do danych usera.
 * Red-first: brak override = ZERO celów; add nie przemyca demo.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const withFileDefaults = () => {
  const app = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'] });
  // Symulacja załadowanego data/planned.json (jak na realnym urządzeniu)
  app.run(`dataManager.planned = { plannedExpenses: [
    { id: 'child-education', name: 'Edukacja dziecka', targetAmount: 50000, monthlyContribution: 500 },
    { id: 'apartment-renovation', name: 'Remont mieszkania', targetAmount: 80000, monthlyContribution: 1500 }
  ] }`);
  return app;
};

test('bez override: getPlannedExpenses zwraca [] (plik demo nie przecieka)', () => {
  const { run } = withFileDefaults();
  assert.equal(run('dataManager.getPlannedExpenses().length'), 0, 'cele demo z pliku widoczne jako cele usera');
});

test('pierwszy addPlannedGoal nie zatrzaskuje celów demo do danych', () => {
  const { run } = withFileDefaults();
  run(`dataManager.addPlannedGoal({ name: 'Mój cel', type: 'recurring', monthlyContribution: 300 })`);
  const goals = run('dataManager.getPlannedExpenses()');
  assert.equal(goals.length, 1, `w danych wylądowało ${goals.length} celów (demo przemycone)`);
  assert.equal(goals[0].name, 'Mój cel');
});

test('koperta: updatePlannedProgress dolicza wpłatę do currentAmount celu', () => {
  const { run } = withFileDefaults();
  run(`dataManager.addPlannedGoal({ name: 'Wakacje', targetAmount: 10000, currentAmount: 0 })`);
  const id = run('dataManager.getPlannedExpenses()[0].id');
  run(`dataManager.updatePlannedProgress('${id}', 500)`);
  run(`dataManager.updatePlannedProgress('${id}', 250)`);
  assert.equal(run('dataManager.getPlannedExpenses()[0].currentAmount'), 750, 'dwie wpłaty do koperty zsumowane');
});
