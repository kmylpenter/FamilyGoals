/**
 * Okno wpłaty a miesiąc rozliczenia.
 *
 * HISTORIA: zgłoszenie Kamila 2026-08-23 („za lipiec 7300, a przy dodawaniu
 * brakuje 10 000 i 6 000") ujawniło, że modal liczył miesiąc OGLĄDANY, a karta
 * ostatni zamknięty. Pierwsza wersja tego pliku pinowała datę domyślną na
 * 15. ostatniego zamkniętego miesiąca (konwencja „data = miesiąc-ZA-który").
 *
 * SUPERSEDED tego samego dnia decyzją Kamila o RACHUNKU PRZECHODZĄCYM:
 * wpłata zasila saldo źródła, przypisanie do miesięcy liczy się samo, a data
 * znaczy już tylko KIEDY WPŁYNĘŁO. Plik pinuje teraz nowy kontrakt; źródła
 * poza pulą (jednorazowe) nadal rozliczają się miesiącem — to nie zmiana.
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

test('źródło w puli: data domyślna to DZIŚ (kiedy wpłynęło), bez zgadywania miesiąca', async () => {
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources: SOURCES });
  run(`app.pickPaymentSource('src-gotowka')`);
  assert.equal(doc.getElementById('payment-date').value, '2026-08-23',
    'rachunek przechodzący: data mówi tylko kiedy pieniądze weszły');
});

test('nagłówek modala pokazuje SALDO rachunku, nie rozliczenie jednego miesiąca', async () => {
  const sources = structuredClone(SOURCES);
  // 5 z 7 miesięcy (sty–lip) opłaconych → zaległość 2 × 10 000
  sources[1].payments = [{ id: 'p1', amount: 50000, date: '2026-03-02', note: '' }];
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources });
  run(`app.pickPaymentSource('src-gotowka')`);
  const txt = doc.getElementById('payment-source-info').querySelector('.payment-source-expected').textContent;
  assert.match(txt, /zaległość 20\s000/i, `nagłówek ma nazwać saldo, jest: "${txt}"`);
  assert.match(txt, /50\s000.*70\s000/, `nagłówek ma pokazać wpłacone z należnych, jest: "${txt}"`);
});

test('kwota domyślna wyrównuje rachunek (zaległość), nie ślepe „oczekiwane"', async () => {
  const sources = structuredClone(SOURCES);
  sources[1].payments = [{ id: 'p1', amount: 50000, date: '2026-03-02', note: '' }];
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources });
  run(`app.pickPaymentSource('src-gotowka')`);
  assert.equal(doc.getElementById('payment-amount').value, 20000);
});

test('rozpiska „Pokryje" nazywa miesiące, które zamknie ta kwota', async () => {
  const sources = structuredClone(SOURCES);
  sources[1].payments = [{ id: 'p1', amount: 50000, date: '2026-03-02', note: '' }];
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources });
  run(`app.pickPaymentSource('src-gotowka')`);
  const txt = doc.getElementById('payment-allocation').innerHTML;
  assert.match(txt, /czerwiec/i, `rozpiska ma wymienić czerwiec, jest: "${txt}"`);
  assert.match(txt, /lipiec/i, `rozpiska ma wymienić lipiec, jest: "${txt}"`);
});

test('wpłata bez własnej nazwy dostaje etykietę z ALOKACJI, nie „Przelew"', async () => {
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources: SOURCES });
  run(`app.pickPaymentSource('src-gotowka')`);
  doc.getElementById('payment-amount').value = '10000';
  doc.getElementById('payment-note').value = '';
  doc.getElementById('payment-form').onsubmit({ preventDefault() {} });
  const p = run(`dataManager.getIncomeSources().find(s => s.id === 'src-gotowka').payments[0]`);
  assert.equal(p.note, 'Gotówka za styczeń 2026', 'pusty rachunek → pierwsza wpłata domyka styczeń');
  assert.equal(String(p.date).slice(0, 10), '2026-08-23', 'data = kiedy wpłynęło');
});

test('źródło POZA pulą (jednorazowe) nadal rozlicza się miesiącem', async () => {
  const sources = structuredClone(SOURCES).concat([{
    id: 'src-bonus', name: 'Bonus', owner: 'husband', incomeType: 'oneoff',
    forMonth: '2026-07', expectedAmount: 700, isActive: true, payments: []
  }]);
  const { run, doc } = await bootApp({ now: '2026-08-23T12:00:00', sources });
  run(`app.pickPaymentSource('src-bonus')`);
  assert.equal(doc.getElementById('payment-date').value, '2026-07-15',
    'jednorazowe wiszą przy swoim miesiącu — tam data nadal go wyznacza');
  const txt = doc.getElementById('payment-source-info').querySelector('.payment-source-expected').textContent;
  assert.match(txt, /Za lipiec/i, `nagłówek jednorazowego ma nazwać miesiąc, jest: "${txt}"`);
});
