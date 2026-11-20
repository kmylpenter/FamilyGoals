package com.kmylpenter.familygoals;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Powiadomienia modułu ciąży („nowy tydzień — nowy rozmiar maluszka").
 * Plan [{at, week, title, text}] liczy JS (pregnancy.js) i oddaje przez
 * mostek FGNotify; tu trzymamy go w SharedPreferences i budzimy się
 * AlarmManagerem na najbliższą pozycję — działa przy zamkniętej apce.
 * Po restarcie telefonu plan wraca z NotifyReceiver (BOOT_COMPLETED).
 */
final class PregnancyNotifier {
  static final String PREFS = "fg_notify";
  static final String KEY_SCHEDULE = "schedule";
  static final String CHANNEL = "pregnancy_weekly";
  static final String ACTION_FIRE = "com.kmylpenter.familygoals.NOTIFY_FIRE";
  static final String EXTRA_TARGET = "fg_target";
  /** Powiadomienie spóźnione o więcej (telefon wyłączony) — pomijamy, nie spamujemy. */
  private static final long STALE_MS = 3L * 24 * 60 * 60 * 1000;

  private PregnancyNotifier() {}

  private static SharedPreferences prefs(Context c) {
    return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  static JSONArray load(Context c) {
    try {
      return new JSONArray(prefs(c).getString(KEY_SCHEDULE, "[]"));
    } catch (Exception e) {
      return new JSONArray();
    }
  }

  static void save(Context c, JSONArray arr) {
    prefs(c).edit().putString(KEY_SCHEDULE, arr.toString()).apply();
  }

  static void clear(Context c) {
    prefs(c).edit().remove(KEY_SCHEDULE).apply();
    AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
    if (am != null) am.cancel(alarmIntent(c));
  }

  private static PendingIntent alarmIntent(Context c) {
    Intent i = new Intent(c, NotifyReceiver.class);
    i.setAction(ACTION_FIRE);
    return PendingIntent.getBroadcast(c, 0, i,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  /** Budzik na najbliższą przyszłą pozycję planu (albo brak budzika). */
  static void scheduleNext(Context c) {
    JSONArray arr = load(c);
    long now = System.currentTimeMillis();
    long next = Long.MAX_VALUE;
    for (int i = 0; i < arr.length(); i++) {
      long at = arr.optJSONObject(i) == null ? 0 : arr.optJSONObject(i).optLong("at", 0);
      if (at > now && at < next) next = at;
    }
    AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;
    PendingIntent pi = alarmIntent(c);
    am.cancel(pi);
    if (next != Long.MAX_VALUE) {
      // Niedokładny budzik (bez uprawnienia SCHEDULE_EXACT_ALARM) — kilka minut poślizgu bez znaczenia
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
    }
  }

  /** Pokaż wszystko, co już wybiło (świeże), usuń z planu, nastaw kolejny budzik. */
  static void fireDue(Context c) {
    JSONArray arr = load(c);
    JSONArray keep = new JSONArray();
    long now = System.currentTimeMillis();
    JSONObject newest = null;
    for (int i = 0; i < arr.length(); i++) {
      JSONObject it = arr.optJSONObject(i);
      if (it == null) continue;
      long at = it.optLong("at", 0);
      if (at > now + 60000) {
        keep.put(it);
      } else if (now - at < STALE_MS) {
        if (newest == null || at > newest.optLong("at", 0)) newest = it;
      }
    }
    // Po dłuższym wyłączeniu telefonu kilka tygodni naraz → tylko najnowszy
    if (newest != null) show(c, newest);
    save(c, keep);
    scheduleNext(c);
  }

  static boolean enabled(Context c) {
    NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    return nm != null && nm.areNotificationsEnabled();
  }

  static void show(Context c, JSONObject it) {
    NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null || !nm.areNotificationsEnabled()) return;
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, "Ciąża — nowy tydzień",
          NotificationManager.IMPORTANCE_DEFAULT);
      ch.setDescription("Co tydzień nowy rozmiar maluszka (w śrubkach) i porady dla mamy i taty");
      nm.createNotificationChannel(ch);
    }
    int week = it.optInt("week", 0);
    Intent open = new Intent(c, MainActivity.class);
    open.putExtra(EXTRA_TARGET, "pregnancy");
    open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent content = PendingIntent.getActivity(c, 1000 + week, open,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    String title = it.optString("title", "Nowy tydzień ciąży");
    String text = it.optString("text", "");
    Notification.Builder b = Build.VERSION.SDK_INT >= 26
        ? new Notification.Builder(c, CHANNEL)
        : new Notification.Builder(c);
    b.setSmallIcon(R.drawable.ic_notify)
        .setContentTitle(title)
        .setContentText(text)
        .setStyle(new Notification.BigTextStyle().bigText(text))
        .setAutoCancel(true)
        .setContentIntent(content);
    nm.notify(1000 + week, b.build());
  }
}
