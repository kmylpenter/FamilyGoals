#!/usr/bin/env bash
# FamilyGoals — lokalny build APK (wzorzec KmylSales: aapt2+javac+d8+apksigner,
# bez Gradle). Web-aplikacja pakowana DO APK jako assets/www (zero hostingu).
# Podpis: apk/signing.keystore (TEN SAM klucz co v1 → instaluje się jako update).
set -euo pipefail
P="$(cd "$(dirname "$0")" && pwd)"          # android-apk/
ROOT="$(cd "$P/.." && pwd)"                  # korzeń projektu
AJ="${ANDROID_JAR:-/data/data/com.termux/files/home/android-sdk/platforms/android-34/android.jar}"
KS="$ROOT/apk/signing.keystore"
KS_PASS="$(grep -m1 'Key store password' "$ROOT/apk/signing-key-info.txt" | sed 's/.*: //' | tr -d '\r\n ')"
VER="$(grep versionName "$P/AndroidManifest.xml" | sed 's/.*versionName="\([^"]*\)".*/\1/')"
OUT_APK="$ROOT/apk/FamilyGoals-$VER.apk"
O="$P/build"
bash "$ROOT/scripts/gen-family-config.sh"
rm -rf "$O"; mkdir -p "$O/obj" "$O/assets/www"

echo "[1/8] assets: kopiuję web-aplikację do APK"
cp "$ROOT/index.html" "$ROOT/manifest.json" "$ROOT/sw.js" "$O/assets/www/"
cp -r "$ROOT/css" "$ROOT/js" "$ROOT/data" "$ROOT/icons" "$O/assets/www/"
rm -rf "$O/assets/www/js/archive"
# Stempel wersji paczki web wbudowanej w APK (FG_STAMP z release.sh
# = ta sama wersja co opublikowana paczka OTA → świeży APK bez fałszywego
# "dostępna aktualizacja")
STAMP="${FG_STAMP:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
sed -i "s/FG_WEB_VERSION = '[^']*'/FG_WEB_VERSION = '$STAMP'/" "$O/assets/www/js/app-version.js"
# Odwołania js/css z wersją — ten sam powód co w publish-web.sh (cache WebView)
python3 "$ROOT/scripts/stamp-web-refs.py" "$O/assets/www/index.html" "$STAMP"
echo "    $(find "$O/assets/www" -type f | wc -l) plików, wersja web: $STAMP"

echo "[2/8] aapt2 compile (res)"
aapt2 compile --dir "$P/res" -o "$O/res.zip"

echo "[3/8] aapt2 link -> base.apk (manifest + res + assets)"
aapt2 link -o "$O/base.apk" -I "$AJ" \
  --manifest "$P/AndroidManifest.xml" \
  -A "$O/assets" \
  --java "$O" \
  --min-sdk-version 24 --target-sdk-version 34 \
  "$O/res.zip"

echo "[4/8] javac"
if ! javac -source 8 -target 8 -classpath "$AJ" -d "$O/obj" \
    $(find "$P/src" -name '*.java') $(find "$O" -name 'R.java') 2>"$O/javac.err"; then
  grep -vE "bootstrap class path|source value 8 is obsolete|to suppress" "$O/javac.err" >&2 || true
  echo "BŁĄD KOMPILACJI javac — build przerwany." >&2
  exit 1
fi

echo "[5/8] d8 -> classes.dex"
d8 --min-api 24 --lib "$AJ" --output "$O" $(find "$O/obj" -name '*.class')

echo "[6/8] dołącz classes.dex"
cp "$O/base.apk" "$O/unsigned.apk"
( cd "$O" && zip -q unsigned.apk classes.dex )

echo "[7/8] zipalign"
zipalign -f -p 4 "$O/unsigned.apk" "$O/aligned.apk"

echo "[8/8] sign (klucz rodzinny z apk/)"
apksigner sign --ks "$KS" --ks-pass "pass:$KS_PASS" --ks-key-alias familygoals \
  --out "$OUT_APK" "$O/aligned.apk"
apksigner verify --print-certs "$OUT_APK" >/dev/null && echo "  podpis OK"
echo "GOTOWE -> $OUT_APK"
