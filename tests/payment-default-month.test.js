/**
 * Domyślny miesiąc wpłaty (zgłoszenie Kamila 2026-08-23: „za lipiec wpłynęło
 * 7300, a w Dodaj wpłatę brakuje 10 000 i 6 000 — czy to nie wchodzi za
 * sierpień?").
 * Konwencja Kamila: DATA WPŁATY = MIESIĄC, ZA KTÓRY jest — wpłata za lipiec
 * fizycznie przychodzi w sierpniu. Modal wpłaty musi więc domyślnie rozliczać
 * OSTATNI ZAMKNIĘTY miesiąc (jak linia na karcie i jak wykres), a nie miesiąc
 * oglądany, i nie może podstawiać „Przelew" zamiast etykiety „za {miesiąc}".
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, ALL_SCRIPTS } = require('./harness/load-app');
const { createBrowserEnv } = require('./harness/browser-env');

/** Środowisko jak w harnessie, ale getElementById zwraca TEN SAM stub dla id
 *  (domyślny stub tworzy nowy obiekt na każde wywołanie — nie da się odczytać
 *  tego, co kod właśnie zapisał do pola formularza). */
function envWithDomRegistry(now) {
  const env = createBrowserEnv({ now });
  const byId = new Map();
  const raw = env.document.createElement;
  // querySelector też musi zwracać ten sam stub przy każdym wywołaniu —
  // kod czyta .payment-source-expected po tym, jak sam do niego zapisał
  const withChildren = (el) => {
    const kids = new Map();
    el.querySelector = (sel) => {
      if (!kids.has(sel)) kids.set(sel, withChildren(raw()));
      return kids.get(sel);
    };
    return el;
  };
  env.document.createElement = () => withChildren(raw());
  env.document.getElementById = (id) => {
    if (!byId.has(id)) {
      const el = env.document.createElement();
      el.id = id;
      byId.set(id, el);
    }
    return byId.get(id);
  };
  env.document._byId = byId;
  // Helpery modali żyją w inline <script> index.html (harness ładuje tylko js/)
  env.closeAllModals = () => {};
  env.openModal = () => {};
  env.createDynamicModal = () => env.document.createElement();
  return env;
}

/** Ładuje całą apkę (z app.js) na danych źródeł i czeka na koniec async init(). */
async function bootApp({ now, sources }) {
  const env = envWithDomRegistry(now);
  env.localStorage.setItem('familygoals_income_sources', JSON.stringify(sources));
  env.localStorage.setItem('familygoals_device_profile', 'husband');
  const { ctx, run } = loadApp({ scripts: ALL_SCRIPTS, env });
  await new Promise((r) => setTimeout(r, 0));
  return { ctx, run, doc: env.document };
}

// Realny układ Kamila: dwa cykliczne źródła Męża w modelu puli
const SOURCES = [
  { id: 'src-pensja', name: 'Pensja', owner: 'husband', incomeType: 'recurring',
    expectedAmount: 6000, activeFrom: '2026-01', isActive: true, payments: [] },
  { id: 'src-gotowka', name: 'Gotówka', owner: 'husband', incomeType: 'recurring',
    expectedAmount: 10000, activeFrom: '2026-01', isActive: true, payments: [] },
];

test('modal wpłaty w trakcie sierpnia proponuje datę za LIPIEC (ostatni zamknięty)', async () => {
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources: SOURCES });
  run(`app.pickPaymentSource('src-gotowka')`);
  assert.equal(doc.getElementById('payment-date').value, '2026-07-15',
    'wpłata dodawana w sierpniu jest wpłatą ZA LIPIEC (konwencja Kamila: 15-ty miesiąca-za-który)');
});

test('nagłówek modala rozlicza lipiec, nie oglądany sierpień', async () => {
  const sources = structuredClone(SOURCES);
  // activeFrom = lipiec, żeby pula liczyła te 600 zł właśnie na lipiec
  // (przy wcześniejszym activeFrom pula zasypałaby najpierw starsze miesiące)
  sources[1].activeFrom = '2026-07';
  sources[1].payments = [{ id: 'p1', amount: 600, date: '2026-07-15', note: 'Gotówka za lipiec 2026' }];
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources });
  run(`app.pickPaymentSource('src-gotowka')`);
  const txt = doc.getElementById('payment-source-info').querySelector('.payment-source-expected').textContent;
  assert.match(txt, /lipiec/i, `nagłówek ma nazwać rozliczany miesiąc, jest: "${txt}"`);
  assert.match(txt, /otrzymane: 600/, `nagłówek ma pokazać otrzymane ZA LIPIEC (600 zł), jest: "${txt}"`);
});

test('wpłata bez własnej nazwy dostaje etykietę „{źródło} za {miesiąc}", nie „Przelew"', async () => {
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources: SOURCES });
  run(`app.pickPaymentSource('src-gotowka')`);
  doc.getElementById('payment-amount').value = '10000';
  doc.getElementById('payment-note').value = '';
  const form = doc.getElementById('payment-form');
  form.onsubmit({ preventDefault() {} });
  const p = run(`dataManager.getIncomeSources().find(s => s.id === 'src-gotowka').payments[0]`);
  assert.equal(p.note, 'Gotówka za lipiec 2026');
  assert.equal(String(p.date).slice(0, 7), '2026-07', 'wpłata księguje się za lipiec');
});
