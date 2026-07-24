/**
 * UpdateManager — aktualizacje z wnętrza aplikacji (OTA).
 *
 * Dwie ścieżki:
 *  - paczka web (js/css/html) → mostek natywny FGUpdater.applyBundle + restart
 *    (bez instalatora — niewidoczne dla użytkownika poza przeładowaniem),
 *  - nowy APK → FGUpdater.installApk (systemowy instalator, jedno "Zainstaluj").
 *
 * Wersje z backendu GAS (getAppInfo); transport reużywa konfiguracji
 * syncManagera (ten sam URL + token rodziny). W przeglądarce (brak mostka)
 * aktualizacje są nieaktywne — to tryb deweloperski.
 */
(function () {
  'use strict';

  function bridgeInfo() {
    if (typeof window.FGUpdater === 'undefined' || !window.FGUpdater) return null;
    try {
      var info = JSON.parse(window.FGUpdater.getInfo());
      return info && !info.error ? info : null;
    } catch (e) {
      return null;
    }
  }

  function api(method, args) {
    if (typeof syncManager === 'undefined' || !syncManager._apiCall) {
      return Promise.reject(new Error('sync_not_configured'));
    }
    return syncManager._apiCall(method, args);
  }

  function localWebVersion(info) {
    // paczka live (OTA) ma pierwszeństwo; inaczej wersja wbudowana w pliki
    return (info && info.webBundleVersion) || window.FG_WEB_VERSION || 'dev';
  }

  /** Porównanie z serwerem. {available, webUpdate, apkUpdate, remote, local} */
  function check() {
    var info = bridgeInfo();
    if (!info) {
      return Promise.resolve({ available: false, reason: 'no_bridge' });
    }
    return api('getAppInfo', []).then(function (remote) {
      var localWeb = localWebVersion(info);
      var webUpdate = !!(remote.webVersion && String(remote.webVersion) > String(localWeb));
      var apkUpdate = !!(remote.apkVersionCode && remote.apkVersionCode > info.versionCode);
      return {
        available: webUpdate || apkUpdate,
        webUpdate: webUpdate,
        apkUpdate: apkUpdate,
        remote: remote,
        local: { web: localWeb, versionCode: info.versionCode, versionName: info.versionName }
      };
    });
  }

  /** Pobiera i instaluje paczkę web, po czym przeładowuje aplikację. */
  function applyWebUpdate() {
    return api('getWebBundle', []).then(function (bundle) {
      var json = typeof bundle === 'string' ? bundle : JSON.stringify(bundle);
      var res = String(window.FGUpdater.applyBundle(json));
      if (res.indexOf('ok') !== 0) throw new Error('apply_failed:' + res);
      window.FGUpdater.restart();
      return res;
    });
  }

  /** Pobiera APK i odpala systemowy instalator. */
  function applyApkUpdate() {
    return api('getApk', []).then(function (apk) {
      var res = String(window.FGUpdater.installApk(apk.base64));
      if (res.indexOf('ok') !== 0) throw new Error('install_failed:' + res);
      return res;
    });
  }

  window.updateManager = {
    check: check,
    applyWebUpdate: applyWebUpdate,
    applyApkUpdate: applyApkUpdate,
    _bridgeInfo: bridgeInfo
  };
})();
