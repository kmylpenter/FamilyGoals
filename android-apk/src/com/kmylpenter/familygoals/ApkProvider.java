package com.kmylpenter.familygoals;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Minimalny provider serwujący pobrany plik aktualizacji instalatorowi
 * systemowemu (content:// zamiast file:// — wymóg API 24+). W android.jar
 * nie ma androidx FileProvider, więc własna implementacja read-only.
 */
public class ApkProvider extends ContentProvider {

  @Override
  public boolean onCreate() { return true; }

  @Override
  public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    if (!"update.apk".equals(uri.getLastPathSegment())) {
      throw new FileNotFoundException("unknown: " + uri);
    }
    File apk = new File(new File(getContext().getFilesDir(), "apk"), "update.apk");
    if (!apk.isFile()) throw new FileNotFoundException("missing update.apk");
    return ParcelFileDescriptor.open(apk, ParcelFileDescriptor.MODE_READ_ONLY);
  }

  @Override
  public String getType(Uri uri) { return "application/vnd.android.package-archive"; }

  @Override
  public Cursor query(Uri uri, String[] p, String s, String[] a, String o) { return null; }

  @Override
  public Uri insert(Uri uri, ContentValues values) { return null; }

  @Override
  public int delete(Uri uri, String s, String[] a) { return 0; }

  @Override
  public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
