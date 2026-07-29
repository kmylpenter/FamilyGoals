#!/usr/bin/env bash
# Publikacja paczki web (OTA) do backendu GAS → Dysk (FamilyGoals-Releases).
# Telefony zobaczą baner "Nowa wersja — Aktualizuj" i podmienią pliki
# BEZ reinstalacji APK. Użycie: publish-web.sh [STAMP]
set -euo pipefail
P="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$P/.." && pwd)"
STAMP="${1:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
bash "$ROOT/scripts/gen-family-config.sh"

python3 - "$ROOT" "$STAMP" << 'EOF'
import json, sys, os, urllib.request

root, stamp = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(root, 'scripts'))
import importlib.util
_spec = importlib.util.spec_from_file_location(
    'stamp_web_refs', os.path.join(root, 'scripts', 'stamp-web-refs.py'))
stamper = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(stamper)
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

# Odwołania js/css dostają ?v=wersja — bez tego WebView w APK po restarcie
# podaje STARE skrypty ze swojego cache pod tym samym URL-em (incydent
# 2026-07-29: nowy index.html + stary app.js => crash na openAddExpense)
files['index.html'] = stamper.restamp(files['index.html'], stamp)
left = stamper.unstamped(files['index.html'])
assert not left, f'ODWOŁANIA BEZ WERSJI: {left}'
refs = [r for r in __import__('re').findall(r'(?:src|href)="((?:js|css)/[^"?#]+)\?v=', files['index.html'])]
brak = [r for r in refs if r not in files]
assert not brak, f'index.html wskazuje pliki spoza paczki: {brak}'
print(f"ostemplowano {len(refs)} odwołań js/css wersją {stamp}")

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
