/**
 * Wykres kończy się na ostatnim ZAMKNIĘTYM miesiącu (zgłoszenie Kamila
 * 2026-08-21): pieniądze za trwający miesiąc przychodzą dopiero w kolejnym,
 * więc bieżący, niepełny miesiąc wyglądał na wykresie jak załamanie
 * przychodów. Okna trendu (i legendy Śr. 12M) NIE obejmują bieżącego miesiąca.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-08-21T12:00:00' });

test("wykres: getTrendByOwner('auto') kończy się na ostatnim zamkniętym miesiącu", () => {
  const { run } = dm();
  const src = run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 6000, incomeType: 'recurring', isActive: true, activeFrom: '2026-06' })`);
  run(`dataManager.recordPayment('${src.id}', { amount: 6000, date: '2026-07-10' })`);
  run(`dataManager.recordPayment('${src.id}', { amount: 6000, date: '2026-08-05' })`); // trwający sierpień
  const trend = run(`dataManager.getTrendByOwner('auto')`);
  const last = trend[trend.length - 1];
  assert.equal(last.year, 2026);
  assert.equal(last.month, 6, 'ostatni punkt = lipiec (sierpień jeszcze trwa)');
});

test('wykres: okno liczbowe też bez bieżącego miesiąca', () => {
  const { run } = dm();
  const src = run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'wife', expectedAmount: 100, incomeType: 'recurring', isActive: true })`);
  run(`dataManager.recordPayment('${src.id}', { amount: 100, date: '2026-08-05' })`);
  const t = run('dataManager.getTrendByOwner(1)');
  assert.equal(t.length, 1);
  assert.equal(t[0].month, 6, 'okno (1) = lipiec, nie sierpień');
  assert.equal(t[0].wifeIncome, 0, 'sierpniowa wpłata poza wykresem');
});

test('Śr. 12M (legenda): średnia bez rozwodnienia trwającym miesiącem', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  // 12 pełnych miesięcy po 6000 (2025-08..2026-07) + niepełny sierpień 3000
  run(`(function(){
    let [y, m] = [2025, 8];
    for (let i = 0; i < 12; i++) {
      dataManager.recordPayment(window.__src.id, { amount: 6000, date: y + '-' + String(m).padStart(2, '0') + '-10' });
      m++; if (m > 12) { m = 1; y++; }
    }
    dataManager.recordPayment(window.__src.id, { amount: 3000, date: '2026-08-10' });
  })()`);
  const yoy = run('dataManager.getYearOverYear()');
  assert.equal(yoy.husband.avg, 6000, 'okno 2025-08..2026-07, sierpień nie zaniża');
});
