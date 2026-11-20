package com.kmylpenter.familygoals;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;

/** Mostek JS window.FGNotify — top-level klasa (d8 z Termuxa NPE na klasach wewnętrznych). */
final class NotifyBridge {
  private static final String PERM = "android.permission.POST_NOTIFICATIONS";
  private final MainActivity a;

  NotifyBridge(MainActivity a) {
    this.a = a;
  }

  /** Plan [{at, week, title, text}] — zastępuje poprzedni. */
  @JavascriptInterface
  public String schedule(String json) {
    try {
      JSONArray arr = new JSONArray(json);
      PregnancyNotifier.save(a, arr);
      PregnancyNotifier.scheduleNext(a);
      return "ok:" + arr.length();
    } catch (Exception e) {
      return "err:" + e.getMessage();
    }
  }

  @JavascriptInterface
  public void cancelAll() {
    PregnancyNotifier.clear(a);
  }

  @JavascriptInterface
  public boolean hasPermission() {
    return PregnancyNotifier.enabled(a);
  }

  /**
   * Android 13+: systemowe pytanie o zgodę. Gdy zgoda zablokowana na stałe
   * (albo starszy Android z wyłączonymi powiadomieniami) — ustawienia apki.
   */
  @JavascriptInterface
  public String requestPermission() {
    if (PregnancyNotifier.enabled(a)) return "enabled";
    if (Build.VERSION.SDK_INT >= 33
        && a.checkSelfPermission(PERM) != PackageManager.PERMISSION_GRANTED) {
      boolean asked = a.getSharedPreferences(PregnancyNotifier.PREFS, Context.MODE_PRIVATE)
          .getBoolean("perm_asked", false);
      if (!asked || a.shouldShowRequestPermissionRationale(PERM)) {
        a.getSharedPreferences(PregnancyNotifier.PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("perm_asked", true).apply();
        a.runOnUiThread(new AskRunnable(a));
        return "requested";
      }
    }
    a.runOnUiThread(new SettingsRunnable(a));
    return "settings";
  }

  /** Cel z powiadomienia ("pregnancy") — jednorazowo. */
  @JavascriptInterface
  public String consumeLaunchTarget() {
    String t = MainActivity.launchTarget;
    MainActivity.launchTarget = null;
    return t == null ? "" : t;
  }

  static final class AskRunnable implements Runnable {
    private final MainActivity a;

    AskRunnable(MainActivity a) {
      this.a = a;
    }

    @Override
    public void run() {
      a.requestPermissions(new String[] {PERM}, 4201);
    }
  }

  static final class SettingsRunnable implements Runnable {
    private final MainActivity a;

    SettingsRunnable(MainActivity a) {
      this.a = a;
    }

    @Override
    public void run() {
      try {
        Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        i.putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName());
        a.startActivity(i);
      } catch (Exception e) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + a.getPackageName()));
        a.startActivity(i);
      }
    }
  }
}
