/**
 * FamilyGoals-Backend — dane w Arkuszu Google.
 *
 * Arkusz "FamilyGoals-Data" tworzony automatycznie przy pierwszym użyciu
 * (ID w Script Properties). Karta per encja; kolumny czytelne dla człowieka
 * + kolumna Json = pełny rekord (źródło prawdy przy odczycie).
 *
 * Rekord: { id, updatedAt (ISO), deleted (bool), ...pola modelu }.
 * Konflikty: last-write-wins po updatedAt per rekord (pushChanges pomija
 * zmiany starsze niż stan w arkuszu).
 */

var SHEET_NAME = 'FamilyGoals-Data';

// Encja -> czytelne kolumny (podgląd; Json jest źródłem prawdy)
var ENTITIES = {
  incomeSources: ['name', 'owner', 'expectedAmount'],
  income: ['amount', 'source', 'date'],
  plannedGoals: ['name', 'type', 'targetAmount', 'currentAmount', 'monthlyContribution'],
  businessCosts: ['name', 'amount', 'isRecurring'],
  expenses: ['description', 'amount', 'categoryId', 'owner', 'date'],
  todos: ['title', 'owner', 'completed'],
  categories: ['name', 'icon'],
  settings: [],
  achievements: [],
  engagement: []
};

var FIXED_COLS = ['Id', 'Updated_At', 'Deleted'];

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      // arkusz skasowany ręcznie — utwórz nowy
    }
  }
  var ss = SpreadsheetApp.create(SHEET_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  props.setProperty('SPREADSHEET_URL', ss.getUrl());
  initTabs_(ss);
  return ss;
}

function initTabs_(ss) {
  Object.keys(ENTITIES).forEach(function (entity) {
    var sheet = ss.getSheetByName(entity);
    if (!sheet) sheet = ss.insertSheet(entity);
    var header = FIXED_COLS.concat(readableCols_(entity)).concat(['Json']);
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  var first = ss.getSheetByName('Arkusz1') || ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > Object.keys(ENTITIES).length) ss.deleteSheet(first);
}

function readableCols_(entity) {
  return ENTITIES[entity].map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); });
}

function getTab_(ss, entity) {
  var sheet = ss.getSheetByName(entity);
  if (!sheet) {
    sheet = ss.insertSheet(entity);
    var header = FIXED_COLS.concat(readableCols_(entity)).concat(['Json']);
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Wiersz arkusza -> rekord (z kolumny Json; fallback minimalny). */
function rowToRecord_(row, jsonCol) {
  var raw = row[jsonCol];
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallthrough */ }
  }
  return { id: String(row[0]), updatedAt: String(row[1] || ''), deleted: row[2] === true };
}

/** Pełny snapshot (bootstrap) lub delta po updatedAt > since. */
function getFamilyBootstrapDelta(sinceIso) {
  var ss = getSpreadsheet_();
  var since = sinceIso ? String(sinceIso) : '';
  var out = { entities: {}, serverTime: new Date().toISOString(), sheetUrl: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_URL') || ss.getUrl() };

  Object.keys(ENTITIES).forEach(function (entity) {
    var sheet = getTab_(ss, entity);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) { out.entities[entity] = []; return; }
    var lastCol = sheet.getLastColumn();
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var jsonCol = lastCol - 1; // Json = ostatnia kolumna (0-index)
    var records = [];
    for (var i = 0; i < values.length; i++) {
      var updatedAt = String(values[i][1] || '');
      if (since && updatedAt <= since) continue; // ISO stringi porównywalne leksykalnie
      records.push(rowToRecord_(values[i], jsonCol));
    }
    out.entities[entity] = records;
  });
  return out;
}

function getFamilyBootstrap() {
  return getFamilyBootstrapDelta('');
}

/**
 * Batch upsert/soft-delete. changes = [{entity, record:{id, updatedAt, deleted?, ...}}].
 * Idempotentne + LWW: zmiana starsza lub równa stanowi w arkuszu -> skip.
 */
function pushChanges(changes) {
  if (!Array.isArray(changes)) throw new Error('changes_not_array');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = getSpreadsheet_();
    var applied = 0, skipped = 0, errors = [];

    // Pogrupuj po encji — mniej operacji na arkuszu
    var byEntity = {};
    changes.forEach(function (ch) {
      if (!ch || !ch.entity || !ENTITIES.hasOwnProperty(ch.entity) || !ch.record || !ch.record.id) {
        errors.push('bad_change:' + JSON.stringify(ch).slice(0, 80));
        return;
      }
      (byEntity[ch.entity] = byEntity[ch.entity] || []).push(ch.record);
    });

    Object.keys(byEntity).forEach(function (entity) {
      var sheet = getTab_(ss, entity);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var jsonColIdx = lastCol; // 1-indexed ostatnia kolumna
      var idToRow = {};   // id -> numer wiersza (1-indexed)
      var idToUpdated = {};
      if (lastRow >= 2) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 2).getValues(); // Id, Updated_At
        for (var i = 0; i < ids.length; i++) {
          idToRow[String(ids[i][0])] = i + 2;
          idToUpdated[String(ids[i][0])] = String(ids[i][1] || '');
        }
      }

      byEntity[entity].forEach(function (record) {
        var id = String(record.id);
        var updatedAt = String(record.updatedAt || '');
        if (!updatedAt) { errors.push('no_updatedAt:' + entity + ':' + id); return; }
        var existing = idToUpdated[id];
        if (existing !== undefined && existing >= updatedAt) { skipped++; return; }

        var rowValues = buildRow_(entity, record, jsonColIdx);
        if (idToRow[id]) {
          sheet.getRange(idToRow[id], 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          sheet.appendRow(rowValues);
          idToRow[id] = sheet.getLastRow();
          idToUpdated[id] = updatedAt;
        }
        applied++;
      });
    });

    return { applied: applied, skipped: skipped, errors: errors, serverTime: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function buildRow_(entity, record, totalCols) {
  var row = [String(record.id), String(record.updatedAt || ''), record.deleted === true];
  ENTITIES[entity].forEach(function (field) {
    var v = record[field];
    row.push(v === undefined || v === null ? '' : v);
  });
  row.push(JSON.stringify(record));
  while (row.length < totalCols) row.push('');
  return row;
}
