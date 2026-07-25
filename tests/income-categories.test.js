/**
 * Własne kategorie przychodów (żądanie Kamila 2026-07-25: „w kategoriach nie
 * mogę dodać nowej kategorii przychodów").
 * Red-first: getCustomCategories(kind) filtruje po rodzaju; legacy wpisy
 * bez `kind` = kategorie wydatków (dotychczasowe zachowanie modala).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const fresh = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js'] });

test('addCategory z kind=income + filtr getCustomCategories("income")', () => {
  const { run } = fresh();
  run(`dataManager.addCategory({ name: 'Wynajem mieszkania', icon: '🏠', kind: 'income' })`);
  run(`dataManager.addCategory({ name: 'Paliwo', icon: '⛽', kind: 'expense' })`);
  const income = run(`dataManager.getCustomCategories('income')`);
  assert.equal(income.length, 1);
  assert.equal(income[0].name, 'Wynajem mieszkania');
  assert.equal(income[0].icon, '🏠');
});

test('legacy kategoria bez kind traktowana jako wydatkowa (nie wchodzi do przychodów)', () => {
  const { run } = fresh();
  run(`dataManager.addCategory({ name: 'Stara kategoria', icon: '📁' })`);
  assert.equal(run(`dataManager.getCustomCategories('income').length`), 0, 'legacy nie jest przychodowa');
  assert.equal(run(`dataManager.getCustomCategories('expense').length`), 1, 'legacy jest wydatkowa');
  assert.equal(run(`dataManager.getCustomCategories().length`), 1, 'bez argumentu: wszystkie');
});
