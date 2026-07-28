#!/usr/bin/env bash
# BRAMKA + DEPLOY backendu GAS (FamilyBackend/Code/Releases).
#
# Dlaczego skrypt, a nie gołe `clasp push`:
#   1) deploy backendu ma iść WYŁĄCZNIE za zieloną suitą (jak `release.sh` dla webu),
#   2) produkcyjny adres /exec serwuje WERSJĘ wdrożenia, nie HEAD — sam push nie
#      zmienia niczego dla telefonów; trzeba podbić wersję TEGO SAMEGO wdrożenia
#      (URL zostaje bez zmian, więc apki nie wymagają rekonfiguracji).
#
# Id wdrożenia czytane z backend-gas/.local-config.json (gitignore) — adres
# backendu nigdy nie trafia do publicznego repo.
#
# Użycie: bash backend-gas/deploy-z-bramka.sh "opis zmiany"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESC="${1:-deploy backendu}"

echo "=== DEPLOY BACKENDU: $DESC ==="

echo "[A] Bramka testowa"
( cd "$ROOT" && npm test >/dev/null 2>&1 ) || { echo "✗ TESTY CZERWONE — deploy przerwany"; exit 1; }
echo "    testy zielone"

DEPLOY_ID="$(python3 - "$ROOT" <<'EOF'
import json, os, re, sys
cfg = json.load(open(os.path.join(sys.argv[1], 'backend-gas', '.local-config.json')))
m = re.search(r'/macros/s/([^/]+)/exec', cfg['execUrl'])
assert m, 'nie umiem wyłuskać id wdrożenia z execUrl'
print(m.group(1))
EOF
)"
[ -n "$DEPLOY_ID" ] || { echo "✗ brak id wdrożenia produkcyjnego"; exit 1; }

echo "[B] Push kodu do projektu Apps Script"
( cd "$ROOT/backend-gas" && clasp push --force )

echo "[C] Nowa wersja wdrożenia produkcyjnego (ten sam URL)"
( cd "$ROOT/backend-gas" && clasp deploy --deploymentId "$DEPLOY_ID" --description "$DESC" )

echo "=== BACKEND WDROŻONY ($DESC) ==="
