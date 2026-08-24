/**
 * Lista wpłat w oknie musi mówić, CZEGO dotyczy wpłata i CO znaczy data.
 * Zgłoszenie Kamila 2026-08-24: „widzę, że wpłaty za lipiec są w lipcu, a to
 * błąd" — lista pokazywała samą kwotę i datę, bez nazwy, więc data była
 * jedyną wskazówką i czytało się ją jako miesiąc rozliczenia.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, ALL_SCRIPTS } = require('./harness/load-app');
const { createBrowserEnv } = require('./harness/browser-env');

function boot(now, sources) {
  const env = createBrowserEnv({ now });
  const byId = new Map(), raw = env.document.createElement;
  const wc = (el) => { const k = new Map(); el.querySelector = (s) => { if (!k.has(s)) k.set(s, wc(raw())); return k.get(s); }; return el; };
  env.document.createElement = () => wc(raw());
  env.document.getElementById = (id) => { if (!byId.has(id)) { const e = env.document.createElement(); e.id = id; byId.set(id, e); } return byId.get(id); };
  env.closeAllModals = () => {}; env.openModal = () => {};
  env.localStorage.setItem('familygoals_income_sources', JSON.stringify(sources));
  env.localStorage.setItem('familygoals_device_profile', 'husband');
  const { run } = loadApp({ scripts: ALL_SCRIPTS, env });
  return { run, doc: env.document };
}

const GOTOWKA = [{
  id: 'g', name: 'Gotówka', owner: 'husband', incomeType: 'recurring',
  expectedAmount: 10000, activeFrom: '2026-01', isActive: true,
  payments: [{ id: 'p1', amount: 12900, date: '2026-07-15', note: 'Gotówka za czerwiec 2026', type: 'transfer' }]
}];

test('pozycja historii nazywa wpłatę, nie tylko kwotę i datę', async () => {
  const { run, doc } = boot('2026-08-24T12:00:00', GOTOWKA);
  await new Promise((r) => setTimeout(r, 0));
  run(`app.pickPaymentSource('g')`);
  const html = doc.getElementById('payment-history').innerHTML;
  assert.match(html, /Gotówka za czerwiec 2026/,
    'bez nazwy data jest jedyną wskazówką i czyta się jak miesiąc rozliczenia');
});

test('data w historii jest podpisana jako moment wpłynięcia', async () => {
  const { run, doc } = boot('2026-08-24T12:00:00', GOTOWKA);
  await new Promise((r) => setTimeout(r, 0));
  run(`app.pickPaymentSource('g')`);
  const html = doc.getElementById('payment-history').innerHTML;
  assert.match(html, /wpłynęło[^<]*15\.07\.2026/,
    'sama data 15.07 przy wpłacie „za czerwiec" wygląda na błąd, dopóki nie powie, co znaczy');
});
