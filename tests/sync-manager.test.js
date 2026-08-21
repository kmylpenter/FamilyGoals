/**
 * FAZA 2 — kontrakt sync-managera (red-first).
 * Backend emulowany in-memory z TĄ SAMĄ semantyką LWW co FamilyBackend.gs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');
const { createBrowserEnv } = require('./harness/browser-env');

/** Emulator backendu: proxy_call → pushChanges/getFamilyBootstrapDelta (LWW jak w GAS). */
function createBackendEmulator() {
  const store = {}; // entity -> id -> record
  const calls = [];
  let failNext = false;
  const fetchImpl = (url, opts = {}) => {
    let body;
    try { body = JSON.parse(opts.body); } catch (e) { body = null; }
    calls.push(body);
    if (failNext) { failNext = false; return Promise.reject(new Error('network down')); }
    if (!body || body.action !== 'proxy_call') return respond({ success: false, error: 'bad_envelope' });
    if (body.token !== 'TOK') return respond({ success: false, error: 'auth' });
    if (body.method === 'pushChanges') {
      let applied = 0, skipped = 0;
      for (const ch of body.args[0]) {
        const ent = (store[ch.entity] = store[ch.entity] || {});
        const existing = ent[ch.record.id];
        if (existing && existing.updatedAt >= ch.record.updatedAt) { skipped++; continue; }
        ent[ch.record.id] = ch.record;
        applied++;
      }
      return respond({ success: true, data: { applied, skipped, serverTime: new Date().toISOString() } });
    }
    if (body.method === 'getFamilyBootstrapDelta' || body.method === 'getFamilyBootstrap') {
      const since = body.method === 'getFamilyBootstrap' ? '' : (body.args[0] || '');
      const entities = {};
      for (const [entity, recs] of Object.entries(store)) {
        entities[entity] = Object.values(recs).filter((r) => !since || r.updatedAt > since);
      }
      return respond({ success: true, data: { entities, serverTime: new Date().toISOString() } });
    }
    return respond({ success: false, error: 'unknown_method' });
  };
  function respond(obj) {
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(obj), text: () => Promise.resolve(JSON.stringify(obj)) });
  }
  return { fetchImpl, store, calls, failOnce: () => { failNext = true; } };
}

function freshSync(emulator) {
  const env = createBrowserEnv();
  env.fetch = emulator.fetchImpl;
  const { ctx, run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/event-bus.js', 'js/sync-manager.js'], env });
  run(`localStorage.setItem('familygoals_sync_config', JSON.stringify({ url: 'https://backend.test/exec', token: 'TOK', enabled: true }))`);
  return { env, run };
}

test('sync: zmiana w DataManagerze trafia do kolejki ze stemplem updatedAt', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  run('dataManager.addIncomeSource({ name: "Pensja", amount: 5000, owner: "wife" })');
  await run('syncManager.detectChanges()');
  const queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].entity, 'incomeSources');
  assert.ok(queue[0].record.updatedAt, 'rekord w kolejce ma updatedAt');
  const stored = run(`JSON.parse(localStorage.getItem('familygoals_income_sources'))[0]`);
  assert.ok(stored.updatedAt, 'rekord w localStorage dostał stempel updatedAt');
});

test('sync: flush wysyła kopertę proxy_call i czyści kolejkę po sukcesie', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  run('dataManager.addTodo({ title: "Zakupy", owner: "both" })');
  await run('syncManager.detectChanges()');
  await run('syncManager.flushQueue()');
  const queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  assert.equal(queue.length, 0, 'kolejka pusta po sukcesie');
  const push = emu.calls.find((c) => c && c.method === 'pushChanges');
  assert.ok(push, 'poszedł pushChanges');
  assert.equal(push.action, 'proxy_call');
  assert.equal(push.token, 'TOK');
  assert.ok(emu.store.todos, 'rekord doleciał do backendu');
});

test('sync: awaria sieci NIE gubi kolejki (replay przy następnym flushu)', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  run('dataManager.addTodo({ title: "Ważne", owner: "wife" })');
  await run('syncManager.detectChanges()');
  emu.failOnce();
  await run('syncManager.flushQueue()');
  let queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  assert.equal(queue.length, 1, 'po awarii kolejka nietknięta');
  await run('syncManager.flushQueue()');
  queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  assert.equal(queue.length, 0, 'replay po powrocie sieci');
});

test('sync: pull nadpisuje starszy rekord lokalny, nie tyka nowszego z kolejki', async () => {
  const emu = createBackendEmulator();
  emu.store.todos = {
    remote1: { id: 'remote1', title: 'Z serwera', owner: 'both', updatedAt: '2026-07-24T10:00:00.000Z' },
  };
  const { run } = freshSync(emu);
  run('dataManager.addTodo({ title: "Lokalny nowszy", owner: "wife" })');
  await run('syncManager.detectChanges()');
  await run('syncManager.pullDelta()');
  const todos = run('dataManager.getTodos()');
  assert.equal(todos.length, 2, 'remote1 dołączony, lokalny zostaje');
  assert.ok(todos.some((t) => t.id === 'remote1'), 'rekord z serwera jest lokalnie');
  assert.ok(todos.some((t) => t.title === 'Lokalny nowszy'), 'lokalny niezsynchronizowany przeżył pull');
});

test('sync: usunięcie lokalne = tombstone w kolejce; tombstone z serwera usuwa lokalnie', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  const todo = run('dataManager.addTodo({ title: "Do skasowania", owner: "both" })');
  await run('syncManager.detectChanges()');
  await run('syncManager.flushQueue()');
  run(`dataManager.deleteTodo("${todo.id}")`);
  await run('syncManager.detectChanges()');
  const queue = run(`JSON.parse(localStorage.getItem('familygoals_sync_queue') || '[]')`);
  const tomb = queue.find((q) => q.record.id === todo.id);
  assert.ok(tomb && tomb.record.deleted === true, 'tombstone w kolejce po delete');
  // tombstone z serwera
  emu.store.todos = emu.store.todos || {};
  emu.store.todos.ghost = { id: 'ghost', deleted: true, updatedAt: '2026-07-24T12:00:00.000Z' };
  run(`(function(){ const t = JSON.parse(localStorage.getItem('familygoals_todos')||'[]'); t.push({id:'ghost', title:'Duch', updatedAt:'2026-07-24T11:00:00.000Z'}); localStorage.setItem('familygoals_todos', JSON.stringify(t)); dataManager._invalidateCache('familygoals_todos'); })()`);
  await run('syncManager.pullDelta()');
  assert.equal(run(`dataManager.getTodos().some(t => t.id === 'ghost')`), false, 'tombstone z serwera usunął rekord');
});

test('sync: encje obiektowe (achievements) dzielone per owner', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  run(`localStorage.setItem('familygoals_achievements', JSON.stringify({ wife: { unlocked: ['first_income'], points: 10 }, husband: { unlocked: [], points: 0 } }))`);
  await run('syncManager.detectChanges()');
  await run('syncManager.flushQueue()');
  assert.ok(emu.store.achievements, 'encja achievements na backendzie');
  assert.ok(emu.store.achievements.wife, 'rekord wife');
  assert.ok(emu.store.achievements.husband, 'rekord husband');
  assert.deepEqual(JSON.parse(JSON.stringify(emu.store.achievements.wife.data)), { unlocked: ['first_income'], points: 10 });
});

test('sync: kursor przesuwa się po pullu (delta nie mieli w kółko tego samego)', async () => {
  const emu = createBackendEmulator();
  emu.store.income = { i1: { id: 'i1', amount: 100, source: 'X', date: '2026-07-01', updatedAt: '2026-07-24T10:00:00.000Z' } };
  const { run } = freshSync(emu);
  await run('syncManager.pullDelta()');
  const cursor = run(`localStorage.getItem('familygoals_sync_cursor')`);
  assert.equal(cursor, '2026-07-24T10:00:00.000Z');
  const callsBefore = emu.calls.length;
  await run('syncManager.pullDelta()');
  const lastDelta = emu.calls[emu.calls.length - 1];
  assert.equal(lastDelta.args[0], '2026-07-24T10:00:00.000Z', 'delta pyta od kursora');
});

// ===== Wysyłka od razu po zapisie (zgłoszenie Kamila 2026-08-21: wpłata =====
// 4000 została w telefonie — zegar 10 s nie zdążył przed schowaniem apki)

test('sync: wpłata leci do backendu zaraz po dodaniu (bez czekania na zegar)', async () => {
  const emu = createBackendEmulator();
  const { run } = freshSync(emu);
  try {
    run('syncManager.start()');
    await new Promise(r => setTimeout(r, 80)); // initial syncNow ze start()
    const baseline = emu.calls.length;
    run(`window.__s = dataManager.addIncomeSource({ name: 'Gotówka', expectedAmount: 10000, owner: 'husband', incomeType: 'recurring', isActive: true })`);
    run(`dataManager.recordPayment(window.__s.id, { amount: 4000, date: '2026-07-15' })`);
    await new Promise(r => setTimeout(r, 900)); // debounce + zapas; DALEKO od zegara 10 s
    const pushed = emu.calls.slice(baseline)
      .filter(c => c && c.method === 'pushChanges')
      .some(c => c.args[0].some(ch => ch.entity === 'incomeSources' &&
        (ch.record.payments || []).some(p => p.amount === 4000)));
    assert.ok(pushed, 'źródło z wpłatą 4000 wypchnięte bez zegara 10 s');
  } finally {
    run('syncManager.stop()');
  }
});

test('sync: schowanie apki (visibilitychange→hidden) domyka wysyłkę od ręki', async () => {
  const emu = createBackendEmulator();
  const env = createBrowserEnv();
  env.fetch = emu.fetchImpl;
  const listeners = {};
  env.document.hidden = false;
  env.document.addEventListener = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  const { run } = loadApp({ scripts: ['js/utils.js', 'js/data-manager.js', 'js/event-bus.js', 'js/sync-manager.js'], env });
  run(`localStorage.setItem('familygoals_sync_config', JSON.stringify({ url: 'https://backend.test/exec', token: 'TOK', enabled: true }))`);
  try {
    run('syncManager.start()');
    await new Promise(r => setTimeout(r, 80));
    const baseline = emu.calls.length;
    run(`window.__s2 = dataManager.addIncomeSource({ name: 'Pensja', expectedAmount: 6000, owner: 'husband', incomeType: 'recurring', isActive: true })`);
    run(`dataManager.recordPayment(window.__s2.id, { amount: 6000, date: '2026-07-10' })`);
    env.document.hidden = true;
    (listeners['visibilitychange'] || []).forEach(fn => fn());
    await new Promise(r => setTimeout(r, 120)); // < debounce — flush musi iść z hidden
    const pushed = emu.calls.slice(baseline)
      .filter(c => c && c.method === 'pushChanges')
      .some(c => c.args[0].some(ch => ch.entity === 'incomeSources' &&
        (ch.record.payments || []).some(p => p.amount === 6000)));
    assert.ok(pushed, 'schowanie apki wypycha kolejkę natychmiast');
  } finally {
    run('syncManager.stop()');
  }
});
