#!/bin/bash
# Archiwizacja starych wpisów gdy logi >10k tokenów
# Użycie: ./logs/archive.sh

DATE=$(date +%Y-%m)
CHANGELOG="logs/CHANGELOG.md"
DEVLOG="logs/DEVLOG.md"
ARCHIVE_DIR="logs/archive"

mkdir -p "$ARCHIVE_DIR"

# Sprawdź rozmiar (przybliżona estymacja tokenów: 1 token ≈ 4 znaki)
CHANGELOG_SIZE=$(wc -c < "$CHANGELOG" 2>/dev/null || echo 0)
DEVLOG_SIZE=$(wc -c < "$DEVLOG" 2>/dev/null || echo 0)
TOTAL_CHARS=$((CHANGELOG_SIZE + DEVLOG_SIZE))
ESTIMATED_TOKENS=$((TOTAL_CHARS / 4))

echo "Szacowane tokeny: $ESTIMATED_TOKENS (limit: 10000)"

if [ "$ESTIMATED_TOKENS" -gt 10000 ]; then
    echo "Przekroczono limit! Archiwizuję stare wpisy..."

    # Archiwizuj CHANGELOG (wpisy starsze niż 30 dni)
    if [ -f "$CHANGELOG" ]; then
        cp "$CHANGELOG" "$ARCHIVE_DIR/CHANGELOG-$DATE.md"
        echo "Zarchiwizowano: $ARCHIVE_DIR/CHANGELOG-$DATE.md"
        echo "UWAGA: Ręcznie usuń stare wpisy z $CHANGELOG"
    fi

    # Archiwizuj DEVLOG (wpisy starsze niż 14 dni)
    if [ -f "$DEVLOG" ]; then
        cp "$DEVLOG" "$ARCHIVE_DIR/DEVLOG-$DATE.md"
        echo "Zarchiwizowano: $ARCHIVE_DIR/DEVLOG-$DATE.md"
        echo "UWAGA: Ręcznie usuń stare wpisy z $DEVLOG"
    fi
else
    echo "OK - w limicie tokenów"
fi
