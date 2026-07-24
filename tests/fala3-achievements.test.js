/**
 * FALA 3c — osiągnięcia (red-first): ukrycie niezdobywalnych (EARNABLE_IDS),
 * tanie warunki streak/staż z danych EngagementManagera (D-C2/D-C4).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

const gmEnv = () => loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/gamification-manager.js'] });

test('3c: streak_3/streak_7 odblokowują się z longestStreak (engagement)', () => {
  const { run } = gmEnv();
  run(`localStorage.setItem('familygoals_engagement', JSON.stringify({ wife: { longestStreak: 8, totalLogins: 8 } }))`);
  run('const gm = new GamificationManager(dataManager)');
  run(`gm.checkAchievements('wife')`);
  const unlocked = run('gm.unlockedAchievements.wife.unlocked');
  assert.ok(unlocked.includes('streak_3'), 'streak_3 powinno być odblokowane');
  assert.ok(unlocked.includes('streak_7'), 'streak_7 powinno być odblokowane');
  assert.ok(!unlocked.includes('streak_30'), 'streak_30 NIE powinno (streak=8)');
});

test('3c: week_user/month_user odblokowują się z totalLogins', () => {
  const { run } = gmEnv();
  run(`localStorage.setItem('familygoals_engagement', JSON.stringify({ husband: { longestStreak: 2, totalLogins: 31 } }))`);
  run('const gm = new GamificationManager(dataManager)');
  run(`gm.checkAchievements('husband')`);
  const unlocked = run('gm.unlockedAchievements.husband.unlocked');
  assert.ok(unlocked.includes('week_user'), 'week_user (31 dni logowań)');
  assert.ok(unlocked.includes('month_user'), 'month_user (31 dni logowań)');
});

test('3c: getPlayerStats.totalCount = liczba EARNABLE, nie 122', () => {
  const { run } = gmEnv();
  run('const gm = new GamificationManager(dataManager)');
  const stats = run(`gm.getPlayerStats('wife')`);
  const earnableLen = run('GamificationManager.EARNABLE_IDS.length');
  assert.equal(stats.totalCount, earnableLen, 'totalCount ma pokazywać tylko zdobywalne');
  assert.ok(stats.totalCount >= 30 && stats.totalCount <= 40, `podejrzana liczba zdobywalnych: ${stats.totalCount}`);
});

test('3c: każdy EARNABLE id istnieje w rejestrze ACHIEVEMENTS', () => {
  const { run } = gmEnv();
  const missing = run('GamificationManager.EARNABLE_IDS.filter(id => !GamificationManager.ACHIEVEMENTS[id])');
  assert.equal(missing.length, 0, `EARNABLE_IDS spoza rejestru: ${missing.join(', ')}`);
});

test('3c: checkAchievements nie odblokowuje niczego spoza EARNABLE_IDS', () => {
  const { run } = gmEnv();
  run(`localStorage.setItem('familygoals_engagement', JSON.stringify({ wife: { longestStreak: 400, totalLogins: 400 } }))`);
  run('dataManager.addIncomeSource({ name: "A", amount: 1000, owner: "wife" })');
  run('dataManager.addIncome({ amount: 15000, source: "A", date: new Date().toISOString() })');
  run('const gm = new GamificationManager(dataManager)');
  run(`gm.checkAchievements('wife')`);
  const outside = run('gm.unlockedAchievements.wife.unlocked.filter(id => !GamificationManager.EARNABLE_IDS.includes(id))');
  assert.equal(outside.length, 0, `odblokowane spoza EARNABLE: ${outside.join(', ')}`);
});
