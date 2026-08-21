/**
 * Średnie zarobki 12 mies. + wzrost rok do roku (żądanie Kamila 2026-07-26).
 * Definicja: średnia miesięczna z ostatnich 12 mies. vs średnia z poprzednich
 * 12 mies. (mies. 13–24 wstecz), per Żona/Mąż/Razem; wpłaty wg dat + korzyści
 * firmowe u Męża (spójnie z wykresem). Okna liczone od pierwszego REGULARNEGO
 * śledzenia (pierwsza wpłata / start cyklicznej korzyści) — miesiące sprzed
 * danych nie rozwadniają średniej; brak danych porównawczych → yoy null.
 * Od 2026-08-21 okna kończą się na ostatnim ZAMKNIĘTYM miesiącu (bez
 * trwającego) — stąd seedy do 2026-06 przy now=2026-07-15.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-07-15T12:00:00' });

const seedMonthly = (run, srcVar, from, to, amount) => {
  run(`(function(){
    const src = ${srcVar};
    let [y, m] = '${from}'.split('-').map(Number);
    const [ey, em] = '${to}'.split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      dataManager.recordPayment(src.id, { amount: ${amount}, date: y + '-' + String(m).padStart(2, '0') + '-10' });
      m++; if (m > 12) { m = 1; y++; }
    }
  })()`);
};

test('yoy: wzrost średniej rok do roku (+25%) przy pełnych oknach', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true })`);
  seedMonthly(run, 'window.__src', '2024-07', '2025-06', 4000);
  seedMonthly(run, 'window.__src', '2025-07', '2026-06', 5000);
  const yoy = run('dataManager.getYearOverYear()');
  assert.equal(yoy.husband.avg, 5000, 'średnia z ostatnich 12 mies.');
  assert.equal(yoy.husband.yoy, 25, '+25% rok do roku');
  assert.equal(yoy.total.yoy, 25, 'razem tak samo (tylko Mąż zarabia)');
});

test('yoy: spadek daje ujemny procent', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'wife', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  seedMonthly(run, 'window.__src', '2024-07', '2025-06', 6000);
  seedMonthly(run, 'window.__src', '2025-07', '2026-06', 4800);
  const yoy = run('dataManager.getYearOverYear()');
  assert.equal(yoy.wife.avg, 4800);
  assert.equal(yoy.wife.yoy, -20, '-20% rok do roku');
});

test('yoy: krótka historia — miesiące sprzed danych nie rozwadniają, brak porównania = null', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'wife', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  seedMonthly(run, 'window.__src', '2026-02', '2026-07', 6000);
  const yoy = run('dataManager.getYearOverYear()');
  assert.equal(yoy.wife.avg, 6000, 'średnia z 6 realnych miesięcy, nie /12');
  assert.equal(yoy.wife.yoy, null, 'poprzednie okno bez danych → null');
});

test('yoy: korzyści firmowe wliczone Mężowi', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true })`);
  seedMonthly(run, 'window.__src', '2025-08', '2026-07', 5000);
  run(`dataManager.addBusinessCost({ name: 'Abonament', amount: 300, isRecurring: true, recurringMonths: 1, activeFrom: '2025-08' })`);
  const yoy = run('dataManager.getYearOverYear()');
  assert.equal(yoy.husband.avg, 5300, '5000 wpłat + 300 korzyści');
});
