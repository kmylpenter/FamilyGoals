/**
 * Wydatki — przywrócone jako pełnoprawna encja (żądanie Kamila 2026-07-28).
 * Red-first: rejestr wydatków z osobą (👨/👩), kategorią i datą + wydatki STAŁE
 * naliczane co miesiąc w zakresie od–do (model korzyści firmowych: JEDNA
 * definicja + naliczenia wyliczane w locie, zero duplikatów przy syncu).
 *
 * Zasada Kamila „zero fabrykacji wstecz": stały bez activeFrom liczy się od
 * miesiąca dodania (createdAt), nigdy wstecz i nigdy w przyszłość.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const fresh = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

test('rejestr: wydatek zapisuje osobę, kategorię, opis i datę', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20', owner: 'wife' })`);
  const e = run('dataManager.getExpenses()[0]');
  assert.equal(e.amount, 250);
  assert.equal(e.categoryId, 'food');
  assert.equal(e.description, 'Biedronka');
  assert.equal(e.date, '2026-07-20', 'data z formularza nie może być nadpisana dzisiejszą');
  assert.equal(e.owner, 'wife');
  assert.ok(e.id, 'wydatek musi mieć id (klucz rekordu synca)');
  assert.ok(e.createdAt, 'createdAt potrzebny dla stałych bez activeFrom');
});

test('historia: jednorazowy wydatek daje jeden wpis pod swoją datą', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20', owner: 'wife' })`);
  const entries = run('dataManager.getExpenseEntries()');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, '2026-07-20');
  assert.equal(entries[0].amount, 250);
  assert.equal(entries[0].owner, 'wife');
  assert.equal(entries[0].isAccrual, false, 'jednorazowy to fakt, nie naliczenie');
});

test('stały: nalicza się w KAŻDYM miesiącu zakresu od–do i nigdzie poza nim', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', owner: 'husband', isRecurring: true, activeFrom: '2026-02', activeTo: '2026-05' })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-02,2026-03,2026-04,2026-05', `zakres luty–maj, dostałem: ${months}`);
  const all = run('dataManager.getExpenseEntries()');
  assert.ok(all.every(e => e.amount === 43), 'każde naliczenie to pełna kwota miesięczna');
  assert.ok(all.every(e => e.isAccrual === true), 'naliczenia oznaczone jako naliczenia');
});

test('stały: bez activeFrom liczy się od miesiąca dodania (zero fabrykacji wstecz)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 100, categoryId: 'other', description: 'Siłownia', owner: 'husband', isRecurring: true })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-07', `tylko miesiąc dodania, dostałem: ${months}`);
});

test('stały: bez activeTo nalicza do BIEŻĄCEGO miesiąca włącznie, nie w przyszłość', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 60, categoryId: 'health', description: 'Ubezpieczenie', owner: 'wife', isRecurring: true, activeFrom: '2026-05' })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-05,2026-06,2026-07', `maj–lipiec (dziś), dostałem: ${months}`);
});

test('stały: zakres w całości w przyszłości nie daje żadnych naliczeń', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 500, categoryId: 'housing', description: 'Przyszły czynsz', owner: 'husband', isRecurring: true, activeFrom: '2027-01' })`);
  assert.equal(run('dataManager.getExpenseEntries().length'), 0);
});

test('SSOT: edycja kwoty stałego przelicza WSZYSTKIE naliczenia (jedna definicja)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', owner: 'husband', isRecurring: true, activeFrom: '2026-05' }).id`);
  run(`dataManager.updateExpense('${id}', { amount: 55 })`);
  const amounts = run('dataManager.getExpenseEntries().map(e => e.amount).join(",")');
  assert.equal(amounts, '55,55,55', `po edycji wszystkie naliczenia 55, dostałem: ${amounts}`);
});

test('usunięcie stałego kasuje jego naliczenia z historii', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', owner: 'husband', isRecurring: true, activeFrom: '2026-05' }).id`);
  run(`dataManager.deleteExpense('${id}')`);
  assert.equal(run('dataManager.getExpenseEntries().length'), 0);
});

test('wpis historii niesie id wydatku — edycja z historii ma co otworzyć', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', owner: 'husband', isRecurring: true, activeFrom: '2026-07' }).id`);
  assert.equal(run('dataManager.getExpenseEntries()[0].expenseId'), id);
});

test('sync: nowy wydatek ląduje w kolejce do arkusza (żona widzi wpisy męża)', async () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/event-bus.js', 'js/sync-manager.js'] });
  run(`localStorage.setItem('familygoals_sync_config', JSON.stringify({ url: 'https://backend.test/exec', token: 'TOK', enabled: true }))`);
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20', owner: 'wife' })`);
  await run('syncManager.detectChanges()');
  const queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  const mine = queue.filter((q) => q.entity === 'expenses');
  assert.equal(mine.length, 1, `wydatek nie trafił do kolejki synca (kolejka: ${JSON.stringify(queue)})`);
  assert.equal(mine[0].record.amount, 250);
  assert.ok(mine[0].record.updatedAt, 'rekord w kolejce ma updatedAt (LWW)');
});
