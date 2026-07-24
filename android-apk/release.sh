#!/usr/bin/env bash
# PEŁNE WYDANIE FamilyGoals jedną komendą:
#   1) publikuje paczkę web (OTA — telefony zaktualizują się same),
#   2) buduje APK z TĄ SAMĄ wersją web w środku,
#   3) wgrywa APK na Dysk (aktualizacja przez systemowy instalator,
#      gdy podbito versionCode w AndroidManifest.xml),
#   4) kopiuje APK do /sdcard/Download.
# Codzienny fix JS/CSS/HTML: wystarczy `release.sh --web-only`.
set -euo pipefail
P="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$P/.." && pwd)"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "=== RELEASE $STAMP ==="
echo "[A] Bramka testowa"
( cd "$ROOT" && npm test >/dev/null 2>&1 ) || { echo "✗ TESTY CZERWONE — wydanie przerwane"; exit 1; }
echo "    testy zielone"

echo "[B] Publikacja paczki web (OTA)"
bash "$P/publish-web.sh" "$STAMP"

if [ "${1:-}" = "--web-only" ]; then
  echo "=== GOTOWE (web-only) — telefony zobaczą aktualizację przy następnym otwarciu ==="
  exit 0
fi

echo "[C] Build APK (wersja web: $STAMP)"
FG_STAMP="$STAMP" bash "$P/build-apk.sh"

echo "[D] Upload APK na Dysk"
VER_CODE="$(grep versionCode "$P/AndroidManifest.xml" | sed 's/.*versionCode="\([0-9]*\)".*/\1/')"
VER_NAME="$(grep versionName "$P/AndroidManifest.xml" | sed 's/.*versionName="\([^"]*\)".*/\1/')"
python3 - "$ROOT" "$VER_CODE" "$VER_NAME" << 'EOF'
import base64, json, sys, os, urllib.request
root, code, name = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(os.path.join(root, 'backend-gas', '.local-config.json')))
apk_path = os.path.join(root, 'apk', f'FamilyGoals-{name}.apk')
b64 = base64.b64encode(open(apk_path, 'rb').read()).decode()
envelope = json.dumps({'action': 'proxy_call', 'method': 'uploadApk',
                       'args': [cfg['adminToken'], b64, code, name], 'token': cfg['familyToken']})
req = urllib.request.Request(cfg['execUrl'], data=envelope.encode(), method='POST')
with urllib.request.urlopen(req, timeout=180) as r:
    out = json.load(r)
print(json.dumps(out, ensure_ascii=False))
assert out.get('success') is True, 'UPLOAD APK PADŁ'
EOF

cp "$ROOT/apk/FamilyGoals-$VER_NAME.apk" /sdcard/Download/ 2>/dev/null && echo "[E] APK w /sdcard/Download/FamilyGoals-$VER_NAME.apk" || true
echo "=== WYDANIE $STAMP GOTOWE ==="
