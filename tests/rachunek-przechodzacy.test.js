/**
 * Rachunek przechodzący (decyzja Kamila 2026-08-23): wpłata zasila saldo
 * źródła, a przypisanie do miesięcy liczy się SAMO. Data wpłaty = kiedy
 * fizycznie wpłynęło i nie ma wpływu na alokację. Wykres zostaje prawdą
 * kasową — pula obsługuje tylko rozliczenie miesięcy (osobna decyzja).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const dm = (now) => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now });

/** Źródło jak Gotówka Kamila: 10 000/mies. od sierpnia 2025 */
const gotowka = (payments) => ({
  id: 'g', name: 'Gotówka', owner: 'husband', incomeType: 'recurring',
  expectedAmount: 10000, activeFrom: '2025-08', isActive: true, payments
});
const pay = (amount, date) => ({ id: 'p' + amount + date, amount, date, note: '' });

// ---------- saldo ----------

test('saldo: wpłacone 110 600 przy 120 000 należnych do końca lipca = zaległość 9400', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = gotowka([pay(110600, '2025-08-10')]);
  const b = run('dataManager.getSourceBalance(__src, 2026, 6)'); // do końca lipca
  assert.equal(b.months, 12, 'sie 2025 → lip 2026 to 12 miesięcy');
  assert.equal(b.owed, 120000);
  assert.equal(b.paid, 110600);
  assert.equal(b.balance, -9400, 'ujemne = zaległość');
});

test('saldo: nadpłata w przód jest dodatnia', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = gotowka([pay(150000, '2026-01-10')]);
  const b = run('dataManager.getSourceBalance(__src, 2026, 6)');
  assert.equal(b.balance, 30000, '150 000 − 120 000');
});

test('saldo: źródło jednorazowe jest poza modelem puli (null)', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = { id: 'b', name: 'Bonus', incomeType: 'oneoff', forMonth: '2026-07', expectedAmount: 700, payments: [] };
  assert.equal(run('dataManager.getSourceBalance(__src, 2026, 6)'), null);
});

// ---------- rozpiska nowej wpłaty ----------

test('rozpiska: 10 000 przy zaległości 9400 domyka lipiec i wchodzi 600 na sierpień', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = gotowka([pay(110600, '2025-08-10')]);
  const a = JSON.parse(run('JSON.stringify(dataManager.previewPaymentAllocation(__src, 10000))'));
  assert.deepEqual(a, [
    { year: 2026, month: 6, amount: 9400 },
    { year: 2026, month: 7, amount: 600 },
  ]);
});

test('rozpiska: 30 000 na czystym rachunku pokrywa trzy kolejne miesiące', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = gotowka([pay(120000, '2025-08-10')]); // opłacone do końca lipca
  const a = JSON.parse(run('JSON.stringify(dataManager.previewPaymentAllocation(__src, 30000))'));
  assert.deepEqual(a.map(x => [x.month, x.amount]), [[7, 10000], [8, 10000], [9, 10000]],
    'sierpień, wrzesień, październik po 10 000');
});

test('rozpiska: data wpłaty NIE zmienia alokacji', () => {
  const { run, ctx } = dm('2026-08-23T12:00:00');
  ctx.__src = gotowka([pay(110600, '2025-08-10')]);
  const wSierpniu = run('dataManager.previewPaymentAllocation(__src, 10000)');
  ctx.__src2 = gotowka([pay(110600, '2025-08-10')]);
  const a2 = run('dataManager.previewPaymentAllocation(__src2, 10000)');
  assert.deepEqual(a2, wSierpniu);
});

// ---------- etykieta z alokacji, nie z daty ----------

test('etykieta wpłaty bierze się z ALOKACJI, nie z daty wpisu', () => {
  const { run } = dm('2026-08-23T12:00:00');
  run(`dataManager.addIncomeSource({ id: 'g', name: 'Gotówka', owner: 'husband', incomeType: 'recurring', expectedAmount: 10000, activeFrom: '2026-07', isActive: true })`);
  const id = run(`dataManager.getIncomeSources()[0].id`);
  // wpłacona DZIŚ (23.08), ale domyka lipiec i część sierpnia
  const p = run(`dataManager.recordPayment('${id}', { amount: 15000, date: '2026-08-23', note: '' })`);
  assert.equal(p.note, 'Gotówka za lipiec–sierpień 2026');
});

test('pojedynczy miesiąc w etykiecie bez myślnika', () => {
  const { run } = dm('2026-08-23T12:00:00');
  run(`dataManager.addIncomeSource({ id: 'g', name: 'Gotówka', owner: 'husband', incomeType: 'recurring', expectedAmount: 10000, activeFrom: '2026-07', isActive: true })`);
  const id = run(`dataManager.getIncomeSources()[0].id`);
  const p = run(`dataManager.recordPayment('${id}', { amount: 10000, date: '2026-08-23', note: '' })`);
  assert.equal(p.note, 'Gotówka za lipiec 2026');
});

test('źródło poza pulą (jednorazowe) nadal etykietuje z daty', () => {
  const { run } = dm('2026-08-23T12:00:00');
  run(`dataManager.addIncomeSource({ name: 'Bonus', owner: 'husband', incomeType: 'oneoff', forMonth: '2026-07', expectedAmount: 700, isActive: true })`);
  const id = run(`dataManager.getIncomeSources()[0].id`);
  const p = run(`dataManager.recordPayment('${id}', { amount: 700, date: '2026-07-25', note: '' })`);
  assert.equal(p.note, 'Bonus za lipiec 2026');
});

test('własna nazwa użytkownika ma pierwszeństwo', () => {
  const { run } = dm('2026-08-23T12:00:00');
  run(`dataManager.addIncomeSource({ name: 'Gotówka', owner: 'husband', incomeType: 'recurring', expectedAmount: 10000, activeFrom: '2026-07', isActive: true })`);
  const id = run(`dataManager.getIncomeSources()[0].id`);
  const p = run(`dataManager.recordPayment('${id}', { amount: 10000, date: '2026-08-23', note: 'Za remont' })`);
  assert.equal(p.note, 'Za remont');
});

// ---------- saldo nie zależy od oglądanego miesiąca ----------

test('saldo liczy się do ostatniego ZAMKNIĘTEGO miesiąca, nie do oglądanego', async () => {
  const { loadApp, ALL_SCRIPTS } = require('./harness/load-app');
  const { createBrowserEnv } = require('./harness/browser-env');
  const env = createBrowserEnv({ now: '2026-08-23T12:00:00' });
  const byId = new Map(), raw = env.document.createElement;
  const wc = (el) => { const k = new Map(); el.querySelector = (s) => { if (!k.has(s)) k.set(s, wc(raw())); return k.get(s); }; return el; };
  env.document.createElement = () => wc(raw());
  env.document.getElementById = (id) => { if (!byId.has(id)) { const e = env.document.createElement(); e.id = id; byId.set(id, e); } return byId.get(id); };
  env.closeAllModals = () => {}; env.openModal = () => {};
  // Pensja opłacona co do złotówki do końca lipca — w sierpniu NIE zalega
  env.localStorage.setItem('familygoals_income_sources', JSON.stringify([{
    id: 'p', name: 'Pensja', owner: 'husband', incomeType: 'recurring',
    expectedAmount: 6000, activeFrom: '2026-01', isActive: true,
    payments: [{ id: 'x', amount: 42000, date: '2026-01-15', note: '' }] // sty–lip = 7 × 6000
  }]));
  env.localStorage.setItem('familygoals_device_profile', 'husband');
  const { run } = loadApp({ scripts: ALL_SCRIPTS, env });
  await new Promise((r) => setTimeout(r, 0));
  run(`app.pickPaymentSource('p')`);
  const txt = env.document.getElementById('payment-source-info').querySelector('.payment-source-expected').textContent;
  assert.match(txt, /na bieżąco/i,
    `oglądamy sierpień, ale rachunek jest domknięty do lipca — nie „zaległość"; jest: "${txt}"`);
  assert.match(txt, /stan na lipiec/i, `podpis ma nazwać miesiąc odniesienia, jest: "${txt}"`);
});
