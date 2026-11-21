/**
 * Moduł ciąży — liczenie tygodnia, kompletność treści, plan powiadomień.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');

function fresh(now) {
  return loadApp({ scripts: ['js/utils.js', 'js/pregnancy-data.js', 'js/pregnancy.js'], now });
}

test('dueFromLmp: +280 dni (reguła Naegelego)', () => {
  const { run } = fresh();
  assert.equal(run("Pregnancy.dueFromLmp('2026-03-01')"), '2026-12-06');
  assert.equal(run("Pregnancy.dueFromLmp('2026-02-30')"), null, 'nieistniejąca data');
  assert.equal(run("Pregnancy.dueFromLmp('')"), null);
});

test('progress: tydzień + dni od terminu porodu', () => {
  const { run } = fresh();
  // termin 2027-05-20 → OM 2026-08-13; 2026-11-20 to 99. dzień = 14+1
  const p = run("Pregnancy.progress('2027-05-20', new Date(2026, 10, 20, 15, 30))");
  assert.equal(p.lmp, '2026-08-13');
  assert.equal(p.days, 99);
  assert.equal(p.week, 14);
  assert.equal(p.day, 1);
  assert.equal(p.daysLeft, 181);
  assert.equal(p.trimester, 2);
  assert.equal(p.overdue, false);
});

test('progress: zmiana czasu (marzec/październik) nie gubi dnia', () => {
  const { run } = fresh();
  // OM 2026-01-01 → termin 2026-10-08; 2026-04-02 = dzień 91 = 13+0 (przez zmianę czasu 29.03)
  const p = run("Pregnancy.progress('2026-10-08', new Date(2026, 3, 2, 0, 30))");
  assert.equal(p.days, 91);
  assert.equal(p.week, 13);
  assert.equal(p.day, 0);
  // przez październikową zmianę: 2026-10-26 = 18 dni po terminie
  const q = run("Pregnancy.progress('2026-10-08', new Date(2026, 9, 26, 23, 0))");
  assert.equal(q.daysLeft, -18);
  assert.equal(q.overdue, true);
});

test('treść: każdy tydzień 4–40, rosnące rozmiary, komplet pól', () => {
  const { run } = fresh();
  const weeks = JSON.parse(run('JSON.stringify(PREGNANCY_WEEKS)'));
  assert.deepEqual(weeks.map((w) => w.w), Array.from({ length: 37 }, (_, i) => i + 4));
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (i > 0) assert.ok(w.cm > weeks[i - 1].cm, `tydz. ${w.w}: rozmiar rośnie`);
    for (const k of ['name', 'size', 'use', 'where']) assert.ok(w.screw[k] && w.screw[k].length > 3, `tydz. ${w.w}: screw.${k}`);
    for (const k of ['baby', 'mama', 'tata']) assert.ok(w[k] && w[k].length > 20, `tydz. ${w.w}: ${k}`);
  }
  // każdy tydzień ma inną śrubę
  assert.equal(new Set(weeks.map((w) => w.screw.name)).size, weeks.length);
});

test('weekData: poza zakresem przycina do 4 i 40', () => {
  const { run } = fresh();
  assert.equal(run('Pregnancy.weekData(2).w'), 4);
  assert.equal(run('Pregnancy.weekData(43).w'), 40);
  assert.equal(run('Pregnancy.weekData(15).screw.name'), 'Śruba transportowa pralki');
});

test('formatowanie rozmiaru i wagi', () => {
  const { run } = fresh();
  assert.equal(run('Pregnancy.formatLength(0.6)'), '6 mm');
  assert.equal(run('Pregnancy.formatLength(25.6)'), '25,6 cm');
  assert.equal(run('Pregnancy.formatLength(30)'), '30 cm');
  assert.equal(run('Pregnancy.formatWeight(660)'), '660 g');
  assert.equal(run('Pregnancy.formatWeight(1320)'), '1,3 kg');
  assert.equal(run('Pregnancy.formatWeight(null)'), null);
});

test('buildSchedule: tylko przyszłe tygodnie, start tygodnia o 9:00', () => {
  const { run } = fresh();
  // 14+1 → najbliższe powiadomienie: tydzień 15 (OM + 105 dni = 2026-11-26)
  const s = run("Pregnancy.buildSchedule('2027-05-20', new Date(2026, 10, 20, 12, 0))");
  assert.equal(s[0].week, 15);
  assert.equal(s[s.length - 1].week, 40);
  assert.equal(s.length, 26);
  const first = new Date(s[0].at);
  assert.deepEqual([first.getFullYear(), first.getMonth(), first.getDate(), first.getHours()], [2026, 10, 26, 9]);
  s.forEach((it) => assert.equal(new Date(it.at).getHours(), 9, `tydz. ${it.week} o 9:00`));
  assert.match(s[0].title, /15\. tydzień — maluch ma ok\. 10,1 cm/);
  assert.match(s[0].text, /śruba transportowa pralki/);
  // dzień zmiany tygodnia przed 9:00 → ten tydzień jeszcze w planie
  const t = run("Pregnancy.buildSchedule('2027-05-20', new Date(2026, 10, 26, 8, 0))");
  assert.equal(t[0].week, 15);
  const u = run("Pregnancy.buildSchedule('2027-05-20', new Date(2026, 10, 26, 10, 0))");
  assert.equal(u[0].week, 16);
  assert.equal(run("Pregnancy.buildSchedule('', new Date()).length"), 0);
});

test('strzałki: nie da się przewinąć w przyszłość, tylko wstecz', () => {
  const { run } = fresh();
  // bieżący 14: krok w przód zostaje na bieżącym (null = bieżący)
  assert.equal(run('Pregnancy.nextViewWeek(14, null, 1)'), null);
  assert.equal(run('Pregnancy.nextViewWeek(14, 13, 1)'), null, 'z 13 do 14 = powrót do bieżącego');
  assert.equal(run('Pregnancy.nextViewWeek(14, 13, 5)'), null);
  assert.equal(run('Pregnancy.nextViewWeek(14, null, -1)'), 13);
  assert.equal(run('Pregnancy.nextViewWeek(14, 10, 1)'), 11);
  assert.equal(run('Pregnancy.nextViewWeek(14, 4, -1)'), 4, 'nie mniej niż 4');
  assert.equal(run('Pregnancy.nextViewWeek(14, 9, 0)'), null, '0 = wróć do bieżącego');
  // podgląd „w przyszłości" (np. po zmianie terminu) liczy się od bieżącego — nigdy dalej
  assert.equal(run('Pregnancy.nextViewWeek(14, 20, -1)'), 13);
  assert.equal(run('Pregnancy.nextViewWeek(14, 20, 1)'), null);
});

test('osiągnięcia: treść kompletna, rosnące tygodnie, tygodnie pomiarowe zgodne z rozmiarami', () => {
  const { run } = fresh();
  const ach = JSON.parse(run('JSON.stringify(PREGNANCY_ACHIEVEMENTS)'));
  const weeks = JSON.parse(run('JSON.stringify(PREGNANCY_WEEKS)'));
  assert.ok(ach.length >= 15);
  for (let i = 0; i < ach.length; i++) {
    const a = ach[i];
    if (i > 0) assert.ok(a.w > ach[i - 1].w, `${a.id}: tygodnie rosną`);
    assert.ok(a.w >= 4 && a.w <= 41, `${a.id}: tydzień w zakresie`);
    for (const k of ['id', 'icon', 'title', 'text']) assert.ok(a[k], `${a.id}: ${k}`);
  }
  assert.equal(new Set(ach.map((a) => a.id)).size, ach.length);
  const firstWeek = (pred) => weeks.find(pred).w;
  const byId = Object.fromEntries(ach.map((a) => [a.id, a.w]));
  assert.equal(byId.kilogram, firstWeek((w) => w.g >= 1000));
  assert.equal(byId.linijka, firstWeek((w) => w.cm > 30));
  assert.equal(byId['pol-metra'], firstWeek((w) => w.cm >= 50));
  assert.equal(byId.polmetek, 20);
  // trymestry zgodne z progress(): II od 13., III od 27. tygodnia
  assert.equal(run("Pregnancy.progress('2027-05-20', new Date(2026, 10, 12)).trimester"), 2); // 13+0
  assert.equal(byId.trymestr2, 13);
  assert.equal(byId.trymestr3, 27);
  assert.equal(byId.donoszony, 37);
});

test('osiągnięcia: zdobyte tylko do bieżącego tygodnia, następne ukryte', () => {
  const { run } = fresh();
  const s = JSON.parse(run('JSON.stringify(Pregnancy.achievementState(14))'));
  assert.deepEqual(s.unlocked.map((a) => a.id), ['start', 'serce', 'zegarmistrz', 'pralka', 'trymestr2']);
  assert.equal(s.next.w, 16);
  assert.equal(s.next.title, undefined, 'następne bez tytułu — bez spoilera');
  assert.equal(s.locked + s.unlocked.length, run('PREGNANCY_ACHIEVEMENTS.length'));
  assert.equal(run('Pregnancy.achievementState(3).unlocked.length'), 0);
  const end = JSON.parse(run('JSON.stringify(Pregnancy.achievementState(41))'));
  assert.equal(end.locked, 0);
  assert.equal(end.next, null);
});

test('powiadomienie tygodnia z osiągnięciem dopisuje je do treści', () => {
  const { run } = fresh();
  assert.match(run('Pregnancy.notificationFor(28).text'), /🏆 Osiągnięcie: Pierwszy kilogram/);
  assert.doesNotMatch(run('Pregnancy.notificationFor(29).text'), /Osiągnięcie/);
});
