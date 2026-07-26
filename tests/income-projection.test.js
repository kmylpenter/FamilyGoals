/**
 * Projekcja „ile realnie daje" do karty Wasze przychody (Kamil 2026-07-26):
 * kolumna „/" = założenia cykliczne (wybrany miesiąc) + średnia 12-mies.
 * DODATKOWYCH pieniędzy: dla osób nadwyżka wpłat kasowych ponad założenia
 * (obejmuje źródła jednorazowe i nadpłaty), dla korzyści średnia jednorazowych.
 * Okno od pierwszego regularnego śledzenia (bez rozwadniania zerami).
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

test('projekcja: założenia + śr. nadwyżek (wpłaty 6000 przy założeniu 5000 → projekcja 6000)', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  seedMonthly(run, 'window.__src', '2025-08', '2026-07', 6000);
  const p = run('dataManager.getIncomeProjection(2026, 6)');
  assert.equal(p.husband.recurringExpected, 5000);
  assert.equal(p.husband.extrasAvg, 1000, 'śr. nadwyżki 1000/mies.');
  assert.equal(p.husband.projected, 6000);
});

test('projekcja: wpłaty jednorazowe (oneoff) wchodzą w nadwyżkę', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  seedMonthly(run, 'window.__src', '2025-08', '2026-07', 5000);
  run(`window.__bonus = dataManager.addIncomeSource({ name: 'Bonus', owner: 'husband', expectedAmount: 0, incomeType: 'oneoff', isActive: true, forMonth: '2026-01' })`);
  run(`dataManager.recordPayment(window.__bonus.id, { amount: 2400, date: '2026-01-15' })`);
  const p = run('dataManager.getIncomeProjection(2026, 6)');
  assert.equal(p.husband.extrasAvg, 200, '2400 raz w roku = 200/mies.');
  assert.equal(p.husband.projected, 5200);
});

test('projekcja: osoba bez wpłat = same założenia; miesiące pod założeniami nie odejmują', () => {
  const { run } = dm();
  run(`dataManager.addIncomeSource({ name: 'Etat', owner: 'wife', expectedAmount: 4000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  seedMonthly(run, 'window.__src', '2025-08', '2026-01', 4000); // PONIŻEJ założeń
  seedMonthly(run, 'window.__src', '2026-02', '2026-07', 5000);
  const p = run('dataManager.getIncomeProjection(2026, 6)');
  assert.equal(p.wife.projected, 4000, 'Żona: same założenia');
  assert.equal(p.husband.extrasAvg, 0, 'niedopłaty nie dają ujemnych nadwyżek');
  assert.equal(p.husband.projected, 5000);
});

test('projekcja korzyści: cykliczne bieżące + śr. jednorazowych z 12 mies.', () => {
  const { run } = dm();
  run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  run(`dataManager.addBusinessCost({ name: 'Abonament', amount: 300, isRecurring: true, recurringMonths: 1, activeFrom: '2025-08' })`);
  run(`dataManager.addBusinessCost({ name: 'Ubezpieczenie', amount: 2400, isRecurring: false, recurringMonths: null, lastPurchaseDate: '2026-06-10T10:00:00.000Z' })`);
  const p = run('dataManager.getIncomeProjection(2026, 6)');
  assert.equal(p.business.recurringMonthly, 300, 'cykliczne naliczenie bieżące');
  assert.equal(p.business.oneoffAvg, 200, '2400 raz w roku = 200/mies.');
  assert.equal(p.business.projected, 500);
});

test('projekcja: szczegółowe listy składników (cykliczne + jednorazowe z okna)', () => {
  const { run } = dm();
  run(`window.__src = dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 5000, incomeType: 'recurring', isActive: true, activeFrom: '2025-08' })`);
  seedMonthly(run, 'window.__src', '2025-08', '2026-07', 5000);
  run(`dataManager.addBusinessCost({ name: 'Abonament', amount: 300, isRecurring: true, recurringMonths: 1, activeFrom: '2025-08' })`);
  run(`dataManager.addBusinessCost({ name: 'Ubezpieczenie', amount: 2400, isRecurring: false, recurringMonths: null, lastPurchaseDate: '2026-06-10T10:00:00.000Z' })`);
  run(`dataManager.addBusinessCost({ name: 'Stary zakup poza oknem', amount: 999, isRecurring: false, recurringMonths: null, lastPurchaseDate: '2024-01-10T10:00:00.000Z' })`);
  const p = run('dataManager.getIncomeProjection(2026, 6)');
  assert.equal(p.business.recurringItems.length, 1);
  assert.equal(p.business.recurringItems[0].name, 'Abonament');
  assert.equal(p.business.recurringItems[0].monthly, 300);
  assert.equal(p.business.oneoffItems.length, 1, 'tylko jednorazowe z okna 12 mies.');
  assert.equal(p.business.oneoffItems[0].name, 'Ubezpieczenie');
  assert.equal(p.business.oneoffItems[0].amount, 2400);
  assert.equal(p.husband.recurringSources.length, 1);
  assert.equal(p.husband.recurringSources[0].name, 'Pensja');
  assert.equal(p.husband.recurringSources[0].expected, 5000);
});
