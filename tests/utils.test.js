/**
 * Testy charakteryzujące js/utils.js — pinują OBECNE zachowanie
 * współdzielonych helperów (fundament pod naprawy w innych modułach).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

// toLocaleString('pl-PL') używa NBSP/narrow-NBSP jako separatora tysięcy —
// normalizujemy do zwykłej spacji, żeby test nie zależał od wersji ICU.
const norm = (s) => s.replace(/[  ]/g, ' ');

function fresh(now) {
  const { ctx, run } = loadApp({ scripts: ['js/utils.js'], now });
  return { ctx, run };
}

test('formatMoney: liczby, null, ujemne, ułamki', () => {
  const { run } = fresh();
  // Żądanie Kamila 2026-08-25: grupuj tysiące ZAWSZE, także w 4 cyfrach.
  // Domyślne CLDR pl (minimumGroupingDigits=2) dawało „9400 zł" obok
  // „110 600 zł" w tej samej rozpisce — wyglądało na błąd wyświetlania.
  assert.equal(norm(run('formatMoney(1234)')), '1 234 zł');
  assert.equal(norm(run('formatMoney(9400)')), '9 400 zł');
  assert.equal(norm(run('formatMoney(12345)')), '12 345 zł');
  assert.equal(norm(run('formatMoney(999)')), '999 zł', 'trzy cyfry bez separatora');
  assert.equal(norm(run('formatMoney(0)')), '0 zł');
  assert.equal(norm(run('formatMoney(null)')), '0 zł');
  assert.equal(norm(run('formatMoney(undefined)')), '0 zł');
  assert.equal(norm(run('formatMoney(-50)')), '-50 zł');
  assert.equal(norm(run('formatMoney(12.5)')), '12,5 zł');
  assert.equal(norm(run('formatMoney(1234567)')), '1 234 567 zł');
});

test('grupowanie tysięcy jest spójne we WSZYSTKICH formatterach kwot', () => {
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/event-bus.js', 'js/ui-features.js'] });
  const sprawdz = (wyr, opis) => assert.equal(norm(String(run(wyr))).replace(/\u00A0/g, ' '), '9 400 zł', `${opis} → ${wyr}`);
  sprawdz('FGUtils.formatMoney(9400)', 'FGUtils.formatMoney');
  sprawdz('FGUtils.formatCurrency(9400)', 'FGUtils.formatCurrency');
  // dataManager.formatCurrency celowo trzyma grosze (używa go doradca AI) —
  // zmieniamy WYŁĄCZNIE grupowanie, nie liczbę miejsc po przecinku
  assert.equal(norm(String(run('dataManager.formatCurrency(9400)'))).replace(/\u00A0/g, ' '),
    '9 400,00 zł', 'dataManager.formatCurrency');
  sprawdz('Widget.formatMoney(9400)', 'Widget.formatMoney (ui-features)');
  // ReactiveUI: waluta i liczba surowa — obie muszą grupować tak samo
  assert.equal(norm(String(run("ReactiveUI._formatNumber(9400, 'currency')"))).replace(/\u00A0/g, ' '),
    '9 400,00 zł', 'ReactiveUI._formatNumber(currency)');
  assert.equal(norm(String(run("ReactiveUI._formatNumber(9400, 'liczba')"))).replace(/\u00A0/g, ' '),
    '9 400', 'ReactiveUI._formatNumber(domyślny)');
});

test('formatMonth / formatMonthShort: polskie nazwy miesięcy', () => {
  const { run } = fresh();
  assert.equal(run('formatMonth(new Date(2026, 0, 15))'), 'Styczeń 2026');
  assert.equal(run('formatMonth(new Date(2026, 11, 1))'), 'Grudzień 2026');
  assert.equal(run('formatMonthShort(new Date(2026, 9, 1))'), 'paź 2026');
});

test('getCurrentYearMonth: format YYYY-MM z zerem wiodącym (czas lokalny)', () => {
  const { run } = fresh('2026-07-15T12:00:00');
  assert.equal(run('getCurrentYearMonth()'), '2026-07');
});

test('daysBetween: podstawy i wejścia niepoprawne', () => {
  const { run } = fresh();
  assert.equal(run('daysBetween("2026-01-01", "2026-01-31")'), 30);
  assert.equal(run('daysBetween("2026-01-01", "2026-01-01")'), 0);
  assert.equal(run('daysBetween("2026-01-31", "2026-01-01")'), -30);
  assert.equal(run('daysBetween(null, "2026-01-01")'), 0);
  assert.equal(run('daysBetween("garbage", "2026-01-01")'), 0);
});

test('isInMonth / filterByMonth: dopasowanie rok+miesiąc', () => {
  const { run } = fresh();
  assert.equal(run('isInMonth("2026-03-15", 2026, 2)'), true);
  assert.equal(run('isInMonth("2026-03-15", 2026, 3)'), false);
  assert.equal(
    run('filterByMonth([{date:"2026-03-01"},{date:"2026-04-01"}], 2026, 2).length'),
    1
  );
});

test('escapeHtml: escapuje & < >, NIE escapuje cudzysłowów (jak DOM)', () => {
  const { run } = fresh();
  assert.equal(run('escapeHtml("<b>x</b>")'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(run('escapeHtml("a & b")'), 'a &amp; b');
  assert.equal(run('escapeHtml("")'), '');
  assert.equal(run('escapeHtml(null)'), '');
  // Charakteryzacja ograniczenia: apostrofy/cudzysłowy przechodzą bez zmian —
  // escapeHtml NIE chroni wartości wstawianych do atrybutów (np. onclick('...')).
  assert.equal(run('escapeHtml(`a"b\'c`)'), 'a"b\'c');
});

test('safeJsonParse / getFromStorage / saveToStorage: fallbacki i roundtrip', () => {
  const { run } = fresh();
  assert.deepEqual(run('safeJsonParse(\'{"a":1}\')'), { a: 1 });
  assert.equal(run('safeJsonParse("not-json", "FB")'), 'FB');
  assert.equal(run('safeJsonParse(null, 42)'), 42);
  assert.deepEqual(run('saveToStorage("k", {x:[1,2]}); getFromStorage("k")'), { x: [1, 2] });
  assert.equal(run('getFromStorage("missing", "def")'), 'def');
});

test('isValidYearMonth / parseDate: walidacja', () => {
  const { run } = fresh();
  assert.equal(run('isValidYearMonth("2026-07")'), true);
  assert.equal(run('isValidYearMonth("2026-7")'), false);
  assert.equal(run('isValidYearMonth("07-2026")'), false);
  assert.equal(run('parseDate("garbage")'), null);
  assert.equal(run('parseDate(null)'), null);
  assert.equal(run('parseDate("2026-01-15") instanceof Date'), true);
});
