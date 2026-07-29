# Development Log

---

## Related Documents

- [CHANGELOG](./CHANGELOG.md) - Technical changes
- [STATE](./STATE.md) - Current project state

---

## Current Context

**Last Updated:** 2026-07-28

### Project State
- **Project:** FamilyGoals
- **Version:** v0.3.0-dev (wersja DZIAŁAJĄCA dla obojga; web 2026-07-26T08:04:49Z, APK 1.3.0)
- **Phase:** Produkcyjne użycie rodzinne — APK dla Żony (zero-config), iteracje wg zgłoszeń Kamila

### Current Objectives (STRATEGICZNE - tydzień/sprint)
- [x] Backend rodzinny + sync + import historii (sesja 14)
- [x] Korzyści firmowe jako pełnoprawny przychód Męża (zakresy od–do, historia, wykres, kategorie własne)
- [x] Karta „realnie/zadeklarowane" + okienka wyliczeń + YoY + tooltipy/scrub wykresu
- [x] Zero-konfiguracyjny APK (gitignorowany family-config.js do OTA/APK)
- [ ] Deploy backendu GAS z encją `expenses` — MUSI poprzedzić wydanie web/OTA wydatków (sesja 16)
- [ ] APK dla Żony — build i instalacja (Kamil)
- [ ] Uzupełnienie udokumentowanych przelewów 2023–24 (Kamil; wpisy „wg założenia" już siedzą, edytowalne z historii)
- [ ] Decyzje o martwych modułach i osiągnięciach (patrz AUDIT-2026-07-24)

---

## Daily Log

### 2026-07-29: Aktualizacja OTA wstawała w stanie mieszanym — cache WebView

**Sytuacja:** Kamil przysłał dwie linijki z telefonu: boot `web 2026-07-26T08:54:09Z
APK 1.3.0` i `Uncaught TypeError: app.openAddExpense is not a function
@ .../www-live/index.html:604`.

**Wyzwanie:** Te dwie linijki są sprzeczne. Linia 604 to DOKŁADNIE nowy przycisk
„Dodaj wydatek" (28.07), a `FG_WEB_VERSION` czytany jest z `js/app-version.js`
DZIAŁAJĄCYCH plików i pokazuje 26.07. Czyli aplikacja jechała na nowym HTML-u
i starym JS-ie naraz.

**Diagnoza:** `applyBundle` jest atomowe (zapis do `www-live-tmp`, potem
podmiana katalogu), więc katalog na dysku nie może być mieszanką — sprawdziłem
kod. Mieszankę robi WARSTWA WYŻEJ: `restart()` woła `loadUrl` na TYM SAMYM
adresie `file://…/www-live/index.html`, a WebView nie ma ustawionego żadnego
trybu cache. Główna ramka jest wczytywana na nowo z dysku, ale `<script
src="js/app.js">` to niezmieniony URL — WebView podaje go ze swojego cache.
Stąd nowy HTML wołający funkcję, której stary JS nie zna.

**Decyzja:** Naprawa po stronie PACZKI, nie tylko APK — bo poprawka w Javie
wymaga zbudowania i zainstalowania nowego APK, a telefon trzeba odratować
teraz. Odwołania js/css w `index.html` dostają `?v=wersja` przy budowaniu
paczki; każde wydanie zmienia URL, więc cache nie ma czego podstawić.
Ryzykowne założenie („czy `file://` z `?query` w ogóle wykona skrypt")
sprawdziłem osobnym testem w Chromium ZANIM to wydałem — gdyby nie działało,
telefon zostałby bez JS, a `onReceivedError` łapie tylko błąd głównej ramki,
więc nie byłoby automatycznego odzysku. Druga linia obrony: `clearCache(true)`
przed przeładowaniem, wchodzi z następnym APK.

**Rezultat:** 129 testów zielonych (+6, red-first: self-test skryptu, ochrona
adresów zewnętrznych, idempotencja, kontrola na realnym `index.html`).
`publish-web.sh` przerywa wydanie, jeśli po stemplowaniu zostanie odwołanie bez
wersji albo wskazujące poza paczkę. Paczka na sucho uruchomiona z `file://`
(tak jak robi to APK): `FG_WEB_VERSION` poprawna, `app.openAddExpense` istnieje.
Wydanie 2026-07-29T03:51:45Z — nowsze niż to na telefonie, więc baner
aktualizacji się pokaże i odratuje urządzenie.

**Lekcja:** stan mieszany po deployu to nie „zła paczka" tylko warstwa
transportu/cache. Dwie sprzeczne linijki logu (wersja vs symbol) wystarczyły,
żeby to zawęzić bez zgadywania — i były szybsze niż jakakolwiek hipoteza
o zepsutym `applyBundle`.

**Files:** `scripts/stamp-web-refs.py`, `android-apk/publish-web.sh`,
`android-apk/build-apk.sh`, `android-apk/src/.../MainActivity.java`,
`tests/web-refs-stamp.test.js`

---

### 2026-07-28 (cz. 2): Wydatki na wykresie i własna karta — pomiar wyłapał trzy rzeczy, których oko nie widziało

**Sytuacja:** Po wydaniu wydatków Kamil zamówił trzy rzeczy: trzecią linię na
wykresie (on zielony, Żona różowa, wydatki czerwone), zniesienie podziału
wydatków na Męża/Żonę („wydatki mogą być wspólne") i kartę podsumowania
wydatków w stylu karty przychodów — bez wchodzenia w wyliczenia.

**Wyzwanie:** Wszystkie trzy dokładają piksele do dashboardu, który od
2026-07-25 ma twardą zasadę „mieści się bez scrolla", i dokładają czerwień
do palety, w której Żona jest już łososiowa.

**Decyzje:** (1) `--expense: #c62828` jako osobny, mocny czerwony — `--danger`
(#e07878) na wykresie zlewał się z `--peach` Żony w jedną linię; ta sama barwa
niesie teraz wydatki wszędzie (linia, kropki, kwoty). (2) Wydatki wypadają
z filtrów osobowych i tracą ikonkę osoby; stare rekordy z `owner` są po prostu
ignorowane (bez migracji danych). (3) Karta wydatków = Stałe / Jednorazowe /
Razem + dwie największe kategorie, wiersze dotykalne po składniki — mirror
karty przychodów, ale świadomie węższy.

**Co wyłapał pomiar (a nie wzrok):** headless zmierzył dashboard i pokazał, że
po dodaniu karty i trzeciej linijki legendy strona ma 937 px przy ekranie
915 — zasada „bez scrolla" złamana. Odzyskane 36 px: wykres 170→150 i podpis
karty do 2 kategorii. Drugie: legenda wchodziła pod pływający ➕ — pudełko
nadal na niego nachodzi, ale `padding-right` trzyma TEKST z dala (pomiar po
zakresie tekstu, nie po pudełku, bo pudełko myliło). Trzecie i najważniejsze:
przy większym wydatku strona rosła o kolejne 57 px — winowajcą okazała się
karta alertów, w której zapalił się widmowy „Przekroczono budżet o 10 545,67 zł".
`getBudgetAlerts` liczyło z budżetów kategorii DEMO w `data/config.json`
(Mieszkanie 3000, Jedzenie 2000...), których Kamil nigdy nie ustawiał i na
które nie ma UI. Kod spał latami, bo wydatków nie było — moja zmiana go
obudziła. Alerty liczą teraz wyłącznie budżety kategorii własnych.

**Rezultat:** 123 testy zielone (+7), dashboard 915/915 bez scrolla w trzech
scenariuszach (pusty, z wydatkami, duże kwoty), tekst legendy nigdy pod ➕,
karta przychodów bajt w bajt identyczna przed i po dodaniu wydatków.

**Files:** `js/data-manager.js`, `js/app.js`, `index.html`, `css/main.css`,
`tests/expenses.test.js`

---

### 2026-07-28: Wydatki wracają — i lekcja o zero-config syncu w kopii deweloperskiej

**Sytuacja:** Kamil prosi o możliwość zapisywania wydatków. Funkcja była
w apce, ale została CELOWO usunięta w `6e62604` („refactor — remove expenses");
zostały po niej sieroty: `addExpense/getExpenses` w DataManagerze, cały modal
w `index.html` (wpis w menu zakomentowany „ARCHIVED") i martwy `setupExpenseForm`.
Czyli nie budowa od zera, tylko przywrócenie i dopięcie do DZISIEJSZEJ
architektury (osoba 👨/👩, historia, sync z arkuszem).

**Wyzwanie:** (1) jak nalicza się „stały wydatek", (2) jak nie ruszyć świeżo
ustabilizowanych kart dashboardu.

**Decyzje:** (a) Zakres: rejestr + historia; dashboard i statystyki BEZ ZMIAN
(wybór Kamila). (b) Stałe wydatki wg wzorca KORZYŚCI FIRMOWYCH, nie
RecurringManagera: jedna definicja + naliczenia liczone w locie
(`getExpenseEntries`). Powód rozstrzygający — materializacja nie jest
sync-bezpieczna: telefon Kamila i APK Żony offline naliczyłyby ten sam miesiąc
osobno (różne id, ten sam `recurringSourceId`) i po syncu wyszedłby duplikat;
przy okazji edycja kwoty poprawia całą historię, a zakres działa też wstecz.
(c) `EXPENSE_CATEGORIES` jako SSOT kategorii (modal Kategorie znał 6, formularz 12).

**Rezultat:** 116 testów zielonych (106 + 10 nowych, red-first), smoke headless
przeklikany na Pixelu 7: menu → formularz (jednorazowy i stały) → historia →
filtr → edycja → reset modala, zero błędów konsoli, dashboard identyczny
co do znaku przed i po dodaniu wydatków.

**Wpadka (warta zapamiętania):** pierwszy przebieg smoke'a wypchnął testowe
źródło „Pensja 8000 zł" do ŻYWEGO arkusza rodziny — bo lokalna kopia repo ma
`js/family-config.js` i auto-konfiguruje sync przy pierwszym starcie. Rekord
usunięty tombstonem po id (za zgodą Kamila), pozostałe 9 źródeł nietknięte.
Wniosek na przyszłość: headless na tej kopii MUSI mieć odcięty `proxy_call`
na poziomie `fetch` — inaczej „weryfikacja" pisze do produkcji. Drugi wniosek:
`live-server` obserwuje katalog projektu, więc zapis zrzutu do `logs/screenshots/`
przeładowywał stronę w środku testu (stąd pierwszy, mylący crash) — zrzuty
lecą poza serwowany katalog, serwer bez watchera.

**Kolejność wydania:** backend GAS PRZED webem. Backend odrzuca nieznaną encję
do `errors[]`, a `flushQueue` kasuje rekord z kolejki po samej udanej odpowiedzi
HTTP — wydatek dodany między wydaniem webu a deployem backendu nigdy by nie
dotarł do Żony.

**Files:** `js/data-manager.js`, `js/app.js`, `js/sync-manager.js`,
`index.html`, `css/main.css`, `backend-gas/FamilyBackend.gs`, `tests/expenses.test.js`

---

### 2026-07-25/26: Maraton — korzyści firmowe pełnoprawne, projekcje, zero-config APK

**Sytuacja:** Kamil intensywnie testuje na telefonie i zgłasza na żywo;
tryb „zawsze wrzucaj" (auto-release po zielonej bramce, zapisany w pamięci).

**Wyzwanie:** Kilkanaście zgłoszeń w pętli — od „nie widzę korzyści w historii"
po „zhardkoduj sync do APK" — bez psucia świeżych fundamentów.

**Decyzje:** (1) Korzyści firmowe = przychód Męża (firma Męża) — wszędzie:
historia (naliczenia mies. + jednorazowe pod datą), wykres (okno auto od
najwcześniejszej korzyści), statystyki. (2) Karta „Wasze przychody" =
REALNIE/ZADEKLAROWANE: projekcja = założenia + śr. 12-mies. nadwyżek
(intencja > litera: nadpłaty gotówki liczą się, nie tylko źródła oneoff);
okienko „X+Y=Z" ze składnikami per pozycja i nadwyżkami per miesiąc.
(3) Kafel celów = karuzela kopert (wpłata dotknięciem). (4) Wykres:
tooltip kropek ze składem miesiąca + scrub palcem + „Łącznie/śr." okna.
(5) Zero-config: gitignorowany js/family-config.js generowany do OTA/APK —
token nigdy w repo (Pages publiczne). (6) Dane: backfill „Pensja za {mies}"
gru'23–gru'24 wg założeń (materiał do podmiany na udokumentowane);
etykiety „{źródło} za {miesiąc rok}" dla wszystkich wpłat (auto-nota
w recordPayment + migracja 54 not).

**Rezultat:** 21 wydań OTA w ~24h, suita 63→106 testów (red-first),
każda zmiana weryfikowana headless na REALNYCH danych rodziny (pull-only,
push blokowany). Wyłapane po drodze: fabrykacja wstecz, widmowe cele demo,
zły start puli Pensji (revert po wyjaśnieniu Kamila — activeFrom 2023-12
celowy), martwy jednorazowy check aktualizacji.

**Files:** praktycznie cały front (`js/*`, `index.html`, `css/main.css`),
`scripts/gen-family-config.sh`, `tests/*` (8 nowych plików), CHANGELOG

---

### 2026-07-24 (cz. 2): Backend rodzinny — arkusz Google + sync urządzeń

**Sytuacja:** Po stabilizacji Kamil chce danych wspólnych dla małżonków
i widocznych w arkuszu — jak w KmylSales. Dotąd localStorage = każde
urządzenie osobne.

**Wyzwanie:** Dodać backend bez wyrzucania świeżo ustabilizowanego frontu
(48 testów) i bez natywnego przepisywania.

**Decyzja:** Przeniesienie wzorca KmylSales 1:1: koperta proxy_call → GAS →
arkusz (karty per encja + kolumna Json), trwała kolejka offline z replayem,
delta po updatedAt, LWW per rekord. Po stronie frontu silnik snapshot-diff
localStorage (bez monkey-patchy — łapie DataManagera, gamification
i engagement jednym mechanizmem); encje obiektowe dzielone per osoba, żeby
małżonkowie się nie nadpisywali. Token first-writer-wins (repo publiczne —
sekrety poza gitem).

**Rezultat:** Backend wdrożony (clasp @1), sync-manager + UI ustawień,
7 testów kontraktowych red→green, E2E dwóch profili chromium na mock
backendzie 9/9 (bootstrap, delta, tombstone, auto-czyszczenie demo).
Bramka całości: 55/55. Żywy GAS czeka na 1-klik autoryzacji scope'ów.

**Files:** `backend-gas/*`, `js/sync-manager.js`, `js/app.js`,
`index.html`, `sw.js`, `tests/sync-manager.test.js`,
`thoughts/shared/plans/2026-07-24-backend-sheets-sync.md`

---

### 2026-07-24: Pełny audyt i stabilizacja — sesja 13

**Sytuacja:** Powrót do projektu po pół roku. App "połowicznie
funkcjonalna" — drobne błędy, brak testów, lista 90 problemów z sesji 11
nieutrwalona w repo.

**Wyzwanie:** Znaleźć wszystkie błędy w ~12,4k liniach bez zjadania
limitów i bez regresji przy naprawach.

**Decyzja:** Audyt 5 równoległymi agentami (per warstwa) + smoke runtime
w headless chromium; każdy ciężki claim spot-checkowany w kodzie przed
naprawą. Naprawy WYŁĄCZNIE za bramką: najpierw czerwony test, potem fix,
potem kontrfaktyczna weryfikacja (oryginalny kod z gita musi oblewać).
Bramka: node:test + harness vm ładujący window-globals z mockami
przeglądarki (zero nowych zależności).

**Rezultat:** ~50 findingów (9 klas CRITICAL), naprawione fale 1-2:
korupcja celów cyklicznych, import niszczący dane, widmowe wpłaty,
hardcoded daty 2025-12-28, martwy service worker na GitHub Pages,
PIN-lockout poza HTTPS, streak w UTC, dwie instancje DataManagera,
fabrykowany trend, alerty "Infinity". 43/43 testy zielone + probe'y
przeglądarkowe. Otwarte: decyzje o ~3,2k liniach martwych modułów
i 92 niezdobywalnych osiągnięciach.

**Files:** `logs/AUDIT-2026-07-24.md`, `tests/*`, `js/data-manager.js`,
`js/app.js`, `js/utils.js`, `js/pin-manager.js`,
`js/engagement-manager.js`, `sw.js`, `index.html`

### 2025-12-28: Głęboka analiza i naprawa integracji

**Sytuacja:**
Frontend działał, ale tylko pozornie.
Głęboka analiza ujawniła 12 problemów:
3 krytyczne (crash), 5 ważnych, 4 brakujące
integracje.

**Wyzwanie:**
1. checkAndUnlock() nie istnieje → crash
2. Kategorie wydatków bez ID → null
3. 7/11 managerów niezaładowanych
4. Edit bez prefill, PIN zduplikowany
5. EventBus, RecurringManager nieużywane

**Decyzja:**
Systematyczna naprawa wszystkich 12 problemów:
- Najpierw crash fixes (3)
- Potem funkcjonalne (5)
- Na końcu nowe integracje (4)

**Rezultat:**
- Wszystkie 12 problemów naprawione
- AlertManager pokazuje alerty na dashboard
- AIAdvisor wyświetla poradę dnia
- Edit prefill działa dla celów/źródeł
- PIN ujednolicony z PinManager
- EventBus podłączony (reaktywność)

**Files:**
`js/app.js`, `index.html`,
`css/main.css`, `logs/STATE.md`

---

### 2025-12-28: Integracja frontend + PWA + luka LFG

**Sytuacja:**
Frontend v2 gotowy, ale nie podłączony
do warstwy logiki. PWA wymaga ikon i
manifest do generowania APK.

**Wyzwanie:**
1. PWABuilder wymagał kompletnego manifest
2. app.js nie używał istniejących managerów
3. Napisałem CRUD od zera zamiast użyć
   DataManager - klasyczny błąd duplikacji

**Decyzja:**
1. Przepisać app.js na integrację z:
   - DataManager (CRUD)
   - GamificationManager (osiągnięcia)
   - EngagementManager (streak)
2. Utworzyć CODEBASE.md - katalog API
3. Zgłosić lukę do projektu LFG

**Rezultat:**
- PWA manifest 44/44 pkt
- app.js integruje 3 managery
- CODEBASE.md z API 10 modułów
- Raport do LFG zapisany w Raporty-MD

**Files:**
`js/app.js`, `manifest.json`,
`logs/CODEBASE.md`, `icons/`, `screenshots/`

---

### 2025-12-28: System motywacji - współpraca rodzinna

**Sytuacja:**
Rozbudowa logiki o dodatkowe funkcje:
cele, źródła przychodów, gamifikację.
Potrzeba systemu motywującego OBOJE.

**Wyzwanie:**
Mąż więcej pracuje i zarabia.
Żona docenia czas razem.
Jak zmotywować oboje, nie dzieląc?
Rywalizacja punktowa = niesprawiedliwa.

**Decyzja:**
Filozofia "ŁĄCZYĆ nie dzielić":
1. Wspólne punkty rodzinne (nie osobne)
2. Role zamiast punktów (różne wkłady)
3. Cele z "dlaczego" (pieniądze → czas)
4. Personalizacja: mąż za czas z rodziną,
   żona za kontrolę finansów

**Rezultat:**
- 8 nowych plików JS (1500+ linii)
- 105 osiągnięć + 15 streakowych
- Login streak z mnożnikami 1x-10x
- Family Unity: poziomy rodziny 1-10
- Konwersja: 50000 zł = rok mniej pracy

**Files:**
`js/gamification-manager.js`,
`js/ai-advisor.js`, `js/event-bus.js`,
`js/engagement-manager.js`,
`js/family-unity.js`, `js/family-balance.js`

---

### 2025-12-28: Kompletna warstwa logiki

**Sytuacja:**
Projekt FamilyGoals - webapp do celów
finansowych rodziny. Potrzebna pełna
architektura przed budową UI.

**Wyzwanie:**
Standardowe podejście (UI + logika razem)
utrudnia późniejsze zmiany. Plugin
frontend-design lepiej działa na czystym
kodzie bez istniejącego UI.

**Decyzja:**
Podejście "logic-first":
1. Najpierw pełna dokumentacja
2. Potem kompletna logika JS
3. Na końcu UI z pluginem

**Zaimplementowano:**
- DataManager: 30+ funkcji CRUD, stats,
  trends, inflacja, alerty
- PinManager: autoryzacja PIN
- RecurringManager: wydatki stałe
- AlertManager: powiadomienia budżetowe

**Rezultat:**
Warstwa logiki 100% gotowa.
Czeka na frontend-design plugin do UI.

**Files:**
`js/data-manager.js`, `js/pin-manager.js`,
`js/recurring-manager.js`, `js/alert-manager.js`,
`docs/ARCHITECTURE.md`, `docs/DESIGN.md`

---

### 2025-12-28: Adopcja Log File Genius

**Sytuacja:**
Nowy projekt FamilyGoals wymaga systemu
dokumentacji. AI-assisted development
potrzebuje efektywnego context management.

**Wyzwanie:**
Standardowa dokumentacja (README, wiki)
jest nieefektywna tokenowo. Claude musi
czytać całe pliki, nawet gdy potrzebuje
tylko aktualnego kontekstu.

**Decyzja:**
Instalacja Log File Genius v0.2.0 z
profilem solo-developer:
- CHANGELOG: co się zmieniło (fakty)
- DEVLOG: dlaczego (narracja)
- STATE: co teraz (status)
- ADRs: jak zdecydowano (architektura)

**Dlaczego ma znaczenie:**
- Token budget: <25k łącznie
- Automatyczna archiwizacja
- Always-active rules dla Claude
- Strukturyzowany context loading

**Rezultat:**
System zainstalowany, ADR-001 utworzony.
Projekt gotowy do AI-assisted development.

**Files:**
`.log-file-genius/`, `logs/`, `.claude/`,
`logs/adr/001-adopt-log-file-genius.md`

---
