package com.kmylpenter.familygoals;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * FamilyGoals — natywne opakowanie (wzorzec toolchainu KmylSales).
 * Jedyny ekran: WebView ładujący aplikację Z PLIKÓW WEWNĄTRZ APK
 * (file:///android_asset/www/) — zero hostingu, zero paska przeglądarki.
 * Dane: localStorage WebView + sync do backendu GAS (fetch z originu file://
 * zweryfikowany probe'em; PIN ma fallback bez crypto.subtle — fix E-C2).
 */
public class MainActivity extends Activity {
  private WebView web;

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
    // (a changePin używa prompt, clearData confirm)
    web.setWebChromeClient(new WebChromeClient());

    web.setWebViewClient(new AppWebViewClient(this));

    if (savedInstanceState != null) {
      web.restoreState(savedInstanceState);
    } else {
      web.loadUrl("file:///android_asset/www/index.html");
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

  /** Nazwana klasa zamiast anonimowej — d8 (Termux) wywala się NPE na $1. */
  private static class AppWebViewClient extends WebViewClient {
    private final Activity activity;

    AppWebViewClient(Activity activity) {
      this.activity = activity;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
      Uri u = req.getUrl();
      if ("file".equals(u.getScheme())) return false; // nawigacja w aplikacji
      activity.startActivity(new Intent(Intent.ACTION_VIEW, u)); // zewnętrzne -> przeglądarka
      return true;
    }
  }
}
