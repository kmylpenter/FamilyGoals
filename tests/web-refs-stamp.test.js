/**
 * Stemplowanie odwołań js/css wersją paczki (?v=STAMP).
 *
 * Red-first po incydencie 2026-07-29: telefon Kamila wstał w stanie MIESZANYM
 * — nowy index.html (wołał app.openAddExpense) + STARY js/app.js, bo WebView
 * w APK trzyma podzasoby w swoim cache pod URL-em pliku, a `restart()`
 * przeładowuje ten sam adres. Świeża główna ramka + skrypty z cache = crash.
 * Lekarstwo: przy każdym wydaniu URL skryptów się zmienia, więc cache nie ma
 * czego podstawić.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'stamp-web-refs.py');

const stampHtml = (html, version) => {
  const tmp = path.join(ROOT, 'tests', `.tmp-stamp-${process.pid}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  try {
    execFileSync('python3', [SCRIPT, tmp, version], { encoding: 'utf8' });
    return fs.readFileSync(tmp, 'utf8');
  } finally {
    fs.unlinkSync(tmp);
  }
};

test('self-test skryptu stemplującego przechodzi', () => {
  const out = execFileSync('python3', [SCRIPT, '--self-test'], { encoding: 'utf8' });
  assert.match(out, /SELF-TEST OK/, out);
});

test('skrypty i style dostają ?v=wersja, treść bez zmian', () => {
  const html = '<link rel="stylesheet" href="css/main.css">\n<script src="js/app.js"></script>';
  const out = stampHtml(html, '2026-07-29T05:00:00Z');
  assert.match(out, /href="css\/main\.css\?v=2026-07-29T05-00-00Z"/);
  assert.match(out, /src="js\/app\.js\?v=2026-07-29T05-00-00Z"/);
});

test('zewnętrzne adresy i inne zasoby nietknięte', () => {
  const html = [
    '<script src="https://cdn.example.com/x.js"></script>',
    '<link rel="manifest" href="manifest.json">',
    '<img src="icons/logo.png">',
    '<script src="js/app.js"></script>'
  ].join('\n');
  const out = stampHtml(html, '2026-07-29T05:00:00Z');
  assert.ok(out.includes('src="https://cdn.example.com/x.js"'), 'ruszony adres zewnętrzny');
  assert.ok(out.includes('href="manifest.json"'), 'ruszony manifest');
  assert.ok(out.includes('src="icons/logo.png"'), 'ruszona ikona');
  assert.match(out, /src="js\/app\.js\?v=/);
});

test('powtórne stemplowanie nie dokleja drugiego ?v=', () => {
  const once = stampHtml('<script src="js/app.js"></script>', '2026-07-29T05:00:00Z');
  const twice = stampHtml(once, '2026-07-30T06:00:00Z');
  assert.equal((twice.match(/\?v=/g) || []).length, 1, `podwójny stempel: ${twice}`);
  assert.match(twice, /v=2026-07-30T06-00-00Z/, 'nowa wersja nie nadpisała starej');
});

test('REALNY index.html: po stemplowaniu nie zostaje żadne lokalne js/css bez wersji', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = stampHtml(html, '2026-07-29T05:00:00Z');
  const leftovers = out.match(/(?:src|href)="(?:js|css)\/[^"?#]+\.(?:js|css)"/g) || [];
  assert.equal(leftovers.length, 0, `niestemplowane odwołania: ${leftovers.join(', ')}`);
  assert.ok((out.match(/\?v=/g) || []).length >= 10, 'podejrzanie mało ostemplowanych odwołań');
});

test('REALNY index.html: każdy ostemplowany plik faktycznie istnieje w repo', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = stampHtml(html, '2026-07-29T05:00:00Z');
  const refs = [...out.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)\?v=/g)].map(m => m[1]);
  assert.ok(refs.length > 0);
  const missing = refs.filter(r => !fs.existsSync(path.join(ROOT, r)));
  assert.equal(missing.length, 0, `odwołania do nieistniejących plików: ${missing.join(', ')}`);
});
