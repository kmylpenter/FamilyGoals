#!/usr/bin/env python3
"""Stempluje LOKALNE odwołania js/css w index.html wersją paczki (?v=STAMP).

Po co (incydent 2026-07-29): WebView w APK trzyma podzasoby w swoim cache pod
URL-em pliku. Po aktualizacji OTA `FGUpdater.restart()` przeładowuje TEN SAM
adres `file://.../www-live/index.html`, więc główna ramka przychodzi świeża
z dysku, ale `<script src="js/app.js">` — ten sam URL — potrafi przyjść ze
STAREGO cache. Efekt: aplikacja wstaje w stanie mieszanym (nowy HTML + stary
JS) i wywala się na funkcji, której stary JS nie zna.

Zmiana URL-a przy każdym wydaniu sprawia, że cache nie ma czego podstawić.
`file://` z `?query` wykonuje skrypt normalnie (sprawdzone w Chromium 148).

Użycie:
    python3 scripts/stamp-web-refs.py <plik.html> <wersja>   # w miejscu
    python3 scripts/stamp-web-refs.py --self-test
"""
import re
import sys

# Tylko lokalne js/ i css/ — adresy zewnętrzne, manifest, ikony bez zmian.
# [^"?#] pilnuje, żeby już ostemplowane odwołanie nie dostało drugiego ?v=.
REF = re.compile(r'(?P<attr>\b(?:src|href))="(?P<path>(?:js|css)/[^"?#]+\.(?:js|css))"')


def version_tag(version):
    """Wersja bezpieczna w URL-u (ISO ma dwukropki)."""
    return re.sub(r'[^0-9A-Za-z._-]', '-', str(version))


def stamp(html, version):
    tag = version_tag(version)
    return REF.sub(lambda m: '%s="%s?v=%s"' % (m.group('attr'), m.group('path'), tag), html)

def restamp(html, version):
    """Podmienia istniejące ?v=… na nową wersję (assets APK bywają już ostemplowane)."""
    tag = version_tag(version)
    html = re.sub(r'((?:src|href)="(?:js|css)/[^"?#]+\.(?:js|css))\?v=[^"]*"',
                  lambda m: '%s?v=%s"' % (m.group(1), tag), html)
    return stamp(html, version)


def unstamped(html):
    """Lokalne odwołania js/css BEZ wersji — po stemplowaniu ma być pusto."""
    return [m.group(0) for m in REF.finditer(html)]


def _self_test():
    v = '2026-07-29T05:00:00Z'
    out = stamp('<script src="js/app.js"></script>', v)
    assert out == '<script src="js/app.js?v=2026-07-29T05-00-00Z"></script>', out

    out = stamp('<link rel="stylesheet" href="css/main.css">', v)
    assert '?v=2026-07-29T05-00-00Z"' in out, out

    keep = '<script src="https://x.example/a.js"></script><link href="manifest.json"><img src="icons/l.png">'
    assert stamp(keep, v) == keep, 'ruszone zasoby, których nie wolno ruszać'

    # idempotencja + podmiana wersji
    once = stamp('<script src="js/app.js"></script>', v)
    twice = restamp(once, '2026-07-30T06:00:00Z')
    assert twice.count('?v=') == 1, twice
    assert 'v=2026-07-30T06-00-00Z' in twice, twice

    assert unstamped(once) == [], unstamped(once)
    assert unstamped('<script src="js/x.js"></script>') != []

    print('SELF-TEST OK')


def main(argv):
    if len(argv) == 2 and argv[1] == '--self-test':
        _self_test()
        return 0
    if len(argv) != 3:
        print(__doc__)
        return 2
    path, version = argv[1], argv[2]
    with open(path, encoding='utf-8') as f:
        html = f.read()
    out = restamp(html, version)
    left = unstamped(out)
    if left:
        print('BŁĄD: odwołania bez wersji: %s' % left, file=sys.stderr)
        return 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(out)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
