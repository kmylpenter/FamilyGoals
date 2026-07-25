/**
 * Zakres od–do cyklicznych korzyści firmowych (żądanie Kamila 2026-07-25:
 * np. leasing auta zaczyna się i kończy w określonym okresie).
 * Red-first: calculateBusinessSavings ma honorować activeFrom/activeTo (YYYY-MM)
 * dla korzyści cyklicznych; brak pól = bezterminowo (stare wpisy bez zmian).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const fresh = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'] });

test('od–do: cykliczna korzyść liczy się tylko w miesiącach zakresu', () => {
  const { run } = fresh();
  run(`dataManager.addBusinessCost({ name: 'Leasing auta', amount: 600, isRecurring: true, recurringMonths: 1, activeFrom: '2026-01', activeTo: '2026-06' })`);
  assert.equal(run('dataManager.calculateBusinessSavings(2025, 11)'), 0, 'grudzień 2025: przed zakresem');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 0)'), 600, 'styczeń: start zakresu');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 5)'), 600, 'czerwiec: koniec zakresu');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 6)'), 0, 'lipiec: po zakresie');
});

test('od–do: puste "do" = bezterminowo od activeFrom', () => {
  const { run } = fresh();
  run(`dataManager.addBusinessCost({ name: 'Abonament', amount: 120, isRecurring: true, recurringMonths: 1, activeFrom: '2026-03' })`);
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 1)'), 0, 'luty: przed activeFrom');
  assert.equal(run('dataManager.calculateBusinessSavings(2027, 8)'), 120, 'wrzesień 2027: bezterminowo');
});

// Zmiana semantyki 2026-07-25 (zasada Kamila: wpłaty = datowane fakty, zero
// fabrykacji wstecz): cykliczna BEZ activeFrom liczy się od miesiąca DODANIA
// (createdAt), nie od zawsze — spójnie z naliczeniami w historii wpłat.
test('od–do: korzyść bez pól zakresu liczy się od miesiąca dodania (bez fabrykacji wstecz)', () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-07-15T12:00:00' });
  run(`dataManager.addBusinessCost({ name: 'Stary abonament', amount: 90, isRecurring: true, recurringMonths: 1 })`);
  assert.equal(run('dataManager.calculateBusinessSavings(2024, 0)'), 0, 'przed dodaniem: nie liczona');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 6)'), 90, 'miesiąc dodania: liczona');
  assert.equal(run('dataManager.calculateBusinessSavings(2028, 11)'), 90, 'w przód: liczona (bez końca zakresu)');
});

test('od–do: Nadchodzące zakupy nie pokazują cyklicznej przed startem ani po końcu zakresu', () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-07-15T12:00:00' });
  run(`dataManager.addBusinessCost({ name: 'Przyszly leasing', amount: 900, isRecurring: true, recurringMonths: 1, activeFrom: '2027-01' })`);
  run(`dataManager.addBusinessCost({ name: 'Zakonczony leasing', amount: 500, isRecurring: true, recurringMonths: 1, activeTo: '2026-06' })`);
  run(`dataManager.addBusinessCost({ name: 'Biezacy abonament', amount: 120, isRecurring: true, recurringMonths: 1, activeFrom: '2026-01', activeTo: '2026-12' })`);
  const names = run('dataManager.getUpcomingBusinessCosts().map(c => c.name).join(",")');
  assert.ok(!names.includes('Przyszly leasing'), `przyszły (start 2027-01) widoczny w upcoming: ${names}`);
  assert.ok(!names.includes('Zakonczony leasing'), `zakończony (koniec 2026-06) widoczny w upcoming: ${names}`);
  assert.ok(names.includes('Biezacy abonament'), `bieżący (w zakresie) zniknął z upcoming: ${names}`);
});

test('od–do: rozkład co N miesięcy respektuje zakres (leasing co 3 mies.)', () => {
  const { run } = fresh();
  run(`dataManager.addBusinessCost({ name: 'Rata kwartalna', amount: 900, isRecurring: true, recurringMonths: 3, activeFrom: '2026-02', activeTo: '2026-10' })`);
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 0)'), 0, 'styczeń: przed zakresem');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 4)'), 300, 'maj: 900/3 w zakresie');
  assert.equal(run('dataManager.calculateBusinessSavings(2026, 10)'), 0, 'listopad: po zakresie');
});
