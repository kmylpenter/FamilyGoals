package com.kmylpenter.familygoals;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Scanner;

/**
 * FamilyGoals — natywne opakowanie (toolchain KmylSales) + OTA.
 * WebView ładuje interfejs z: filesDir/www-live (paczka OTA, jeśli
 * zainstalowana) albo z assets/www (wbudowana w APK). Mostek FGUpdater
 * pozwala JS-owi instalować nowe paczki web bez reinstalacji APK
 * oraz odpalić systemowy instalator dla nowych APK.
 */
public class MainActivity extends Activity {
  private WebView web;

  static File liveDir(Activity a) { return new File(a.getFilesDir(), "www-live"); }

  private String startUrl() {
    File idx = new File(liveDir(this), "index.html");
    if (idx.isFile()) return "file://" + idx.getAbsolutePath();
    return "file:///android_asset/www/index.html";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);          // localStorage
    s.setAllowFileAccess(true);
    s.setAllowFileAccessFromFileURLs(true);
    s.setAllowUniversalAccessFromFileURLs(true); // fetch file:// -> https (sync GAS)

    // Bez WebChromeClient JS-owe alert/confirm/prompt są CICHO połykane
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new AppWebViewClient(this));
    web.addJavascriptInterface(new Updater(), "FGUpdater");

    if (savedInstanceState != null) {
      web.restoreState(savedInstanceState);
    } else {
      web.loadUrl(startUrl());
    }
    setContentView(web);
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    web.saveState(out);
  }

  @Override
  public void onBackPressed() {
    if (web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  private static void deleteRecursive(File f) {
    if (f == null || !f.exists()) return;
    File[] kids = f.listFiles();
    if (kids != null) for (File k : kids) deleteRecursive(k);
    f.delete();
  }

  /** Nazwana klasa zamiast anonimowej — d8 (Termux) wywala się NPE na $1. */
  private static class AppWebViewClient extends WebViewClient {
    private final MainActivity activity;

    AppWebViewClient(MainActivity activity) {
      this.activity = activity;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
      Uri u = req.getUrl();
      if ("file".equals(u.getScheme())) return false; // nawigacja w aplikacji
      activity.startActivity(new Intent(Intent.ACTION_VIEW, u)); // zewnętrzne -> przeglądarka
      return true;
    }

    @Override
    public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
      // SAFE MODE: zepsuta paczka OTA nie może zabić aplikacji —
      // przy błędzie głównej ramki z www-live wracamy do wersji z APK
      if (req.isForMainFrame() && String.valueOf(req.getUrl()).contains("www-live")) {
        deleteRecursive(liveDir(activity));
        v.loadUrl("file:///android_asset/www/index.html");
      }
    }
  }

  /** Mostek JS (window.FGUpdater) — metody wołane z update-manager.js. */
  private class Updater {

    /** {versionCode, versionName, webBundleVersion|null, source} */
    @JavascriptInterface
    public String getInfo() {
      try {
        PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
        JSONObject o = new JSONObject();
        o.put("versionCode", pi.versionCode);
        o.put("versionName", pi.versionName);
        File marker = new File(liveDir(MainActivity.this), ".version");
        String webVer = null;
        if (marker.isFile()) {
          Scanner sc = new Scanner(marker, "UTF-8");
          webVer = sc.hasNextLine() ? sc.nextLine().trim() : null;
          sc.close();
        }
        o.put("webBundleVersion", webVer == null ? JSONObject.NULL : webVer);
        o.put("source", new File(liveDir(MainActivity.this), "index.html").isFile() ? "live" : "assets");
        return o.toString();
      } catch (Exception e) {
        return "{\"error\":\"" + e.getMessage() + "\"}";
      }
    }

    /**
     * Instalacja paczki web: {version, files:{"index.html":"...", "js/app.js":"..."}}.
     * Atomowo: zapis do www-live-tmp, potem podmiana katalogu.
     */
    @JavascriptInterface
    public String applyBundle(String bundleJson) {
      File tmp = new File(getFilesDir(), "www-live-tmp");
      try {
        JSONObject bundle = new JSONObject(bundleJson);
        String version = bundle.getString("version");
        JSONObject files = bundle.getJSONObject("files");
        if (files.length() < 3) return "err:bundle_too_small";

        deleteRecursive(tmp);
        Iterator<String> it = files.keys();
        while (it.hasNext()) {
          String path = it.next();
          if (path.contains("..") || path.startsWith("/")) return "err:bad_path:" + path;
          File out = new File(tmp, path);
          File parent = out.getParentFile();
          if (parent != null) parent.mkdirs();
          OutputStreamWriter w = new OutputStreamWriter(new FileOutputStream(out), StandardCharsets.UTF_8);
          w.write(files.getString(path));
          w.close();
        }
        if (!new File(tmp, "index.html").isFile()) return "err:no_index";

        OutputStreamWriter m = new OutputStreamWriter(
            new FileOutputStream(new File(tmp, ".version")), StandardCharsets.UTF_8);
        m.write(version);
        m.close();

        File live = liveDir(MainActivity.this);
        deleteRecursive(live);
        if (!tmp.renameTo(live)) return "err:rename_failed";
        return "ok:" + version;
      } catch (Exception e) {
        deleteRecursive(tmp);
        return "err:" + e.getMessage();
      }
    }

    /** Powrót do wersji wbudowanej w APK. */
    @JavascriptInterface
    public String clearBundle() {
      deleteRecursive(liveDir(MainActivity.this));
      return "ok";
    }

    /** Przeładowanie aplikacji (po applyBundle). */
    @JavascriptInterface
    public void restart() {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          web.loadUrl(startUrl());
        }
      });
    }

    /** Zapis APK (base64) i systemowy instalator. */
    @JavascriptInterface
    public String installApk(String base64) {
      try {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        if (bytes.length < 20000) return "err:apk_too_small";
        File dir = new File(getFilesDir(), "apk");
        dir.mkdirs();
        File apk = new File(dir, "update.apk");
        FileOutputStream fo = new FileOutputStream(apk);
        fo.write(bytes);
        fo.close();

        Uri uri = Uri.parse("content://com.kmylpenter.familygoals.apk/update.apk");
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(i);
        return "ok";
      } catch (Exception e) {
        return "err:" + e.getMessage();
      }
    }
  }
}
