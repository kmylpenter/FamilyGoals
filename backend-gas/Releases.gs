/**
 * FamilyGoals-Backend — dystrybucja aktualizacji (OTA).
 *
 * Paczka web (js/css/html jako JSON {version, files}) i APK trzymane
 * PRYWATNIE na Dysku właściciela (folder FamilyGoals-Releases).
 * Upload chroniony osobnym ADMIN_TOKEN (first-writer-wins, jak FAMILY_TOKEN)
 * — telefony rodziny znają tylko FAMILY_TOKEN i mogą wyłącznie POBIERAĆ.
 */

var RELEASES_FOLDER = 'FamilyGoals-Releases';
var WEB_BUNDLE_FILE = 'web-bundle.json';
var APK_FILE = 'FamilyGoals.apk';

function claimAdminToken_(token) {
  if (!token || String(token).length < 8) throw new Error('token_too_short');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var existing = props.getProperty('ADMIN_TOKEN');
    if (existing) {
      if (existing === token) return { claimed: true, already: true };
      throw new Error('admin_token_already_claimed');
    }
    props.setProperty('ADMIN_TOKEN', String(token));
    return { claimed: true, already: false };
  } finally {
    lock.releaseLock();
  }
}

function requireAdmin_(adminToken) {
  var stored = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!stored) throw new Error('admin_not_claimed');
  if (!adminToken || adminToken !== stored) throw new Error('admin_auth');
}

function releasesFolder_() {
  var it = DriveApp.getFoldersByName(RELEASES_FOLDER);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(RELEASES_FOLDER);
}

function driveFile_(name) {
  var it = releasesFolder_().getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

/** Wersje dostępne do pobrania (telefony porównują ze swoimi). */
function getAppInfo() {
  var p = PropertiesService.getScriptProperties();
  return {
    webVersion: p.getProperty('WEB_VERSION') || null,
    apkVersionCode: parseInt(p.getProperty('APK_VERSION_CODE') || '0', 10),
    apkVersionName: p.getProperty('APK_VERSION_NAME') || null,
    serverTime: new Date().toISOString()
  };
}

/** Cała paczka web jako string JSON ({version, files:{path:content}}). */
function getWebBundle() {
  var f = driveFile_(WEB_BUNDLE_FILE);
  if (!f) throw new Error('no_web_bundle');
  return f.getBlob().getDataAsString('UTF-8');
}

/** Publikacja paczki web (tylko admin). bundleJson musi mieć version+files. */
function uploadWebBundle(adminToken, bundleJson) {
  requireAdmin_(adminToken);
  var parsed;
  try { parsed = JSON.parse(bundleJson); } catch (e) { throw new Error('bundle_bad_json'); }
  if (!parsed || !parsed.version || !parsed.files || typeof parsed.files !== 'object') {
    throw new Error('bundle_bad_shape');
  }
  var count = Object.keys(parsed.files).length;
  if (count < 3) throw new Error('bundle_suspiciously_small');

  var folder = releasesFolder_();
  var existing = driveFile_(WEB_BUNDLE_FILE);
  if (existing) {
    existing.setContent(bundleJson);
  } else {
    folder.createFile(WEB_BUNDLE_FILE, bundleJson, 'application/json');
  }
  PropertiesService.getScriptProperties().setProperty('WEB_VERSION', String(parsed.version));
  return { ok: true, version: String(parsed.version), files: count };
}

/** APK jako base64 (do instalacji przez mostek natywny). */
function getApk() {
  var f = driveFile_(APK_FILE);
  if (!f) throw new Error('no_apk');
  return {
    base64: Utilities.base64Encode(f.getBlob().getBytes()),
    versionCode: parseInt(PropertiesService.getScriptProperties().getProperty('APK_VERSION_CODE') || '0', 10),
    versionName: PropertiesService.getScriptProperties().getProperty('APK_VERSION_NAME') || null
  };
}

/** Publikacja APK (tylko admin). */
function uploadApk(adminToken, base64, versionCode, versionName) {
  requireAdmin_(adminToken);
  if (!base64 || !versionCode) throw new Error('apk_missing_args');
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length < 20000) throw new Error('apk_suspiciously_small');

  var folder = releasesFolder_();
  var blob = Utilities.newBlob(bytes, 'application/vnd.android.package-archive', APK_FILE);
  var existing = driveFile_(APK_FILE);
  if (existing) existing.setTrashed(true);
  folder.createFile(blob);

  var p = PropertiesService.getScriptProperties();
  p.setProperty('APK_VERSION_CODE', String(versionCode));
  p.setProperty('APK_VERSION_NAME', String(versionName || ''));
  return { ok: true, versionCode: parseInt(versionCode, 10), bytes: bytes.length };
}
