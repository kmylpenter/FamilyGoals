/**
 * Moduł „Ciąża" — tydzień ciąży, rozmiar maluszka w wkrętach i śrubach,
 * porady dla mamy i taty, powiadomienia o nowym tygodniu.
 *
 * Dane: termin porodu w ustawieniach (settings.pregnancyDueDate = 'RRRR-MM-DD').
 * Ustawienia synchronizują się przez arkusz (sync-manager, encja settings),
 * więc wystarczy wpisać termin na jednym telefonie.
 *
 * Powiadomienia: w APK ≥ 1.4.0 mostek window.FGNotify planuje systemowe
 * powiadomienia Androida (AlarmManager — przychodzą przy zamkniętej apce).
 * Bez mostka (przeglądarka, stary APK) — komunikat w apce przy otwarciu.
 */
var Pregnancy = (function () {
  var DAY = 86400000;
  var NOTIFY_HOUR = 9;
  var LAST_WEEK_KEY = 'fg_pregnancy_last_week'; // per urządzenie, NIE synchronizowane
  var SCHEDULED_KEY = 'fg_pregnancy_scheduled_due';

  // ---------- czyste funkcje (testowane) ----------

  /** 'RRRR-MM-DD' -> Date (lokalna północ) albo null. */
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }

  function toYmd(d) {
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  /** Różnica w dniach kalendarzowych (odporna na zmianę czasu letni/zimowy). */
  function dayDiff(a, b) {
    return Math.round((a.getTime() - b.getTime()) / DAY);
  }

  /** Termin porodu z pierwszego dnia ostatniej miesiączki (reguła Naegelego: +280 dni). */
  function dueFromLmp(lmpYmd) {
    var lmp = parseYmd(lmpYmd);
    return lmp ? toYmd(addDays(lmp, 280)) : null;
  }

  /**
   * Postęp ciąży na dzień `now`.
   * week/day = ukończone tygodnie + dni (zapis lekarski „14+3").
   */
  function progress(dueYmd, now) {
    var due = parseYmd(dueYmd);
    if (!due) return null;
    var n = now ? new Date(now) : new Date();
    var today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var lmp = addDays(due, -280);
    var days = dayDiff(today, lmp);
    var week = Math.floor(days / 7);
    return {
      days: days,
      week: week,
      day: ((days % 7) + 7) % 7,
      daysLeft: dayDiff(due, today),
      percent: Math.max(0, Math.min(100, Math.round(days / 280 * 100))),
      trimester: week < 13 ? 1 : (week < 27 ? 2 : 3),
      overdue: days > 280,
      lmp: toYmd(lmp)
    };
  }

  /** Dane tygodnia (poza zakresem 4–40 przycinamy do skrajnych). */
  function weekData(week) {
    var w = Math.max(4, Math.min(40, week | 0));
    for (var i = 0; i < PREGNANCY_WEEKS.length; i++) {
      if (PREGNANCY_WEEKS[i].w === w) return PREGNANCY_WEEKS[i];
    }
    return PREGNANCY_WEEKS[0];
  }

  function formatLength(cm) {
    if (cm < 1) return Math.round(cm * 10) + ' mm';
    return cm.toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' cm';
  }

  function formatWeight(g) {
    if (g == null) return null;
    if (g < 1000) return g + ' g';
    return (g / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' kg';
  }

  function notificationFor(week) {
    var d = weekData(week);
    var text = 'Tyle co ' + d.screw.name.toLowerCase() + ' (' + d.screw.size + '). Zajrzyj, co nowego dla mamy i taty.';
    var ach = achievementsOfWeek(week);
    if (ach.length) text += ' 🏆 Osiągnięcie: ' + ach.map(function (a) { return a.title; }).join(', ') + '!';
    return {
      title: '👶 ' + week + '. tydzień — maluch ma ok. ' + formatLength(d.cm),
      text: text
    };
  }

  function achievementsOfWeek(week) {
    var list = typeof PREGNANCY_ACHIEVEMENTS !== 'undefined' ? PREGNANCY_ACHIEVEMENTS : [];
    return list.filter(function (a) { return a.w === week; });
  }

  /**
   * Osiągnięcia na bieżący tydzień: zdobyte (w ≤ week), liczba zablokowanych
   * i najbliższe — tylko jego tydzień, bez tytułu i treści (bez spoilera).
   */
  function achievementState(week) {
    var list = typeof PREGNANCY_ACHIEVEMENTS !== 'undefined' ? PREGNANCY_ACHIEVEMENTS : [];
    var unlocked = [], locked = 0, next = null;
    list.forEach(function (a) {
      if (a.w <= week) { unlocked.push(a); return; }
      locked++;
      if (!next) next = { w: a.w };
    });
    return { unlocked: unlocked, locked: locked, next: next };
  }

  /**
   * Strzałki tygodni: wolno oglądać tylko przeszłość. Zwraca nowy oglądany
   * tydzień albo null (= bieżący). delta 0 = powrót do bieżącego.
   */
  function nextViewWeek(cur, view, delta) {
    if (!delta) return null;
    var from = view == null || view > cur ? cur : view;
    var w = Math.max(4, Math.min(cur, from + delta));
    return w >= cur ? null : w;
  }

  /**
   * Plan powiadomień: początek każdego kolejnego tygodnia (4–40) o 9:00,
   * tylko przyszłe. Tydzień N zaczyna się w dniu LMP + 7·N.
   */
  function buildSchedule(dueYmd, now) {
    var due = parseYmd(dueYmd);
    if (!due) return [];
    var nowMs = now ? new Date(now).getTime() : Date.now();
    var lmp = addDays(due, -280);
    var out = [];
    for (var w = 4; w <= 40; w++) {
      var start = addDays(lmp, w * 7);
      var at = new Date(start.getFullYear(), start.getMonth(), start.getDate(), NOTIFY_HOUR, 0).getTime();
      if (at <= nowMs) continue;
      var msg = notificationFor(w);
      out.push({ at: at, week: w, title: msg.title, text: msg.text });
    }
    return out;
  }

  // ---------- stan ----------

  function getDue() {
    var dm = typeof window !== 'undefined' && window.dataManager;
    var s = dm && dm.getSettings ? dm.getSettings() : {};
    return (s && s.pregnancyDueDate) || null;
  }

  function setDue(ymd) {
    var dm = window.dataManager;
    if (!dm || !dm.updateSettings) return;
    dm.updateSettings({ pregnancyDueDate: ymd || null });
    if (typeof EventBus !== 'undefined' && EventBus.emit) {
      try { EventBus.emit('data:changed', { source: 'pregnancy' }); } catch (e) { /* noop */ }
    }
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } }

  function hasNative() {
    return typeof window !== 'undefined' && window.FGNotify && typeof window.FGNotify.schedule === 'function';
  }

  /** Plan powiadomień systemowych zgodny z bieżącym terminem (idempotentne). */
  function syncNotifications(force) {
    if (!hasNative()) return;
    var due = getDue();
    if (!force && lsGet(SCHEDULED_KEY) === String(due)) {
      // Ten sam termin — odśwież plan raz dziennie, żeby po reinstalacji/aktualizacji nie zginął
      var stamp = lsGet(SCHEDULED_KEY + '_day');
      if (stamp === toYmd(new Date())) return;
    }
    try {
      if (due) window.FGNotify.schedule(JSON.stringify(buildSchedule(due)));
      else window.FGNotify.cancelAll();
      lsSet(SCHEDULED_KEY, String(due));
      lsSet(SCHEDULED_KEY + '_day', toYmd(new Date()));
    } catch (e) { console.warn('[Pregnancy] FGNotify:', e); }
  }

  /** Bez mostka: komunikat w apce, gdy od ostatniego otwarcia zmienił się tydzień. */
  function inAppWeekCheck() {
    if (hasNative()) return;
    var p = progress(getDue());
    if (!p || p.week < 4 || p.week > 40) return;
    var last = parseInt(lsGet(LAST_WEEK_KEY), 10);
    lsSet(LAST_WEEK_KEY, String(p.week));
    if (!isNaN(last) && p.week > last && typeof Notifications !== 'undefined' && Notifications.add) {
      var msg = notificationFor(p.week);
      Notifications.add({ title: msg.title, message: msg.text, type: 'info' });
    }
  }

  // ---------- UI ----------

  var viewWeek = null; // tydzień oglądany na ekranie (strzałki), null = bieżący
  var achSeenBefore = null; // tydzień osiągnięć widziany przed tym otwarciem ekranu (znaczek „nowe")
  var ACH_SEEN_KEY = 'fg_pregnancy_ach_seen'; // per urządzenie

  function esc(s) {
    return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
  }

  function weekLabel(p) {
    return p.week + ' tyg. + ' + p.day + (p.day === 1 ? ' dzień' : ' dni');
  }

  function renderTile() {
    var el = document.getElementById('pregnancy-tile');
    if (!el) return;
    var due = getDue();
    var p = progress(due);
    if (!p) {
      el.innerHTML =
        '<div class="preg-tile preg-tile-empty" role="button" tabindex="0" onclick="Pregnancy.openSetup()">' +
          '<span class="preg-tile-icon" aria-hidden="true">👶</span>' +
          '<div><div class="preg-tile-title">Ciąża</div>' +
          '<div class="preg-tile-sub">Wpisz termin porodu — zobaczycie, jak rośnie maluch (w śrubkach 🔩)</div></div>' +
        '</div>';
      return;
    }
    if (p.days > 300) { el.innerHTML = ''; return; } // po porodzie kafelek znika
    var d = weekData(p.week);
    var size = p.week < 4 ? 'jeszcze za mały na śrubki' : 'ok. ' + formatLength(d.cm);
    el.innerHTML =
      '<div class="preg-tile" role="button" tabindex="0" onclick="Pregnancy.open()" aria-label="Moduł ciąży">' +
        '<span class="preg-tile-icon" aria-hidden="true">🔩</span>' +
        '<div class="preg-tile-body">' +
          '<div class="preg-tile-title">' + esc(weekLabel(p)) + ' · ' + esc(size) + '</div>' +
          '<div class="preg-tile-sub">' + (p.week < 4 ? 'Śrubki od 4. tygodnia' : 'Jak ' + esc(d.screw.name.toLowerCase())) + '</div>' +
          '<div class="preg-bar"><div class="preg-bar-fill" style="width:' + p.percent + '%"></div></div>' +
        '</div>' +
        '<span class="preg-tile-left">' + (p.overdue ? 'po terminie' : (p.daysLeft + ' dni')) + '</span>' +
      '</div>';
  }

  function screwSvg(cm) {
    // Śruba narysowana proporcjonalnie na linijce 0–52 cm
    var W = 300, x0 = 10, scale = (W - 20) / 52;
    var len = Math.max(2, cm * scale);
    var shaftY = 22, threads = '';
    for (var x = x0 + 8; x < x0 + len - 2; x += 5) {
      threads += '<line x1="' + x + '" y1="' + (shaftY - 4) + '" x2="' + (x + 3) + '" y2="' + (shaftY + 4) + '" />';
    }
    var ticks = '';
    for (var t = 0; t <= 50; t += 10) {
      var tx = x0 + t * scale;
      ticks += '<line x1="' + tx + '" y1="40" x2="' + tx + '" y2="46" /><text x="' + tx + '" y="56">' + t + (t === 50 ? ' cm' : '') + '</text>';
    }
    return '<svg class="preg-ruler" viewBox="0 0 ' + W + ' 60" role="img" aria-label="Długość ' + esc(formatLength(cm)) + ' na linijce">' +
      '<g class="preg-screw">' +
        '<rect x="' + x0 + '" y="' + (shaftY - 4) + '" width="' + len + '" height="8" rx="2" />' +
        '<rect x="' + x0 + '" y="' + (shaftY - 8) + '" width="' + Math.min(6, len) + '" height="16" rx="1.5" class="preg-screw-head" />' +
        '<g class="preg-threads">' + threads + '</g>' +
      '</g>' +
      '<g class="preg-ticks"><line x1="' + x0 + '" y1="40" x2="' + (W - 10) + '" y2="40" />' + ticks + '</g>' +
    '</svg>';
  }

  function renderScreen() {
    var el = document.getElementById('pregnancy-content');
    if (!el) return;
    var due = getDue();
    var p = progress(due);
    if (!p) {
      el.innerHTML =
        '<div class="preg-card preg-empty">' +
          '<div class="preg-empty-icon" aria-hidden="true">👶🔩</div>' +
          '<p>Wpisz termin porodu, a co tydzień pokażemy, jakiej wielkości jest maluch — w wkrętach i śrubach, nie w owocach.</p>' +
          '<button type="button" class="btn-primary" onclick="Pregnancy.openSetup()">Wpisz termin porodu</button>' +
        '</div>';
      return;
    }
    var cur = Math.max(4, Math.min(40, p.week));
    var w = viewWeek == null || viewWeek > cur ? cur : viewWeek; // przyszłości nie pokazujemy
    var d = weekData(w);
    var isCur = w === cur;
    var weight = formatWeight(d.g);

    var html = '';
    html += '<div class="preg-hero">' +
      '<div class="preg-hero-week">' + (isCur ? esc(weekLabel(p)) : esc(w + '. tydzień')) + '</div>' +
      '<div class="preg-hero-nav">' +
        '<button type="button" class="preg-arrow" onclick="Pregnancy.shiftWeek(-1)" aria-label="Poprzedni tydzień"' + (w <= 4 ? ' disabled' : '') + '>‹</button>' +
        '<div class="preg-hero-size">' + esc(formatLength(d.cm)) + (weight ? '<span> · ' + esc(weight) + '</span>' : '') + '</div>' +
        '<button type="button" class="preg-arrow" onclick="Pregnancy.shiftWeek(1)" aria-label="Następny tydzień"' + (isCur ? ' disabled title="Przyszłe tygodnie odblokują się same"' : '') + '>›</button>' +
      '</div>' +
      screwSvg(d.cm) +
      '<div class="preg-screw-name">🔩 ' + esc(d.screw.name) + ' <span>' + esc(d.screw.size) + '</span></div>' +
      (isCur ? '' : '<button type="button" class="preg-back-now" onclick="Pregnancy.shiftWeek(0)">↩ wróć do bieżącego tygodnia</button>') +
      '</div>';

    if (isCur) {
      html += '<div class="preg-progress">' +
        '<div class="preg-bar"><div class="preg-bar-fill" style="width:' + p.percent + '%"></div></div>' +
        '<div class="preg-progress-row"><span>' + p.trimester + '. trymestr</span><span>' +
          (p.overdue ? (-p.daysLeft) + ' dni po terminie' : 'do terminu: ' + p.daysLeft + ' dni') + '</span></div>' +
        '</div>';
    }

    if (isCur) html += achievementsHtml(p.week);

    html += section('🔧 Do czego służy', esc(d.screw.use) + '<div class="preg-where">📍 ' + esc(d.screw.where) + '</div>');
    html += section('👶 Co u maluszka', esc(d.baby));
    html += section('🤰 Dla mamy', esc(d.mama), 'preg-mama');
    html += section('👨 Dla taty', esc(d.tata), 'preg-tata');

    var ms = PREGNANCY_MILESTONES.map(function (m) {
      var state = w > m.to ? 'done' : (w >= m.from ? 'now' : 'next');
      return '<li class="preg-ms preg-ms-' + state + '"><span class="preg-ms-weeks">' + m.from + (m.to !== m.from ? '–' + m.to : '') + '</span>' +
        '<div><div class="preg-ms-title">' + esc(m.title) + '</div><div class="preg-ms-text">' + esc(m.text) + '</div></div></li>';
    }).join('');
    html += section('📅 Badania i ważne momenty', '<ul class="preg-ms-list">' + ms + '</ul>');

    html += section('🚨 Jedźcie do szpitala od razu, gdy…',
      '<ul class="preg-flags">' + PREGNANCY_RED_FLAGS.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>',
      'preg-alert');

    html += '<div class="preg-footer">' +
      '<div>Termin porodu: <b>' + esc(formatDatePl(due)) + '</b> · ' + notifyStatusHtml() + '</div>' +
      '<button type="button" class="preg-link" onclick="Pregnancy.openSetup()">Zmień termin</button>' +
      '<p class="muted">Rozmiary to średnie — każde dziecko rośnie w swoim tempie. Porady są ogólne i nie zastępują lekarza ani położnej.</p>' +
      '</div>';

    el.innerHTML = html;
  }

  function achievementsHtml(week) {
    var s = achievementState(week);
    var seen = achSeenBefore;
    var newest = s.unlocked.slice().reverse();
    var li = function (a) {
      var isNew = seen != null && a.w > seen;
      return '<li class="preg-ach' + (isNew ? ' preg-ach-new' : '') + '">' +
        '<span class="preg-ach-icon" aria-hidden="true">' + a.icon + '</span>' +
        '<div><div class="preg-ach-title">' + esc(a.title) + (isNew ? ' <span class="preg-ach-badge">nowe!</span>' : '') +
          ' <span class="preg-ach-week">' + a.w + '. tydz.</span></div>' +
        '<div class="preg-ach-text">' + esc(a.text) + '</div></div></li>';
    };
    // Widać 3 najnowsze (albo wszystkie „nowe"), resztę po rozwinięciu
    var shown = Math.max(3, newest.filter(function (a) { return seen != null && a.w > seen; }).length);
    var rest = newest.slice(shown);
    var body = (newest.length ? '<ul class="preg-ach-list">' + newest.slice(0, shown).map(li).join('') + '</ul>' +
        (rest.length ? '<details class="preg-ach-more"><summary>Pokaż wcześniejsze (' + rest.length + ')</summary>' +
          '<ul class="preg-ach-list">' + rest.map(li).join('') + '</ul></details>' : '')
      : '<p class="muted">Pierwsze osiągnięcie w 4. tygodniu.</p>') +
      (s.next ? '<div class="preg-ach-next">🔒 Następne odblokuje się w ' + s.next.w + '. tygodniu · do zdobycia jeszcze ' + s.locked + '</div>'
        : '<div class="preg-ach-next">Komplet! Wszystkie śrubki dokręcone 🔩</div>');
    return section('🏆 Osiągnięcia · ' + s.unlocked.length + '/' + (s.unlocked.length + s.locked), body, 'preg-ach-card');
  }

  function section(title, body, cls) {
    return '<div class="preg-card' + (cls ? ' ' + cls : '') + '"><h3>' + title + '</h3><div class="preg-card-body">' + body + '</div></div>';
  }

  function formatDatePl(ymd) {
    var d = parseYmd(ymd);
    return d ? d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  }

  function notifyStatusHtml() {
    if (!hasNative()) return '<span class="muted">powiadomienia w apce</span>';
    var ok = true;
    try { ok = window.FGNotify.hasPermission ? !!window.FGNotify.hasPermission() : true; } catch (e) { /* noop */ }
    return ok ? '🔔 powiadomienia włączone'
      : '<button type="button" class="preg-link" onclick="Pregnancy.askPermission()">🔕 włącz powiadomienia</button>';
  }

  function askPermission() {
    if (!hasNative() || !window.FGNotify.requestPermission) return;
    try { window.FGNotify.requestPermission(); } catch (e) { /* noop */ }
    // Wynik okna systemowego przychodzi asynchronicznie — odśwież po chwili
    setTimeout(renderScreen, 1500);
    setTimeout(renderScreen, 5000);
  }

  function shiftWeek(delta) {
    var p = progress(getDue());
    if (!p) return;
    viewWeek = nextViewWeek(Math.max(4, Math.min(40, p.week)), viewWeek, delta);
    renderScreen();
  }

  function open() {
    viewWeek = null;
    var p = progress(getDue());
    var seen = parseInt(lsGet(ACH_SEEN_KEY), 10);
    achSeenBefore = isNaN(seen) ? null : seen; // pierwsze otwarcie: bez znaczków „nowe"
    if (p) lsSet(ACH_SEEN_KEY, String(p.week));
    renderScreen();
    if (typeof showScreen === 'function') showScreen('screen-pregnancy');
  }

  function openSetup() {
    var dueIn = document.getElementById('preg-due');
    var lmpIn = document.getElementById('preg-lmp');
    if (dueIn) dueIn.value = getDue() || '';
    if (lmpIn) lmpIn.value = '';
    var del = document.getElementById('preg-clear');
    if (del) del.style.display = getDue() ? '' : 'none';
    if (typeof openModal === 'function') openModal('modal-pregnancy');
  }

  function onLmpInput() {
    var lmpIn = document.getElementById('preg-lmp');
    var dueIn = document.getElementById('preg-due');
    var due = dueFromLmp(lmpIn && lmpIn.value);
    if (due && dueIn) dueIn.value = due;
  }

  function saveSetup() {
    var dueIn = document.getElementById('preg-due');
    var due = dueIn && dueIn.value;
    var p = progress(due);
    if (!p || p.days < 0 || p.days > 300) {
      if (typeof Toast !== 'undefined' && Toast.error) Toast.error('Sprawdź datę', 'Termin porodu wygląda na nieprawidłowy.');
      return;
    }
    setDue(due);
    lsSet(LAST_WEEK_KEY, String(p.week));
    if (typeof closeAllModals === 'function') closeAllModals();
    syncNotifications(true);
    if (hasNative() && window.FGNotify.requestPermission) {
      try { window.FGNotify.requestPermission(); } catch (e) { /* noop */ }
    }
    open();
    if (typeof Toast !== 'undefined' && Toast.success) Toast.success('Zapisano', 'Termin porodu: ' + formatDatePl(due));
  }

  function clearSetup() {
    if (!confirm('Usunąć termin porodu? Moduł ciąży zniknie na obu telefonach.')) return;
    setDue(null);
    if (typeof closeAllModals === 'function') closeAllModals();
    syncNotifications(true);
    renderTile();
    if (typeof showScreen === 'function') showScreen('screen-dashboard');
  }

  function render() {
    renderTile();
    var scr = document.getElementById('screen-pregnancy');
    if (scr && scr.classList.contains('active')) renderScreen();
  }

  function init() {
    render();
    syncNotifications(false);
    inAppWeekCheck();
    if (typeof EventBus !== 'undefined' && EventBus.on) {
      var t = null;
      EventBus.on('data:changed', function () {
        clearTimeout(t);
        t = setTimeout(function () { render(); syncNotifications(false); }, 150);
      });
    }
    // Wejście z powiadomienia → ekran ciąży (tylko gdy apka nie czeka na PIN)
    try {
      var target = hasNative() && window.FGNotify.consumeLaunchTarget ? window.FGNotify.consumeLaunchTarget() : '';
      var pin = document.getElementById('pin-screen');
      if (target === 'pregnancy' && !(pin && pin.classList.contains('active'))) open();
    } catch (e) { /* noop */ }
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
  }

  return {
    // czyste (testy)
    parseYmd: parseYmd, dueFromLmp: dueFromLmp, progress: progress, weekData: weekData,
    formatLength: formatLength, formatWeight: formatWeight, buildSchedule: buildSchedule,
    notificationFor: notificationFor, achievementState: achievementState, nextViewWeek: nextViewWeek,
    // UI
    open: open, openSetup: openSetup, saveSetup: saveSetup, clearSetup: clearSetup,
    onLmpInput: onLmpInput, shiftWeek: shiftWeek, askPermission: askPermission,
    render: render, init: init, syncNotifications: syncNotifications
  };
})();

if (typeof window !== 'undefined') window.Pregnancy = Pregnancy;
