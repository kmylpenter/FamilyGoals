#!/usr/bin/env bash
# Generuje js/family-config.js (gitignored) z backend-gas/.local-config.json.
# Plik trafia TYLKO do paczki OTA i APK (kanały tokenowane) — na publicznym
# GitHub Pages go nie ma, więc token rodziny nie wycieka.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$ROOT" << 'PY'
import json, sys, os
root = sys.argv[1]
cfg = json.load(open(os.path.join(root, 'backend-gas', '.local-config.json')))
out = os.path.join(root, 'js', 'family-config.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// GENEROWANY przez scripts/gen-family-config.sh - NIE commitowac (gitignore)\n')
    f.write('window.FG_FAMILY_DEFAULTS = ' + json.dumps({'url': cfg['execUrl'], 'token': cfg['familyToken']}, ensure_ascii=False) + ';\n')
print('OK: js/family-config.js')
PY
