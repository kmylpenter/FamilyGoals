package com.kmylpenter.familygoals;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Budzik modułu ciąży + odtworzenie planu po restarcie telefonu
 * i po aktualizacji APK. Każde zdarzenie = pokaż zaległe świeże, nastaw kolejne.
 */
public class NotifyReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context c, Intent i) {
    PregnancyNotifier.fireDue(c);
  }
}
