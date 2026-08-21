/**
 * Wydatki — przywrócone jako pełnoprawna encja (żądanie Kamila 2026-07-28).
 * Red-first: WSPÓLNY rejestr wydatków (bez podziału mąż/żona) z kategorią
 * i datą + wydatki STAŁE naliczane co miesiąc w zakresie od–do (model
 * korzyści firmowych: JEDNA definicja + naliczenia wyliczane w locie, zero
 * duplikatów przy syncu). Wydatki mają własną linię na wykresie i własną
 * kartę podsumowania; NIE wchodzą w wyliczenia przychodów.
 *
 * Zasada Kamila „zero fabrykacji wstecz": stały bez activeFrom liczy się od
 * miesiąca dodania (createdAt), nigdy wstecz i nigdy w przyszłość.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const fresh = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

test('rejestr: wydatek zapisuje kategorię, opis i datę (bez podziału na osoby)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20' })`);
  const e = run('dataManager.getExpenses()[0]');
  assert.equal(e.amount, 250);
  assert.equal(e.categoryId, 'food');
  assert.equal(e.description, 'Biedronka');
  assert.equal(e.date, '2026-07-20', 'data z formularza nie może być nadpisana dzisiejszą');
  assert.ok(e.id, 'wydatek musi mieć id (klucz rekordu synca)');
  assert.ok(e.createdAt, 'createdAt potrzebny dla stałych bez activeFrom');
});

test('historia: jednorazowy wydatek daje jeden wpis pod swoją datą', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20' })`);
  const entries = run('dataManager.getExpenseEntries()');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, '2026-07-20');
  assert.equal(entries[0].amount, 250);
  assert.equal(entries[0].isAccrual, false, 'jednorazowy to fakt, nie naliczenie');
});

// Decyzja Kamila 2026-07-28: wydatki są WSPÓLNE — żadnego „wydatki Męża/Żony".
test('wydatki są wspólne: wpis historii nie niesie właściciela', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20', owner: 'wife' })`);
  const e = run('dataManager.getExpenseEntries()[0]');
  assert.equal(e.owner, undefined, 'wydatek nie ma właściciela (nawet gdy legacy rekord go niesie)');
});

test('stały: nalicza się w KAŻDYM miesiącu zakresu od–do i nigdzie poza nim', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-02', activeTo: '2026-05' })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-02,2026-03,2026-04,2026-05', `zakres luty–maj, dostałem: ${months}`);
  const all = run('dataManager.getExpenseEntries()');
  assert.ok(all.every(e => e.amount === 43), 'każde naliczenie to pełna kwota miesięczna');
  assert.ok(all.every(e => e.isAccrual === true), 'naliczenia oznaczone jako naliczenia');
});

test('stały: bez activeFrom liczy się od miesiąca dodania (zero fabrykacji wstecz)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 100, categoryId: 'other', description: 'Siłownia', isRecurring: true })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-07', `tylko miesiąc dodania, dostałem: ${months}`);
});

test('stały: bez activeTo nalicza do BIEŻĄCEGO miesiąca włącznie, nie w przyszłość', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 60, categoryId: 'health', description: 'Ubezpieczenie', isRecurring: true, activeFrom: '2026-05' })`);
  const months = run('dataManager.getExpenseEntries().map(e => e.date.slice(0,7)).sort().join(",")');
  assert.equal(months, '2026-05,2026-06,2026-07', `maj–lipiec (dziś), dostałem: ${months}`);
});

test('stały: zakres w całości w przyszłości nie daje żadnych naliczeń', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 500, categoryId: 'housing', description: 'Przyszły czynsz', isRecurring: true, activeFrom: '2027-01' })`);
  assert.equal(run('dataManager.getExpenseEntries().length'), 0);
});

test('SSOT: edycja kwoty stałego przelicza WSZYSTKIE naliczenia (jedna definicja)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-05' }).id`);
  run(`dataManager.updateExpense('${id}', { amount: 55 })`);
  const amounts = run('dataManager.getExpenseEntries().map(e => e.amount).join(",")');
  assert.equal(amounts, '55,55,55', `po edycji wszystkie naliczenia 55, dostałem: ${amounts}`);
});

test('usunięcie stałego kasuje jego naliczenia z historii', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-05' }).id`);
  run(`dataManager.deleteExpense('${id}')`);
  assert.equal(run('dataManager.getExpenseEntries().length'), 0);
});

test('wpis historii niesie id wydatku — edycja z historii ma co otworzyć', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const id = run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-07' }).id`);
  assert.equal(run('dataManager.getExpenseEntries()[0].expenseId'), id);
});

test('sync: nowy wydatek ląduje w kolejce do arkusza (żona widzi wpisy męża)', async () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/event-bus.js', 'js/sync-manager.js'] });
  run(`localStorage.setItem('familygoals_sync_config', JSON.stringify({ url: 'https://backend.test/exec', token: 'TOK', enabled: true }))`);
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20' })`);
  await run('syncManager.detectChanges()');
  const queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  const mine = queue.filter((q) => q.entity === 'expenses');
  assert.equal(mine.length, 1, `wydatek nie trafił do kolejki synca (kolejka: ${JSON.stringify(queue)})`);
  assert.equal(mine[0].record.amount, 250);
  assert.ok(mine[0].record.updatedAt, 'rekord w kolejce ma updatedAt (LWW)');
});

// ===== Wykres: trzecia linia (czerwona) + karta podsumowania (2026-07-28) =====

test('wykres: trend niesie sumę wydatków per miesiąc (linia czerwona)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-05' })`);
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-06-20' })`);
  const t = run('dataManager.getTrendByOwner(3)'); // okno kwi–cze (bez trwającego lipca)
  const byYm = {};
  t.forEach(p => { byYm[`${p.year}-${String(p.month + 1).padStart(2, '0')}`] = p.expenses; });
  assert.equal(byYm['2026-04'], 0, 'kwiecień: przed pierwszym wydatkiem');
  assert.equal(byYm['2026-05'], 43, 'maj: samo naliczenie stałego');
  assert.equal(byYm['2026-06'], 293, 'czerwiec: naliczenie 43 + jednorazowy 250');
});

test('wykres: wydatki NIE mieszają się do przychodów (osobna linia)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 999, categoryId: 'food', description: 'Duży wydatek', date: '2026-06-10' })`);
  const t = run('dataManager.getTrendByOwner(1)'); // okno = czerwiec
  assert.equal(t[0].expenses, 999);
  assert.equal(t[0].totalIncome, 0, 'przychód nietknięty');
  assert.equal(t[0].wifeIncome, 0);
  assert.equal(t[0].husbandIncome, 0);
});

test('podsumowanie: karta dzieli miesiąc na stałe i jednorazowe + razem', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 43, categoryId: 'entertainment', description: 'Netflix', isRecurring: true, activeFrom: '2026-06' })`);
  run(`dataManager.addExpense({ amount: 1200, categoryId: 'housing', description: 'Czynsz', isRecurring: true, activeFrom: '2026-01' })`);
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20' })`);
  const s = run('dataManager.getMonthExpensesSummary(2026, 6)');
  assert.equal(s.recurring, 1243, 'stałe: 43 + 1200');
  assert.equal(s.oneoff, 250, 'jednorazowe: 250');
  assert.equal(s.total, 1493, 'razem');
  assert.equal(s.items.length, 3, 'składniki do okienka „skąd ta kwota"');
});

test('podsumowanie: kategorie posortowane malejąco (na co idzie najwięcej)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.addExpense({ amount: 1200, categoryId: 'housing', description: 'Czynsz', date: '2026-07-05' })`);
  run(`dataManager.addExpense({ amount: 250, categoryId: 'food', description: 'Biedronka', date: '2026-07-20' })`);
  run(`dataManager.addExpense({ amount: 90, categoryId: 'food', description: 'Lidl', date: '2026-07-22' })`);
  const cats = run('dataManager.getMonthExpensesSummary(2026, 6).byCategory');
  assert.equal(cats[0].categoryId, 'housing');
  assert.equal(cats[0].amount, 1200);
  assert.equal(cats[1].categoryId, 'food');
  assert.equal(cats[1].amount, 340, 'kategoria sumuje swoje wpisy');
});

test('podsumowanie: pusty miesiąc = same zera (bez wybuchu)', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  const s = run('dataManager.getMonthExpensesSummary(2026, 6)');
  assert.equal(s.total, 0);
  assert.equal(s.items.length, 0);
  assert.equal(s.byCategory.length, 0);
});

// Widmo z data/config.json: kategorie demo niosą budżety (Mieszkanie 3000,
// Jedzenie 2000...), których Kamil NIGDY nie ustawiał — nie ma nawet UI do
// ich wpisania. Dopóki wydatków nie było, alerty spały. Zasada Kamila:
// wydatki to REJESTR, zero wyliczeń z widmowych wartości.
test('brak widmowych alertów budżetowych z domyślnego configu', () => {
  const { run } = fresh('2026-07-28T12:00:00');
  run(`dataManager.config = { categories: [{ id: 'housing', name: 'Mieszkanie', icon: '🏠', budget: 3000 }] }`);
  run(`dataManager.addExpense({ amount: 9999, categoryId: 'housing', description: 'Remont', date: '2026-07-15' })`);
  // .length, nie deepEqual — tablica z kontekstu vm ma inny prototyp Array
  const alerts = run('JSON.stringify(dataManager.getBudgetAlerts())');
  assert.equal(alerts, '[]', `wyskoczył alert z budżetu, którego user nie ustawił: ${alerts}`);
});
