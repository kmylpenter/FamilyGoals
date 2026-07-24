/**
 * Testy update-managera (OTA): decyzje wersji + przepływ apply przez mostek.
 * Mostek FGUpdater i backend (getAppInfo/getWebBundle/getApk) mockowane.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness/load-app');
const { createBrowserEnv } = require('./harness/browser-env');

function makeEnv({ remote, bridge }) {
  const env = createBrowserEnv();
  const calls = { applyBundle: [], restart: 0, installApk: [] };
  if (bridge) {
    env.FGUpdater = {
      getInfo: () => JSON.stringify(bridge),
      applyBundle: (json) => { calls.applyBundle.push(json); return 'ok:test'; },
      restart: () => { calls.restart++; },
      installApk: (b64) => { calls.installApk.push(b64); return 'ok'; },
      clearBundle: () => 'ok',
    };
  }
  env.fetch = (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.token !== 'TOK') return respond({ success: false, error: 'auth' });
    if (body.method === 'getAppInfo') return respond({ success: true, data: remote });
    if (body.method === 'getWebBundle') return respond({ success: true, data: JSON.stringify({ version: remote.webVersion, files: { 'index.html': '<html>', 'js/a.js': '1', 'css/m.css': 'x' } }) });
    if (body.method === 'getApk') return respond({ success: true, data: { base64: 'QVBLQVBLQVBL', versionCode: remote.apkVersionCode } });
    return respond({ success: false, error: 'unknown_method' });
  };
  function respond(obj) {
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(obj) });
  }
  const { run } = loadApp({ scripts: ['js/app-version.js', 'js/utils.js', 'js/sync-manager.js', 'js/update-manager.js'], env });
  run(`localStorage.setItem('familygoals_sync_config', JSON.stringify({ url: 'https://b.test/exec', token: 'TOK', enabled: true }))`);
  return { run, calls, env };
}

const BRIDGE_V3 = { versionCode: 3, versionName: '1.2.0', webBundleVersion: null, source: 'assets' };

test('OTA: brak mostka (przeglądarka) → aktualizacje nieaktywne', async () => {
  const { run } = makeEnv({ remote: { webVersion: '2099-01-01', apkVersionCode: 99 }, bridge: null });
  const r = await run('updateManager.check()');
  assert.equal(r.available, false);
  assert.equal(r.reason, 'no_bridge');
});

test('OTA: nowsza paczka web na serwerze → webUpdate true', async () => {
  const { run, env } = makeEnv({ remote: { webVersion: '2026-08-01T00:00:00Z', apkVersionCode: 3 }, bridge: BRIDGE_V3 });
  env.FG_WEB_VERSION = '2026-07-24T00:00:00Z'; // wbudowana starsza
  const r = await run('updateManager.check()');
  assert.equal(r.webUpdate, true, JSON.stringify(r));
  assert.equal(r.apkUpdate, false);
  assert.equal(r.available, true);
});

test('OTA: wersje równe → brak aktualizacji', async () => {
  const { run, env } = makeEnv({ remote: { webVersion: '2026-07-24T00:00:00Z', apkVersionCode: 3 }, bridge: BRIDGE_V3 });
  env.FG_WEB_VERSION = '2026-07-24T00:00:00Z';
  const r = await run('updateManager.check()');
  assert.equal(r.available, false, JSON.stringify(r));
});

test('OTA: paczka live nowsza niż serwer → brak aktualizacji (webBundleVersion ma pierwszeństwo)', async () => {
  const bridge = { ...BRIDGE_V3, webBundleVersion: '2026-09-01T00:00:00Z', source: 'live' };
  const { run, env } = makeEnv({ remote: { webVersion: '2026-08-01T00:00:00Z', apkVersionCode: 3 }, bridge });
  env.FG_WEB_VERSION = '2026-01-01T00:00:00Z';
  const r = await run('updateManager.check()');
  assert.equal(r.webUpdate, false, JSON.stringify(r));
});

test('OTA: wyższy apkVersionCode → apkUpdate true', async () => {
  const { run } = makeEnv({ remote: { webVersion: null, apkVersionCode: 4, apkVersionName: '1.3.0' }, bridge: BRIDGE_V3 });
  const r = await run('updateManager.check()');
  assert.equal(r.apkUpdate, true);
  assert.equal(r.webUpdate, false);
});

test('OTA: applyWebUpdate pobiera paczkę, woła applyBundle i restart', async () => {
  const { run, calls, env } = makeEnv({ remote: { webVersion: '2026-08-01T00:00:00Z', apkVersionCode: 3 }, bridge: BRIDGE_V3 });
  env.FG_WEB_VERSION = '2026-07-01T00:00:00Z';
  await run('updateManager.applyWebUpdate()');
  assert.equal(calls.applyBundle.length, 1, 'applyBundle wywołane');
  const sent = JSON.parse(calls.applyBundle[0]);
  assert.equal(sent.version, '2026-08-01T00:00:00Z');
  assert.ok(sent.files['index.html'], 'paczka zawiera pliki');
  assert.equal(calls.restart, 1, 'restart po instalacji');
});

test('OTA: applyApkUpdate pobiera APK i woła installApk', async () => {
  const { run, calls } = makeEnv({ remote: { webVersion: null, apkVersionCode: 4 }, bridge: BRIDGE_V3 });
  await run('updateManager.applyApkUpdate()');
  assert.equal(calls.installApk.length, 1);
  assert.equal(calls.installApk[0], 'QVBLQVBLQVBL');
});
