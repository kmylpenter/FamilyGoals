/**
 * Ochrona wpłat przy sync (incydent 2026-08-21): urządzenie ze starym stanem
 * wypchnęło masowo cały swój stan (jeden stempel updatedAt na ~100 rekordach)
 * i last-write-wins na CAŁYM rekordzie źródła wymazał świeżą wpłatę 5000 zł.
 * Backend przy pushChanges na incomeSources scala płatności per-sztuka (unia
 * po p.id), a legalne kasowania jadą tombstonami deletedPaymentIds.
 * FamilyBackend.gs ładowany w vm z mockiem SpreadsheetApp.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function fakeSpreadsheet() {
  const sheets = {};
  const mkSheet = (name) => {
    const rows = []; // rows[0] = header
    const sheet = {
      getName: () => name,
      getLastRow: () => rows.length,
      getLastColumn: () => (rows[0] ? rows[0].length : 0),
      setFrozenRows: () => sheet,
      appendRow: (row) => { rows.push(row.slice()); return sheet; },
      getRange: (r, c, numRows = 1, numCols = 1) => ({
        setValues: (vals) => {
          for (let i = 0; i < numRows; i++) {
            rows[r - 1 + i] = rows[r - 1 + i] || [];
            for (let j = 0; j < numCols; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j];
          }
          return { setFontWeight: () => {} };
        },
        getValues: () => {
          const out = [];
          for (let i = 0; i < numRows; i++) {
            const row = rows[r - 1 + i] || [];
            out.push(Array.from({ length: numCols }, (_, j) => row[c - 1 + j] !== undefined ? row[c - 1 + j] : ''));
          }
          return out;
        },
        setFontWeight: () => {},
      }),
      _rows: rows,
    };
    return sheet;
  };
  const ss = {
    getId: () => 'fake-id',
    getUrl: () => 'https://fake',
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = mkSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: () => {},
  };
  return ss;
}

function loadBackend() {
  const ss = fakeSpreadsheet();
  const props = { SPREADSHEET_ID: 'fake-id', SPREADSHEET_URL: 'https://fake' };
  const ctx = vm.createContext({
    SpreadsheetApp: { openById: () => ss, create: () => ss },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => props[k] || null,
      setProperty: (k, v) => { props[k] = v; },
    }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    console, JSON, Date, Array, Object, String,
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'backend-gas', 'FamilyBackend.gs'), 'utf8');
  vm.runInContext(code, ctx, { filename: 'FamilyBackend.gs' });
  return ctx;
}

const srcRecord = (updatedAt, payments, extra = {}) => ({
  id: 'src-1', name: 'Gotówka', owner: 'husband', expectedAmount: 10000,
  incomeType: 'recurring', isActive: true, updatedAt, payments, ...extra,
});
const pay = (id, date, amount) => ({ id, date, amount, type: 'transfer' });
const readSource = (ctx) => ctx.getFamilyBootstrap().entities.incomeSources.find(r => r.id === 'src-1');

test('cofka ze starym stanem NIE wymazuje wpłaty (unia po id)', () => {
  const ctx = loadBackend();
  // Stan w arkuszu: 2 wpłaty (w tym świeża 5000)
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:46:00.000Z', [
    pay('p-old', '2026-06-15', 6000), pay('p-5000', '2026-07-15', 5000),
  ]) }]);
  // Masowy push z urządzenia ze stanem SPRZED wpłaty 5000, ale nowszym stemplem
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T13:06:45.234Z', [
    pay('p-old', '2026-06-15', 6000),
  ]) }]);
  const rec = readSource(ctx);
  assert.equal(rec.payments.length, 2, 'wpłata 5000 przeżyła cofkę');
  assert.ok(rec.payments.some(p => p.id === 'p-5000' && p.amount === 5000));
});

test('legalne kasowanie działa przez tombstone deletedPaymentIds', () => {
  const ctx = loadBackend();
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:00:00.000Z', [
    pay('p-a', '2026-06-15', 6000), pay('p-b', '2026-07-15', 5000),
  ]) }]);
  // Klient kasuje p-b: rekord bez p-b + tombstone
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:30:00.000Z', [
    pay('p-a', '2026-06-15', 6000),
  ], { deletedPaymentIds: ['p-b'] }) }]);
  const rec = readSource(ctx);
  assert.equal(rec.payments.length, 1, 'skasowana wpłata nie wraca z unii');
  assert.equal(rec.payments[0].id, 'p-a');
  assert.deepEqual(rec.deletedPaymentIds, ['p-b'], 'tombstone zapisany na rekordzie');
});

test('edycja wpłaty wygrywa wersją z nowszego rekordu (ten sam id)', () => {
  const ctx = loadBackend();
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:00:00.000Z', [
    pay('p-a', '2026-07-09', 6000),
  ]) }]);
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:10:00.000Z', [
    pay('p-a', '2026-07-10', 7000),
  ]) }]);
  const rec = readSource(ctx);
  assert.equal(rec.payments.length, 1);
  assert.equal(rec.payments[0].amount, 7000, 'edytowana kwota z nowszego rekordu');
});

test('starszy stempel dalej jest pomijany (LWW bez zmian)', () => {
  const ctx = loadBackend();
  ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T13:00:00.000Z', [
    pay('p-a', '2026-07-09', 6000), pay('p-b', '2026-07-15', 5000),
  ]) }]);
  const res = ctx.pushChanges([{ entity: 'incomeSources', record: srcRecord('2026-08-21T12:00:00.000Z', [
    pay('p-a', '2026-07-09', 6000),
  ]) }]);
  assert.equal(res.skipped, 1);
  assert.equal(readSource(ctx).payments.length, 2);
});

test('deletePayment (frontend) zostawia tombstone w źródle', () => {
  const { loadApp } = require('./harness/load-app');
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'], now: '2026-08-21T12:00:00' });
  const src = run(`dataManager.addIncomeSource({ name: 'Pensja', owner: 'husband', expectedAmount: 6000, incomeType: 'recurring', isActive: true })`);
  run(`window.__p = dataManager.recordPayment('${src.id}', { amount: 6000, date: '2026-07-10' })`);
  run(`dataManager.deletePayment('${src.id}', window.__p.id)`);
  const after = run(`dataManager.getIncomeSources().find(s => s.id === '${src.id}')`);
  assert.equal((after.payments || []).length, 0, 'płatność usunięta lokalnie');
  assert.equal((after.deletedPaymentIds || []).length, 1, 'tombstone dopisany do źródła');
});
