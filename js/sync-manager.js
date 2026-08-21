/**
 * SyncManager — synchronizacja localStorage ↔ backend GAS (Arkusz Google).
 * Wzorzec KmylSales: koperta proxy_call, trwała kolejka offline z replayem,
 * bootstrap + delta po updatedAt, last-write-wins per rekord.
 *
 * Silnik: snapshot-diff obserwowanych kluczy localStorage (bez monkey-patchy
 * na DataManagerze) — łapie KAŻDEGO writera (dm, gamification, engagement).
 * Offline-first: brak sieci nie zmienia zachowania aplikacji; kolejka czeka.
 */
(function () {
  'use strict';

  var CONFIG_KEY = 'familygoals_sync_config';     // {url, token, enabled}
  var QUEUE_KEY = 'familygoals_sync_queue';       // [{entity, record}]
  var SNAPSHOT_KEY = 'familygoals_sync_snapshot'; // {entity: {id: jsonString}}
  var META_KEY = 'familygoals_sync_meta';         // {entity: {id: updatedAt}} (encje obiektowe)
  var CURSOR_KEY = 'familygoals_sync_cursor';     // max updatedAt widziany z serwera
  var MAX_BATCH = 50;

  // Encja -> klucz localStorage + tryb
  // array: lista rekordów z id; perKey: obiekt dzielony na rekordy po kluczu
  // (achievements/engagement per osoba — małżonkowie nie nadpisują się nawzajem);
  // single: cały obiekt jako jeden rekord.
  var ENTITIES = {
    incomeSources: { key: 'familygoals_income_sources', mode: 'array' },
    income: { key: 'familygoals_income', mode: 'array' },
    plannedGoals: { key: 'familygoals_planned_override', mode: 'array' },
    businessCosts: { key: 'familygoals_business_costs', mode: 'array' },
    expenses: { key: 'familygoals_expenses', mode: 'array' },
    todos: { key: 'familygoals_todos', mode: 'array' },
    categories: { key: 'familygoals_categories', mode: 'array' },
    settings: { key: 'familygoals_settings', mode: 'single' },
    achievements: { key: 'familygoals_achievements', mode: 'perKey' },
    engagement: { key: 'familygoals_engagement', mode: 'perKey' }
  };

  var timers = { pull: null, flush: null, debounce: null };
  var state = { lastSync: null, lastError: null, syncing: false };

  // ---------- helpers ----------

  function parse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function readJson(key, fallback) { return parse(localStorage.getItem(key), fallback); }
  function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function nowIso() { return new Date().toISOString(); }

  function getConfig() {
    var cfg = readJson(CONFIG_KEY, null);
    return cfg && cfg.url && cfg.token ? cfg : null;
  }

  function invalidate(storageKey) {
    if (typeof window.dataManager !== 'undefined' && window.dataManager &&
        typeof window.dataManager._invalidateCache === 'function') {
      window.dataManager._invalidateCache(storageKey);
    }
  }

  function emitChanged() {
    if (typeof EventBus !== 'undefined' && EventBus && typeof EventBus.emit === 'function') {
      try { EventBus.emit('data:changed', { source: 'sync' }); } catch (e) { /* noop */ }
    }
  }

  /** Bieżący stan encji jako mapa id -> rekord (kopie). */
  function currentRecords(entity) {
    var def = ENTITIES[entity];
    var out = {};
    if (def.mode === 'array') {
      var arr = readJson(def.key, []);
      if (!Array.isArray(arr)) return out;
      arr.forEach(function (r) { if (r && r.id !== undefined) out[String(r.id)] = r; });
    } else if (def.mode === 'perKey') {
      var obj = readJson(def.key, null);
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(function (k) { out[k] = obj[k]; });
      }
    } else { // single
      var val = readJson(def.key, null);
      if (val !== null) out[entity] = val;
    }
    return out;
  }

  // ---------- transport ----------

  function apiCall(method, args) {
    var cfg = getConfig();
    if (!cfg) return Promise.reject(new Error('sync_not_configured'));
    var envelope = { action: 'proxy_call', method: method, args: args || [], token: cfg.token };
    var opts = { method: 'POST', body: JSON.stringify(envelope) };
    // Content-Type celowo domyślny (text/plain) — brak preflightu CORS na GAS.
    if (typeof AbortController !== 'undefined') {
      var ctrl = new AbortController();
      opts.signal = ctrl.signal;
      // Duże odpowiedzi (paczka OTA ~0,5 MB, APK, bootstrap) na wolnym wifi
      // + zimny start GAS przekraczały 30 s → aktualizacje cicho padały
      setTimeout(function () { ctrl.abort(); }, /Bootstrap|Bundle|Apk/.test(method) ? 120000 : 30000);
    }
    return fetch(cfg.url, opts).then(function (res) {
      return res.json().catch(function () { throw new Error('not_json'); });
    }).then(function (body) {
      if (!body || body.success !== true) {
        var err = new Error(body && body.error ? String(body.error) : 'unknown_error');
        err.rejected = true; // backend żyje, odrzut biznesowy (error-as-data)
        throw err;
      }
      return body.data;
    });
  }

  // ---------- detect (snapshot-diff) ----------

  /**
   * Porównuje localStorage z ostatnim snapshotem; nowe/zmienione rekordy
   * stempluje updatedAt i wrzuca do trwałej kolejki; zniknięte -> tombstone.
   */
  function detectChanges() {
    if (!getConfig()) return Promise.resolve(0);
    var snapshot = readJson(SNAPSHOT_KEY, {});
    var meta = readJson(META_KEY, {});
    var queue = readJson(QUEUE_KEY, []);
    var stamp = nowIso();
    var added = 0;

    Object.keys(ENTITIES).forEach(function (entity) {
      var def = ENTITIES[entity];
      var current = currentRecords(entity);
      var prev = snapshot[entity] || {};
      var entityMeta = meta[entity] = meta[entity] || {};
      var storageDirty = false;

      // nowe / zmienione
      Object.keys(current).forEach(function (id) {
        var serialized = JSON.stringify(stripUpdatedAt_(current[id], def.mode));
        if (prev[id] === serialized) return;
        var record;
        if (def.mode === 'array') {
          current[id].updatedAt = stamp;
          storageDirty = true;
          record = JSON.parse(JSON.stringify(current[id]));
        } else {
          entityMeta[id] = stamp;
          record = { id: id, updatedAt: stamp, data: JSON.parse(JSON.stringify(current[id])) };
        }
        upsertQueue_(queue, entity, record);
        prev[id] = serialized;
        added++;
      });

      // usunięte -> tombstone
      Object.keys(prev).forEach(function (id) {
        if (current[id] !== undefined) return;
        upsertQueue_(queue, entity, { id: id, updatedAt: stamp, deleted: true });
        delete prev[id];
        delete entityMeta[id];
        added++;
      });

      snapshot[entity] = prev;

      if (storageDirty && def.mode === 'array') {
        var arr = Object.keys(current).map(function (id) { return current[id]; });
        writeJson(def.key, arr);
        invalidate(def.key);
      }
    });

    writeJson(SNAPSHOT_KEY, snapshot);
    writeJson(META_KEY, meta);
    writeJson(QUEUE_KEY, queue);
    return Promise.resolve(added);
  }

  /** Snapshot porównuje treść BEZ updatedAt (sam stempel to nie zmiana). */
  function stripUpdatedAt_(record, mode) {
    if (mode !== 'array' || !record || typeof record !== 'object') return record;
    var copy = {};
    Object.keys(record).forEach(function (k) { if (k !== 'updatedAt') copy[k] = record[k]; });
    return copy;
  }

  /** Jedna pozycja w kolejce per (entity, id) — ostatnia zmiana wygrywa. */
  function upsertQueue_(queue, entity, record) {
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].entity === entity && String(queue[i].record.id) === String(record.id)) {
        queue.splice(i, 1);
      }
    }
    queue.push({ entity: entity, record: record });
  }

  // ---------- push ----------

  function flushQueue() {
    var cfg = getConfig();
    var queue = readJson(QUEUE_KEY, []);
    if (!cfg || queue.length === 0) return Promise.resolve({ flushed: 0 });
    var batch = queue.slice(0, MAX_BATCH);
    return apiCall('pushChanges', [batch]).then(function (result) {
      var remaining = readJson(QUEUE_KEY, []);
      batch.forEach(function (sent) {
        for (var i = remaining.length - 1; i >= 0; i--) {
          if (remaining[i].entity === sent.entity &&
              String(remaining[i].record.id) === String(sent.record.id) &&
              remaining[i].record.updatedAt === sent.record.updatedAt) {
            remaining.splice(i, 1);
          }
        }
      });
      writeJson(QUEUE_KEY, remaining);
      state.lastError = null;
      var more = remaining.length > 0 ? flushQueue() : Promise.resolve();
      return Promise.resolve(more).then(function () { return { flushed: batch.length, result: result }; });
    }).catch(function (err) {
      state.lastError = String(err && err.message || err);
      return { flushed: 0, error: state.lastError }; // kolejka nietknięta = replay
    });
  }

  // ---------- pull + merge ----------

  function pullDelta() {
    var cfg = getConfig();
    if (!cfg) return Promise.resolve({ applied: 0 });
    var cursor = localStorage.getItem(CURSOR_KEY) || '';
    var call = cursor
      ? apiCall('getFamilyBootstrapDelta', [cursor])
      : apiCall('getFamilyBootstrap', []);

    return call.then(function (data) {
      var entities = (data && data.entities) || {};
      var queue = readJson(QUEUE_KEY, []);
      var snapshot = readJson(SNAPSHOT_KEY, {});
      var meta = readJson(META_KEY, {});
      var maxSeen = cursor;
      var appliedTotal = 0;

      Object.keys(entities).forEach(function (entity) {
        var def = ENTITIES[entity];
        if (!def) return;
        var records = entities[entity] || [];
        if (!records.length) return;
        var applied = applyRemote_(entity, def, records, queue, meta);
        appliedTotal += applied;
        records.forEach(function (r) {
          if (r && r.updatedAt && r.updatedAt > maxSeen) maxSeen = r.updatedAt;
        });
        if (applied > 0) {
          // snapshot = stan po merge, żeby pull nie odbijał się echem do kolejki
          var fresh = currentRecords(entity);
          var snap = {};
          Object.keys(fresh).forEach(function (id) {
            snap[id] = JSON.stringify(stripUpdatedAt_(fresh[id], def.mode));
          });
          snapshot[entity] = snap;
        }
      });

      if (maxSeen && maxSeen !== cursor) localStorage.setItem(CURSOR_KEY, maxSeen);
      writeJson(SNAPSHOT_KEY, snapshot);
      writeJson(META_KEY, meta);
      state.lastSync = nowIso();
      state.lastError = null;
      if (appliedTotal > 0) emitChanged();
      return { applied: appliedTotal, cursor: maxSeen };
    }).catch(function (err) {
      state.lastError = String(err && err.message || err);
      return { applied: 0, error: state.lastError };
    });
  }

  function applyRemote_(entity, def, records, queue, meta) {
    var applied = 0;

    function queuedNewer(id, remoteUpdated) {
      return queue.some(function (q) {
        return q.entity === entity && String(q.record.id) === String(id) &&
               String(q.record.updatedAt || '') >= String(remoteUpdated || '');
      });
    }

    if (def.mode === 'array') {
      var arr = readJson(def.key, []);
      if (!Array.isArray(arr)) arr = [];
      var byId = {};
      arr.forEach(function (r, i) { if (r && r.id !== undefined) byId[String(r.id)] = i; });

      records.forEach(function (remote) {
        if (!remote || remote.id === undefined) return;
        var id = String(remote.id);
        if (queuedNewer(id, remote.updatedAt)) return; // lokalna świeższa zmiana czeka w kolejce
        var idx = byId[id];
        var local = idx !== undefined ? arr[idx] : null;
        var localUpdated = String((local && local.updatedAt) || '');
        if (remote.deleted === true) {
          if (local && localUpdated <= String(remote.updatedAt || '')) {
            arr.splice(idx, 1);
            byId = {};
            arr.forEach(function (r, i2) { if (r && r.id !== undefined) byId[String(r.id)] = i2; });
            applied++;
          }
          return;
        }
        if (!local || localUpdated < String(remote.updatedAt || '')) {
          if (idx !== undefined) arr[idx] = remote;
          else { arr.push(remote); byId[id] = arr.length - 1; }
          applied++;
        }
      });

      if (applied > 0) { writeJson(def.key, arr); invalidate(def.key); }
      return applied;
    }

    // perKey / single
    var obj = readJson(def.key, {}) || {};
    var entityMeta = meta[entity] = meta[entity] || {};
    records.forEach(function (remote) {
      if (!remote || remote.id === undefined) return;
      var id = String(remote.id);
      if (queuedNewer(id, remote.updatedAt)) return;
      var localUpdated = String(entityMeta[id] || '');
      if (localUpdated >= String(remote.updatedAt || '')) return;
      if (remote.deleted === true) {
        if (def.mode === 'single') obj = {};
        else delete obj[id];
      } else if (def.mode === 'single') {
        obj = remote.data;
      } else {
        obj[id] = remote.data;
      }
      entityMeta[id] = String(remote.updatedAt || '');
      applied++;
    });
    if (applied > 0) { writeJson(def.key, obj); invalidate(def.key); }
    return applied;
  }

  // ---------- cykl życia ----------

  function syncNow() {
    if (state.syncing) return Promise.resolve({ busy: true });
    state.syncing = true;
    return detectChanges()
      .then(flushQueue)
      .then(pullDelta)
      .then(function (r) { state.syncing = false; return r; })
      .catch(function (e) { state.syncing = false; state.lastError = String(e && e.message || e); return { error: state.lastError }; });
  }

  function start() {
    if (!getConfig()) return false;
    stop();
    timers.pull = setInterval(syncNow, 60000);
    timers.flush = setInterval(function () { detectChanges().then(flushQueue); }, 10000);
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('online', function () { syncNow(); });
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', function () {
        // Chowanie apki DOMYKA wysyłkę (zgłoszenie Kamila 2026-08-21: wpłata
        // 4000 została w telefonie — zegar nie zdążył przed zamknięciem);
        // kolejka jest trwała, więc nawet ubity fetch dośle przy starcie
        if (document.hidden) detectChanges().then(flushQueue);
        else syncNow();
      });
    }
    syncNow();
    return true;
  }

  function stop() {
    if (timers.pull) clearInterval(timers.pull);
    if (timers.flush) clearInterval(timers.flush);
    if (timers.debounce) clearTimeout(timers.debounce);
    timers.pull = timers.flush = timers.debounce = null;
  }

  /** Konfiguracja + claim tokena na backendzie + pierwszy pełny sync. */
  function configure(url, token) {
    writeJson(CONFIG_KEY, { url: url, token: token, enabled: true });
    return apiCall('claimToken', [token]).catch(function (err) {
      // token już zajęty tym samym sekretem = OK (already:true zwraca success)
      throw err;
    }).then(function () {
      return syncNow();
    });
  }

  function status() {
    var cfg = getConfig();
    return {
      configured: !!cfg,
      queueLength: readJson(QUEUE_KEY, []).length,
      lastSync: state.lastSync,
      lastError: state.lastError,
      cursor: localStorage.getItem(CURSOR_KEY) || null
    };
  }

  // Wysyłka OD RAZU po każdej mutacji danych: EventBus dokleja meta-event
  // 'data:changed' do każdego emitu, więc jeden nasłuch łapie wpłaty,
  // wydatki i cele. Filtr source==='sync' ucina echo własnego pulla.
  // Debounce 400 ms grupuje serie zapisów; bez configu detectChanges
  // jest tanim no-opem.
  if (typeof EventBus !== 'undefined' && EventBus && typeof EventBus.on === 'function') {
    EventBus.on('data:changed', function (payload) {
      if (payload && payload.source === 'sync') return;
      if (timers.debounce) clearTimeout(timers.debounce);
      timers.debounce = setTimeout(function () {
        timers.debounce = null;
        detectChanges().then(flushQueue);
      }, 400);
    });
  }

  window.syncManager = {
    detectChanges: detectChanges,
    flushQueue: flushQueue,
    pullDelta: pullDelta,
    syncNow: syncNow,
    start: start,
    stop: stop,
    configure: configure,
    status: status,
    _ENTITIES: ENTITIES,
    _apiCall: apiCall // reużywane przez update-manager (OTA)
  };
})();
