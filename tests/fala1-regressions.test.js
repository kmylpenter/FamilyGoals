/**
 * FALA 1 — testy regresyjne (red-first) dla bugów z logs/AUDIT-2026-07-24.md.
 * Każdy test opisuje ZAMIERZONE zachowanie po naprawie; przed naprawą
 * pada z powodu audytowanego buga (id w nazwie testu).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./harness/load-app');
const { createBrowserEnv, PROJECT_ROOT } = require('./harness/browser-env');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

// --- C-C1: edycja celu cyklicznego nie może niszczyć monthlyContribution ---
test('C-C1: updatePlannedGoal na celu cyklicznym (bez targetDate) zachowuje monthlyContribution', () => {
  const { run } = dm();
  const goal = run(`dataManager.addPlannedGoal({ name: "Leasing", type: "recurring", monthlyContribution: 1200, targetAmount: 1200, startDate: "2024-01-01", endDate: "2028-07-01" })`);
  // Edycja jak z formularza: targetAmount obecne, targetDate brak
  run(`dataManager.updatePlannedGoal("${goal.id}", { name: "Leasing auta", type: "recurring", monthlyContribution: 1200, targetAmount: 1200 })`);
  const after = run(`dataManager.getPlannedExpenses().find(g => g.id === "${goal.id}")`);
  assert.equal(after.monthlyContribution, 1200, `monthlyContribution zniszczone: ${after.monthlyContribution}`);
});

// --- B-M1: usunięcie wpłaty usuwa też lustrzany wpis z income[] ---
test('B-M1: deletePayment usuwa lustrzany wpis z income[]', () => {
  const { run } = dm();
  const src = run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000 })');
  const pay = run(`dataManager.recordPayment("${src.id}", { amount: 5000, date: "2026-07-10" })`);
  assert.equal(run('dataManager.getIncome().length'), 1, 'mirror powstał');
  run(`dataManager.deletePayment("${src.id}", "${pay.id}")`);
  assert.equal(run('dataManager.getIncome().length'), 0, 'mirror w income[] został po deletePayment');
});

test('B-M1b: clearPaymentsForMonth usuwa lustrzane wpisy z income[]', () => {
  const { run } = dm();
  const src = run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000 })');
  run(`dataManager.recordPayment("${src.id}", { amount: 5000, date: "2026-07-10" })`);
  run(`dataManager.recordPayment("${src.id}", { amount: 200, date: "2026-06-01" })`);
  run(`dataManager.clearPaymentsForMonth("${src.id}", 2026, 6)`); // lipiec
  const july = run('dataManager.getIncomeByMonth(2026, 6).length');
  assert.equal(july, 0, 'mirror lipcowej wpłaty został w income[]');
  assert.equal(run('dataManager.getIncomeByMonth(2026, 5).length'), 1, 'czerwiec nietknięty');
});

// --- OWN-8: wpłata bez daty dostaje dzisiejszą datę w OBU magazynach ---
test('OWN-8: recordPayment bez date → mirror w income[] ma poprawną datę (nie undefined)', () => {
  const { run } = dm('2026-07-15T12:00:00');
  const src = run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000 })');
  run(`dataManager.recordPayment("${src.id}", { amount: 5000 })`);
  const mirror = run('dataManager.getIncome()[0]');
  assert.ok(mirror.date, `mirror.date = ${mirror.date}`);
  assert.equal(run('dataManager.getIncomeByMonth(2026, 6).length'), 1, 'wpłata niewidoczna w filtrze miesiąca');
});

test('OWN-8b: addIncome({date: undefined}) dostaje domyślną datę', () => {
  const { run } = dm('2026-07-15T12:00:00');
  run('dataManager.addIncome({ amount: 100, source: "X", date: undefined })');
  const inc = run('dataManager.getIncome()[0]');
  assert.ok(inc.date, `date = ${inc.date}`);
});

// --- B-M4: pozycje stałe z dniem 29-31 naliczają się w krótkich miesiącach ---
test('B-M4: processRecurring nalicza recurringDay=31 w lutym (clamp do końca miesiąca)', () => {
  const { run } = dm('2026-02-28T10:00:00');
  run(`dataManager.addExpense({ amount: 900, categoryId: "housing", description: "Czynsz", isRecurring: true, recurringDay: 31 })`);
  const processed = run('dataManager.processRecurring()');
  assert.equal(processed.length, 1, 'pozycja stała z dniem 31 pominięta w lutym');
});

test('B-M4b: processRecurring nalicza także PO dniu recurringDay (catch-up w miesiącu)', () => {
  const { run } = dm('2026-07-20T10:00:00');
  run(`dataManager.addExpense({ amount: 900, categoryId: "housing", description: "Czynsz", isRecurring: true, recurringDay: 10 })`);
  const processed = run('dataManager.processRecurring()');
  assert.equal(processed.length, 1, 'apka odpalona po 10. dniu → pozycja przepada');
  // Idempotencja: drugi run nie dubluje
  assert.equal(run('dataManager.processRecurring()').length, 0);
});

// --- B-C1: oficjalna ścieżka importu odświeża dane widoczne przez gettery ---
test('B-C1: dataManager.importBackup() zapisuje dane i invaliduje cache', () => {
  const { run } = dm();
  run('dataManager.addIncomeSource({ name: "Stare", amount: 1 })');
  run('dataManager.getIncomeSources()'); // grzeje cache
  run(`dataManager.importBackup({ incomeSources: [{ id: "n1", name: "Nowe", amount: 2, payments: [] }] })`);
  const after = run('dataManager.getIncomeSources()');
  assert.equal(after.length, 1);
  assert.equal(after[0].name, 'Nowe', 'import niewidoczny (stale cache)');
});

// --- D-M1/OWN-5: getDateString liczy dzień w czasie LOKALNYM ---
test('D-M1: getDateString zwraca lokalną datę (00:30 w Warszawie = ten sam dzień)', () => {
  assert.match(process.env.TZ || '', /Warsaw/, 'testy muszą biec z TZ=Europe/Warsaw (npm test)');
  const { run } = loadApp({ scripts: ['js/utils.js'] });
  assert.equal(run('getDateString(new Date(2026, 6, 6, 0, 30))'), '2026-07-06');
  assert.equal(run('getDateString(new Date(2026, 6, 6, 23, 30))'), '2026-07-06');
});

// --- E-C2: PIN działa bez crypto.subtle (insecure context) ---
test('E-C2: verify() działa bez crypto.subtle — fallback na hash synchroniczny', async () => {
  const env = createBrowserEnv();
  env.crypto = {}; // insecure context: brak subtle
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/pin-manager.js'], env });
  run('localStorage.setItem("familygoals_pin", btoa("4321" + "familygoals_2025"))');
  const res = await run('PinManager.verify("4321")');
  assert.equal(res.success, true, 'verify rzuca/odrzuca bez crypto.subtle');
});

test('E-C2b: setPin() działa bez crypto.subtle i verify go akceptuje', async () => {
  const env = createBrowserEnv();
  env.crypto = {};
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/pin-manager.js'], env });
  await run('PinManager.setPin("1234")');
  const res = await run('PinManager.verify("1234")');
  assert.equal(res.success, true);
});

// --- E-C1: sw.js precache relatywny i kompletny (działa pod subpath GitHub Pages) ---
test('E-C1: sw.js ASSETS — ścieżki relatywne, pliki istnieją, config.json obecny', () => {
  const sw = fs.readFileSync(path.join(PROJECT_ROOT, 'sw.js'), 'utf8');
  const m = sw.match(/const ASSETS = \[([\s\S]*?)\]/);
  assert.ok(m, 'nie znaleziono listy ASSETS w sw.js');
  const assets = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.ok(assets.length > 10, 'lista ASSETS podejrzanie krótka');
  const absolute = assets.filter((a) => a.startsWith('/'));
  assert.deepEqual(absolute, [], `absolutne ścieżki psują subpath GitHub Pages: ${absolute.join(', ')}`);
  for (const a of assets) {
    const rel = a.replace(/^\.\//, '');
    if (rel === '' || rel === '.') continue;
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, rel)), `ASSET nie istnieje na dysku: ${a}`);
  }
  assert.ok(assets.some((a) => a.includes('data/config.json')), 'data/config.json poza precache');
});

// --- C-M3/C-m9: brak zahardkodowanych dat w formularzach ---
test('C-M3: index.html bez zahardkodowanych value w polach type="date"', () => {
  const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  const hardcoded = html.match(/<input type="date" value="[^"]+"/g) || [];
  assert.deepEqual(hardcoded, [], `zahardkodowane daty psują domyślny miesiąc: ${hardcoded.join(' | ')}`);
});
