/**
 * Dymek wykresu: podział na WPŁATY i KORZYŚCI FIRMOWE (żądanie Kamila
 * 2026-08-25). Lipiec 2026 pokazywał „26 600 zł" jednym ciągiem, choć realnych
 * wpłat było 22 500, a 4100 to miesięczne naliczenia korzyści — żadne pieniądze
 * nie weszły na konto. Bez podziału suma czyta się jako wpłaty.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const utils = () => loadApp({ scripts: ['js/utils.js'] });

const LIPIEC = [
  { label: '💸 Gotówka za czerwiec 2026', amount: 12900, kind: 'wplata' },
  { label: '💼 Pensja za czerwiec 2026', amount: 6000, kind: 'wplata' },
  { label: '💸 Gotówka za czerwiec 2026', amount: 2900, kind: 'wplata' },
  { label: '🛻 Bayon serwis', amount: 1790, kind: 'korzysc' },
  { label: '🛻 Leasing Bayon', amount: 1130, kind: 'korzysc' },
  { label: '💵 Mystery Gift', amount: 700, kind: 'wplata' },
  { label: '🪣 Sprzątanie Alicja', amount: 640, kind: 'korzysc' },
  { label: '📱 Telefoniczny dwie osoby', amount: 300, kind: 'korzysc' },
  { label: '🛻 Tankowanie Bayon', amount: 240, kind: 'korzysc' },
];

test('oba rodzaje → dwie sekcje z własnymi sumami', () => {
  const { ctx, run } = utils();
  ctx.__items = LIPIEC;
  const g = JSON.parse(run('JSON.stringify(FGUtils.groupBreakdownByKind(__items))'));
  assert.equal(g.length, 2);
  assert.equal(g[0].kind, 'wplata', 'realne pieniądze przed naliczeniami');
  assert.match(g[0].label, /Wpłaty/);
  assert.equal(g[0].total, 22500, 'suma wpłat: 12900+6000+2900+700');
  assert.match(g[1].label, /[Kk]orzyści/);
  assert.equal(g[1].total, 4100, 'suma korzyści: 1790+1130+640+300+240');
  assert.equal(g[0].total + g[1].total, 26600, 'sekcje muszą się domykać do sumy dymka');
});

test('wewnątrz sekcji malejąco po kwocie', () => {
  const { ctx, run } = utils();
  ctx.__items = LIPIEC;
  const g = JSON.parse(run('JSON.stringify(FGUtils.groupBreakdownByKind(__items))'));
  assert.deepEqual(g[0].items.map(i => i.amount), [12900, 6000, 2900, 700]);
  assert.deepEqual(g[1].items.map(i => i.amount), [1790, 1130, 640, 300, 240]);
});

test('same wpłaty → jedna sekcja BEZ nagłówka (nagłówek byłby szumem)', () => {
  const { ctx, run } = utils();
  ctx.__items = LIPIEC.filter(i => i.kind === 'wplata');
  const g = JSON.parse(run('JSON.stringify(FGUtils.groupBreakdownByKind(__items))'));
  assert.equal(g.length, 1);
  assert.equal(g[0].label, null);
  assert.equal(g[0].total, 22500);
});

test('pozycje bez rodzaju (wydatki) przechodzą jedną grupą bez nagłówka', () => {
  const { ctx, run } = utils();
  ctx.__items = [{ label: '📦 Inne', amount: 970 }, { label: '🍽️ Jedzenie', amount: 170 }];
  const g = JSON.parse(run('JSON.stringify(FGUtils.groupBreakdownByKind(__items))'));
  assert.equal(g.length, 1);
  assert.equal(g[0].label, null);
  assert.equal(g[0].total, 1140);
});

test('pusty miesiąc → brak grup', () => {
  const { run } = utils();
  assert.deepEqual(JSON.parse(run('JSON.stringify(FGUtils.groupBreakdownByKind([]))')), []);
});
