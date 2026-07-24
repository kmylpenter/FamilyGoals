/**
 * FamilyGoals-Backend — dispatcher (wzorzec proxy_call z KmylSales).
 *
 * Request:  POST <exec> body JSON (Content-Type text/plain — bez preflightu CORS):
 *   {"action":"proxy_call","method":"<m>","args":[...],"token":"<FAMILY_TOKEN>"}
 * Response: {"success":true,"data":<...>} | {"success":false,"error":"<msg>"}
 *
 * Auth: token rodziny w Script Properties (FAMILY_TOKEN).
 * Pierwsze użycie: metoda claimToken zapisuje token na stałe (first-writer-wins);
 * potem każde wywołanie wymaga zgodnego tokena. Rotacja: ręcznie w Script Properties.
 * Model zagrożeń: prywatna apka rodzinna — sekret = nieodgadywalny URL /exec + token.
 */

var METHODS = {
  claimToken: { fn: claimToken_, auth: false, arity: 1 },
  getFamilyBootstrap: { fn: getFamilyBootstrap, auth: true, arity: 0 },
  getFamilyBootstrapDelta: { fn: getFamilyBootstrapDelta, auth: true, arity: 1 },
  pushChanges: { fn: pushChanges, auth: true, arity: 1 }
};

function doPost(e) {
  try {
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonOut_({ success: false, error: 'bad_json' });
    }
    if (!body || body.action !== 'proxy_call' || !body.method) {
      return jsonOut_({ success: false, error: 'bad_envelope' });
    }
    var def = METHODS[body.method];
    if (!def) return jsonOut_({ success: false, error: 'unknown_method:' + body.method });

    if (def.auth) {
      var stored = props_().getProperty('FAMILY_TOKEN');
      if (!stored) return jsonOut_({ success: false, error: 'auth_not_claimed' });
      if (!body.token || body.token !== stored) {
        return jsonOut_({ success: false, error: 'auth' });
      }
    }

    var args = Array.isArray(body.args) ? body.args : [];
    var data = def.fn.apply(null, args);
    return jsonOut_({ success: true, data: data });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err && err.message || err) });
  }
}

/** Health-check bez danych (debug w przeglądarce). */
function doGet() {
  return jsonOut_({
    success: true,
    data: {
      service: 'FamilyGoals-Backend',
      serverTime: new Date().toISOString(),
      tokenClaimed: !!props_().getProperty('FAMILY_TOKEN'),
      sheetInitialized: !!props_().getProperty('SPREADSHEET_ID')
    }
  });
}

/** First-writer-wins: zapisuje token rodziny raz; kolejne próby = odmowa. */
function claimToken_(token) {
  if (!token || String(token).length < 8) throw new Error('token_too_short');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var existing = props_().getProperty('FAMILY_TOKEN');
    if (existing) {
      if (existing === token) return { claimed: true, already: true };
      throw new Error('token_already_claimed');
    }
    props_().setProperty('FAMILY_TOKEN', String(token));
    return { claimed: true, already: false };
  } finally {
    lock.releaseLock();
  }
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
