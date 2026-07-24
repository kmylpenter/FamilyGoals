#!/usr/bin/env bash
# Publikacja paczki web (OTA) do backendu GAS → Dysk (FamilyGoals-Releases).
# Telefony zobaczą baner "Nowa wersja — Aktualizuj" i podmienią pliki
# BEZ reinstalacji APK. Użycie: publish-web.sh [STAMP]
set -euo pipefail
P="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$P/.." && pwd)"
STAMP="${1:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

python3 - "$ROOT" "$STAMP" << 'EOF'
import json, sys, os, urllib.request

root, stamp = sys.argv[1], sys.argv[2]
cfg = json.load(open(os.path.join(root, 'backend-gas', '.local-config.json')))

files = {}
def add(rel):
    with open(os.path.join(root, rel), encoding='utf-8') as f:
        files[rel] = f.read()

add('index.html'); add('manifest.json'); add('sw.js')
for d in ('css', 'js', 'data'):
    for dirpath, dirs, names in os.walk(os.path.join(root, d)):
        if 'archive' in dirpath: continue
        for n in sorted(names):
            rel = os.path.relpath(os.path.join(dirpath, n), root)
            add(rel)

# Stempel wersji WEWNĄTRZ paczki (żeby zainstalowana paczka znała swoją wersję)
files['js/app-version.js'] = files['js/app-version.js'].replace(
    "FG_WEB_VERSION = 'dev'", f"FG_WEB_VERSION = '{stamp}'")

bundle = json.dumps({'version': stamp, 'files': files}, ensure_ascii=False)
envelope = json.dumps({'action': 'proxy_call', 'method': 'uploadWebBundle',
                       'args': [cfg['adminToken'], bundle], 'token': cfg['familyToken']})
req = urllib.request.Request(cfg['execUrl'], data=envelope.encode('utf-8'), method='POST')
with urllib.request.urlopen(req, timeout=180) as r:
    out = json.load(r)
print(json.dumps(out, ensure_ascii=False))
assert out.get('success') is True, 'UPLOAD PADŁ'
print(f"OPUBLIKOWANO paczkę web {stamp} ({len(files)} plików)")
EOF
