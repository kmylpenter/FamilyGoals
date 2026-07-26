# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## Related Documents

- [DEVLOG](./DEVLOG.md) - Development narrative
- [STATE](./STATE.md) - Current project state

---

## [Unreleased]

### Sesja 14 (2026-07-25) - Przychody: pula, zakresy, import historii, UX wpłat (wydawane OTA na bieżąco)

#### Added
- Zakresy od–do źródeł cyklicznych (`activeFrom`/`activeTo`, form + filtr + katalog "Wszystkie źródła i zakresy" na ekranie Przychody). Files: `js/data-manager.js`, `js/app.js`, `index.html`
- Model PULI: wpłaty sumują się jak saldo i pokrywają kolejne miesiące od `activeFrom` (statusy/oczekiwane; nadpłata w przód, historia wstecz). Files: `js/data-manager.js`
- Import historii z arkusza Kamila: 5 źródeł, 54+3 wpłaty, 258 000 zł (zweryfikowane co do złotówki, lustra spójne; segmenty gotówki 3k/6k/10k wg narracji — trafienie ±600 zł). Wykonane przez backend (pushChanges)
- Historia wpłat (wszyscy, nagłówki miesięcy, nazwy wpłat) + pola Data (kalendarz) i Nazwa w oknie wpłaty. Files: `index.html`, `js/app.js`, `css/main.css`
- Plusik: "Dodaj wpłatę" (wybór źródła z brakami z puli; 1 źródło = od razu; wszystko per profil) i "Dodaj korzyść firmową"; korzyść jednorazowa z datą realizacji (liczy się w miesiącu daty). Files: `index.html`, `js/app.js`
- Wykres: okno od najwcześniejszych danych ('auto', roczniki przy styczniach), oś kwot po lewej, wysokość 190, linie trendu (regresja) per osoba, wartości = FAKTYCZNE wpłaty wg dat. Files: `js/data-manager.js`, `js/app.js`
- Stopka wersji w Ustawieniach (APK + web) i stempel wersji w DevLogu na starcie. Files: `index.html`, `js/app.js`
- Zakres od–do cyklicznych korzyści firmowych (wzorzec ze źródeł: `activeFrom`/`activeTo`, pola w formularzu przy typie Cykliczny, filtr w `calculateBusinessSavings`, zakres na liście Koszty firmowe; puste = bezterminowo, stare wpisy bez zmian; case: leasing auta). Files: `index.html`, `js/app.js`, `js/data-manager.js`
- Korzyści firmowe = przychód Męża (decyzja Kamila: firma Męża — bez niej tych przychodów by nie było): wykres dolicza korzyści do linii Męża (jednorazowe w miesiącu realizacji, cykliczne jako naliczenie), okno „auto" sięga najwcześniejszej korzyści (case: zakup z 2023), historia wpłat pokazuje korzyści z 💼 (jednorazowe pod datą, cykliczne jako naliczenie mies. w zakresie do dziś). Files: `js/data-manager.js`, `js/app.js`
- Edycja wpisów z historii wpłat: klik we wpłatę → modal (kwota/data/nazwa + Usuń), zapis aktualizuje też lustro w `income` (po `paymentId`, legacy po dacie+kwocie — sync-safe jak B-M1); klik w korzyść/naliczenie → istniejący modal korzyści (edycja definicji). Files: `js/data-manager.js` (`updatePayment`), `js/app.js`, `index.html`
- Własne kategorie przychodów: modal Kategorie z przełącznikiem 💵 Przychody / 💸 Wydatki (wbudowane read-only, własne usuwalne; legacy bez `kind` = wydatkowe), nowa kategoria przychodów staje się chipem Źródła w formularzu przychodu; pełna nazwa i ikona przez dataset (koniec ucinania nazw wielowyrazowych do ostatniego słowa). Files: `js/data-manager.js`, `js/app.js`, `index.html`
- Własne kategorie KORZYŚCI FIRMOWYCH (zgłoszenie: „Bayon zaliczka" 📱 bez możliwości przepięcia na 🚗): trzeci rodzaj 💼 Firmowe w modalu Kategorie, własne kategorie jako chipy w formularzu korzyści, ikona rozwiązywana helperem `costCategoryIcon` (wbudowane + własne) na liście Koszty firmowe i w historii; przepięcie kategorii = klik wpisu w historii → Edytuj koszt. Files: `js/app.js`, `index.html`

#### Fixed
- deleteIncomeSource nie sprzątał luster wpłat źródła (widmowe 6000 po skasowaniu testowej Pensji — złapane weryfikacją importu). Files: `js/data-manager.js`
- Widmowy alert "Zostało 1300 zł do celu" z domyślnego configu (target 2000 przy braku celów) — blok config-celu usunięty. Files: `js/data-manager.js`
- Timeout pobrań dużych odpowiedzi 30s→120s (paczki OTA ~0,5 MB cicho padały na wolnym wifi) + wydanie ratunkowe APK 1.3.0 (versionCode 4). Files: `js/sync-manager.js`, `android-apk/AndroidManifest.xml`
- Zwrot pożyczki przemodelowany na 2 wpisy jednorazowe (cykliczne @0 świeciło zerem w każdym miesiącu)
- Inputy od–do (`type=month`) wystawały poza ekran telefonu (wewnętrzny min-width Chromium; „do" ucięte 18px za krawędzią) — `min-width:0` w formularzu przychodu i korzyści. Files: `index.html`
- Karta kosztu firmowego: badge „za X dni" + przyciski ściskały nazwę/meta do pionowej kolumny liter — rząd łamie się (`flex-wrap`), treść ma min 140px, akcje spadają do prawej w drugim rzędzie. Files: `css/main.css`
- „Nadchodzące zakupy" pokazywały cykliczne korzyści poza zakresem od–do (przyszły leasing dostawał „za 31 dni ✓ Kupione" przed startem) — filtr zakresu w `getUpcomingBusinessCosts`. Files: `js/data-manager.js`
- Cykliczna korzyść BEZ activeFrom fabrykowała się wstecz na wykresie (liczyła się w miesiącach sprzed dodania — złapane na realnych danych: abonament 300 zł świeciłby od 2023) — liczy się od miesiąca dodania (createdAt), spójnie z naliczeniami w historii; test zaktualizowany do nowej semantyki. Files: `js/data-manager.js`, `tests/business-cost-range.test.js`
- Kolizja dwóch ostatnich etykiet osi wykresu („majlip") gdy krokowa etykieta wypada tuż przed ostatnią — krokowa odpada przy kolizji. Files: `js/app.js`
- Baner aktualizacji „czasami się nie pokazywał": check był JEDNORAZOWY (5 s po zimnym starcie), a apka na telefonie żyje w pamięci dniami — publikacja przy otwartej apce lub jeden nieudany check = brak banera do restartu. Teraz: ponawianie co 30 min + przy powrocie apki na pierwszy plan (throttle 5 min); obie ścieżki zweryfikowane headless licznikiem wywołań. Files: `js/app.js`
- Widmowe „Do odłożenia w tym miesiącu" (np. 2700 zł) mimo braku celów: `getPlannedExpenses`/`_getPlannedFromStorage` przy braku danych usera spadały do DOMYŚLNYCH celów demo z `data/planned.json` (Edukacja 500 + Remont 1500), a pierwszy `addPlannedGoal` zatrzaskiwał te widma do danych. Fallback usunięty: bez celów = 0 zł (demo dalej działa — seed pisze override wprost). Files: `js/data-manager.js`
- Dashboard bez pionowego scrolla: padding dolny ekranu 100→68 px (nav ma 61 px; pomiar na realnych danych: przerost całego ekranu wynosił dokładnie 16 px → po zmianie 0). Files: `css/main.css`
- Wyrównanie „odłożone" i celu miesiąca (SSOT): `getMonthlyStats` liczy przychód DOKŁADNIE formułą karty „Wasze przychody" (summary modelu puli + korzyści firmowe; było: lustra income[] — 2700 vs 3600, bo 600 zł wpłat bez lustra i korzyści nieliczone), a `savingsTarget` z realnych celów usera przez nowy helper `getMonthlySavingsTarget()` (używany też przez kafel — było: widmowe 2000 z config.json w ocenie miesiąca). Test agregacji zaktualizowany do nowej semantyki. Files: `js/data-manager.js`, `js/app.js`, `tests/data-manager.test.js`

- Jednolity rytm pionowy: KAŻDY odstęp między elementami = 8 px (gap kontenera jako jedyne źródło odstępów; wyzerowane marginesy `.section-title`, headera, `#advice-alerts-card`, `.month-selector`; wrappery tabów Przychody/Optymalizacja jako kontenery flex z gap; pusty `#update-banner` nie zjada slotu gapu). Pomiar headless: dashboard 6×8, tab Przychody 7×8, Optymalizacja 4×8; scroll dalej zerowy. Files: `css/main.css`
- „Edytuj koszt" nie pokazywał kategorii dodanych po starcie apki (np. przybyłych syncem) — chipy kategorii firmowych renderują się przy KAŻDYM otwarciu modala (hook w `openModal`), jak chipy źródeł przychodu. Files: `index.html`, `js/app.js`

- Średnie zarobki 12 mies. + wzrost rok do roku pod wykresem: „Śr. 12 mies.: 👩 X (—/±%) · 👨 Y (±%) · ∑ Z (±%)" — średnia miesięczna z ostatnich 12 mies. vs poprzednie 12 (mies. 13–24), per osoba i razem; wpłaty wg dat + korzyści u Męża (spójnie z wykresem); okna liczone od pierwszego REGULARNEGO śledzenia (pierwsza wpłata / start cyklicznej korzyści — jednorazowa z 2023 nie rozwadnia średnich zerami), zielony wzrost / czerwony spadek / (—) bez danych porównawczych; wykres 190→170 px, dashboard dalej bez scrolla. Files: `js/data-manager.js` (`getYearOverYear`), `js/app.js`, `css/main.css`

- Historia wpłat: PEŁNA (koniec „…i N starszych" — było ucinanie do 80 wpisów) + chipy filtrowania Wszystkie / 👩 Żona / 👨 Mąż / 💼 Firmowe (Mąż zawiera korzyści — to jego przychody; Firmowe = tylko korzyści). Files: `index.html`, `js/app.js`
- Liczniki wpisów na chipach filtra historii, np. „Wszystkie (133) · Żona (0) · Mąż (133) · Firmowe (77)" — filtr „działa w oczach" nawet gdy lista wygląda identycznie (zgłoszenie „nie filtruje nic": u Kamila WSZYSTKIE wpisy należą do Męża, więc Wszystkie↔Mąż niczego nie zmieniało; potrójna weryfikacja: kod repo + paczka na backendzie + tap dotykiem na realnych danych 133→77→0). Files: `js/app.js`

- Kafel na Starcie przemianowany: „💰 Oszczędności w tym miesiącu" — DUŻA liczba = odłożone (fakt), cel miesiąca jako podpis („bez celu" gdy brak; pasek i „Zostało" tylko przy ustawionym celu). Powód: 3× z rzędu tytuł „🎯 Do odłożenia" mylił przy braku celów („skąd 2700/7400 do odłożenia?!" — to było odłożone). Files: `index.html`, `js/app.js`
- Kafel oszczędności ZNIKA przy braku celów (4. runda „co to za kwota 7400?!"): bez wydatków i bez celu pokazywał to samo co „Razem" na karcie przychodów — czyste dublowanie; wraca automatycznie z pierwszym celem (cel vs odłożone + pasek). Files: `js/app.js`
- Filtr per kategoria wpłaty w historii: drugi rząd chipów (przewijany poziomo) budowany z danych — nazwa źródła/korzyści + ikona + licznik, łączy się z filtrem osoby (liczniki w obrębie aktywnego filtra osoby). Files: `index.html`, `js/app.js`, `css/main.css`

- Karuzela celów-kopert na Starcie: strzałki ‹ › przełączają cele (nazwa + licznik 1/N), dotknięcie kafla otwiera modal „✉️ Do koperty" → wpłata dolicza się do `currentAmount` celu (`updatePlannedProgress`, sync-safe); pasek postępu i „Zostało" przy celach kwotowych. Files: `index.html`, `js/app.js`, `css/main.css`
- Karta „Wasze przychody": kolumna „/" pokazuje REALNĄ moc zamiast samych założeń — założenia cykliczne (wybrany miesiąc) + średnia 12-mies. dodatkowych pieniędzy (nadwyżki wpłat ponad założenia — obejmuje źródła jednorazowe i nadpłaty; dla korzyści: cykliczne naliczenia + śr. jednorazowych); podpis wyjaśniający pod kartą. Silnik: `getIncomeProjection`. Na realnych danych: Mąż 3300/18 600 (16 000 założeń + 2600 śr. nadwyżek), Korzyści 4100/2699, Razem 7400/21 299. Files: `js/data-manager.js`, `js/app.js`
- Linia „Śr. 12 mies." przeniesiona nad legendę wykresu (FAB przysłaniał jej prawy koniec). Files: `js/app.js`

- Karta „Wasze przychody" w formacie Kamila: REALNIE / ZADEKLAROWANE (Mąż 18 600/16 000, Korzyści 2699/2310, Razem 21 299/18 310) — lewa = założenia + śr. dodatkowych z 12 mies., prawa = deklaracja (twarde minimum); bieżący miesiąc pozostaje na ekranie Przychody; dotknięcie wiersza otwiera okienko „X + Y = Z" (np. Zadeklarowane 16 000 + śr. dodatkowych 2600 = realnie 18 600). Files: `js/app.js`, `index.html`
- Wykres: klikalne kropki (niewidoczne strefy dotyku r=11) → dymek z kwotą miesiąca i składem (wpłaty + naliczenia korzyści, top 6 + „…i N więcej"); przesuwanie palcem po wykresie (scrub) podświetla najbliższą kropkę (miesiąc z osi X, seria z bliskości w pionie) — łatwe celowanie przy gęstych danych. Files: `js/app.js`, `css/main.css`
- Pod wykresem linia „Łącznie: X zł · śr. Y zł/mies." — suma dochodu domu (wpłaty + korzyści) w całym oknie wykresu i średnia miesięczna (na realnych danych: 361 734 zł · 9275 zł/mies. z 39 mies.); osobna legenda scalona z linią średnich (kolorowe kropki inline), linie bez łamania (nowrap + przewijanie awaryjne). Files: `js/app.js`, `css/main.css`

- Dymek kropki wykresu zamyka się tapnięciem W DOWOLNE miejsce ekranu poza nim (wcześniej tylko w obrębie małego wykresu). Files: `js/app.js`
- Karta „Wasze przychody" bez przekierowania na Przychody (inline onclick odpalał razem z okienkiem wyliczenia); klik wiersza = tylko okienko. Files: `index.html`, `js/app.js`
- „✓ Kupione" → „✓ Zapłacone", „Nadchodzące zakupy" → „Nadchodzące płatności" (przycisk odnotowuje opłacenie pozycji i przesuwa termin o cykl). Files: `js/app.js`, `index.html`
- Audyt importu na pytanie Kamila o przesunięcie miesiąca: Gotówka bez przesunięcia (wpłaty 15-go miesiąca-za-który; 110 600 wpłacone = 11×10k do czerwca + 600 na poczet lipca ✓ widoczne); PENSJA miała zły start puli (activeFrom 2023-12, a tabelka od 2025-01 → pula wsysała 13 pustych miesięcy, lipiec pokazywał 0 przy fikcyjnym niedoborze −78k) — naprawione w danych (activeFrom→2025-01): sty'25–cze'26 complete, lipiec pending. Odnotowane bez zmian: stary segment Gotówki −1500 vs założenia (tak w tabelce), segment 04–07.2025 z +4200 ponad zamknięty zakres

- Przycisk płatności z miesiącem: „✓ Zapłacone za sierpień" (miesiąc z terminu `nextDueDate`; toast „Zapłacone za X — termin przesunięty o cykl") — nikt nie odkliknie płatności o miesiąc do przodu przez pomyłkę. Files: `js/app.js`
- REVERT korekty `activeFrom` Pensji (2025-01 → z powrotem 2023-12): start grudzień 2023 jest CELOWY (wynagrodzenie prezesa od gru'23; wpłaty 2023–2024 będą uzupełniane wstecz — dokładnie do tego służy pula „historia wstecz"). Skutek przejściowy do czasu uzupełnienia: pula księguje wpłaty od najstarszych miesięcy, więc ostatnie ~13 miesięcy Pensji świeci jako niezapłacone. Zmiana danych przez backend

- Okienko „jak to policzone" wypisuje SKŁADNIKI: przy Korzyściach lista cyklicznych z naliczeniem/mies. i lista jednorazowych z okna 12 mies. (z sumą „łącznie X w N mies."); przy osobach lista źródeł założeń, wpłaty jednorazowe i wiersz „nadpłaty ponad założenia (12 mies. łącznie)" — wszystko sumuje się do pokazywanej średniej (silnik: `getIncomeProjection` zwraca `recurringItems/oneoffItems/recurringSources/oneoffPayments`). Files: `js/data-manager.js`, `js/app.js`

- Uzupełnienie wpłat „wg założenia" za okres przed 2025 (decyzja Kamila: co zadeklarowane przed 2025 = wpłacone): Pensja gru'23–gru'24, 13 × 6000 zł z notami „Pensja za {miesiąc rok} (wg założenia)" + lustra income (idempotentne id `backfill-…`). Suma Pensji = 186 000 = dokładnie 31 mies. × 6000 (gru'23–cze'26 complete, lipiec'26 pending — model „płacę po miesiącu"); wrzesień'24 w tooltipie wykresu: „Pensja za wrzesień 2024 (wg założenia) 6000". Gotówka bez zmian (segmenty od 2025-01). Wykonane przez backend (pushChanges: applied 14)

- Okienko osoby wyszczególnia „dodatkowe": nadwyżki PER MIESIĄC („📈 nadwyżka — sierpień 2025 · 23 400" itd. — sumują się co do złotówki do łącznej kwoty) oraz „w tym wpłaty jednorazowe" z nazwą źródła i miesiącem („Bonus: Mystery Gift — lipiec 2026"); noty backfilli bez dopisku „(wg założenia)" (skasowane też w danych, pushChanges applied 14). Files: `js/data-manager.js`, `js/app.js`

- Status „Synchronizacja rodzinna" w Ustawieniach pokazywał wiecznie „nieskonfigurowana" mimo działającego synca — `refreshSyncStatusUI` wołane było tylko przy otwarciu modala synca; teraz też przy starcie. Files: `js/app.js`
- Etykiety „{źródło} za {miesiąc rok}" dla WSZYSTKICH wpłat: auto-nota w `recordPayment` gdy user nie poda nazwy (własne nazwy zostają) + migracja 54 istniejących wpłat z notami generycznymi („import z arkusza"/puste) w danych (pushChanges applied 60); „(wg założenia)" usunięte z backfilli. Files: `js/data-manager.js`

- Zero-konfiguracyjny start dla rodziny: generowany, GITIGNOROWANY `js/family-config.js` (URL+token z `backend-gas/.local-config.json`) trafia wyłącznie do paczki OTA i APK (kanały tokenowane; na publicznym GitHub Pages plik nie istnieje — token nie wycieka); przy pierwszym uruchomieniu apka sama zapisuje config synca i ciągnie dane rodziny (bez demo). Żonie wystarczy sam plik APK. Files: `scripts/gen-family-config.sh` (nowy), `android-apk/publish-web.sh`, `android-apk/build-apk.sh`, `index.html`, `.gitignore`

#### Testy
- +13 (income-range, income-pool, B-M1c, widmowy alert) — razem 75; każda zmiana wydana OTA po zielonej bramce i probe na danych z arkusza
- +5 (business-cost-range: zakres od–do korzyści cyklicznych + upcoming respektuje zakres, red→green) — razem 80; walidacja wizualna headless (6 zrzutów w `logs/screenshots/korzysc-*.png`, `naprawa-*.png`)
- +3 (business-benefit-income: korzyści w przychodach Męża na wykresie, okno auto od 2023, red→green) — razem 83; zrzuty `korzysc-wykres-2023.png`, `korzysc-historia.png`
- +4 (payment-edit: updatePayment źródło+lustro, legacy domknięcie, wykres po edycji, red→green) — razem 87; E2E headless: modal z historii, zapis 6000→6100 spójny w historii/wykresie/lustrze
- +2 (income-categories: filtr kind, legacy=wydatkowe, red→green) — razem 89; E2E headless: kategoria „Wynajem mieszkania" → chip → źródło z pełną nazwą i ikoną w historii
- +1 (income-categories: kind=business osobny od income/expense) — razem 90; E2E headless pełny scenariusz zgłoszenia: Bayon 📱 → nowa kategoria 🚗 → przepięcie z historii → 🚗 w historii i na liście
- +2 (planned-defaults-leak: plik demo nie przecieka, add nie zatrzaskuje widm, red→green) — razem 92; smoke headless: hero „Do odłożenia 0 zł" bez celów
- +3 (stats-alignment: odłożone = wpłaty+korzyści, wpłata bez lustra liczona, target z celów, red→green) — razem 95; na realnych danych: stats 3600 = hero = karta przychodów
- +4 (yoy: wzrost/spadek r/r, krótka historia bez rozwadniania, korzyści u Męża, red→green) — razem 99; realne dane: Mąż śr. 16 521 zł (+105%); historia: 117 wpisów bez ucinania, filtry 117/0/117/61 spójne
- +5 (income-projection: nadwyżki, oneoff w nadwyżce, bez ujemnych, korzyści cykliczne+jednorazowe; koperta: updatePlannedProgress) — razem 104; E2E: karuzela realnych celów, wpłata 500 do koperty, karta 3300/18 600
- +1 (income-projection: listy składników, jednorazowe tylko z okna) — razem 105; E2E: okienko Korzyści z pełną listą (2310 = 300+1130+640+240; 4670/12 = 389), Mąż domknięty co do złotówki (700+2000+28 500 = 2600×12)

### Sesja 13 (2026-07-24) - Pełny audyt + stabilizacja (fala 1+2) + bramka testowa

#### Added
- Pełny audyt projektu (5 agentów + smoke runtime): raport z ~50 findingami. Files: `logs/AUDIT-2026-07-24.md`
- Bramka testowa node:test (zero nowych zależności): harness vm + mocki przeglądarki, 43 testy (charakteryzujące + regresyjne red→green). Files: `tests/harness/browser-env.js`, `tests/harness/load-app.js`, `tests/*.test.js`, `package.json` (skrypt `npm test`)
- `dataManager.importBackup()` — oficjalna ścieżka importu ze spójnym cache. Files: `js/data-manager.js`
- Sekcja "Ostatnio odblokowane" renderowana z realnych danych + empty state (było: fałszywy hardcoded HTML). Files: `index.html`, `js/app.js`
- Favicon (eliminacja jedynego 404). Files: `index.html`

#### Fixed (fala 1 — integralność danych i produkcja)
- Edycja celu cyklicznego niszczyła `monthlyContribution` (NaN→null). Files: `js/data-manager.js`
- Import backupu omijał cache — dane niewidoczne, a pierwsza edycja trwale je nadpisywała. Files: `js/app.js`, `js/data-manager.js`
- Usunięcie wpłaty zostawiało lustrzany wpis w `income[]` (widmowy przychód w statystykach); mirror ma teraz `paymentId` i jest kasowany (z fallbackiem dla starych danych). Files: `js/data-manager.js`
- Wpłata bez daty dostawała `date: undefined` (niewidzialna w filtrach miesięcy). Files: `js/data-manager.js`
- Zahardkodowana data `2025-12-28` w formularzach przychodu/wydatku — każdy wpis lądował w grudniu 2025. Files: `index.html`
- Service worker nie instalował się na GitHub Pages (ścieżki absolutne); teraz relatywne + `data/config.json` w precache, cache v10. Files: `sw.js`
- PIN zamrażał aplikację poza HTTPS/localhost (brak `crypto.subtle`) — fallback hash + try/catch. Files: `js/pin-manager.js`, `index.html`
- Pozycje stałe z dniem 29-31 pomijane w krótkich miesiącach + przepadały bez otwarcia apki w dniu naliczenia (clamp + catch-up). Files: `js/data-manager.js`
- Streak liczony wg UTC zamiast czasu lokalnego (`getDateString`). Files: `js/utils.js`

#### Fixed (fala 2 — spójność)
- Dwie instancje DataManagera (UI ↔ RecurringManager) — teraz jeden singleton `window.dataManager`. Files: `js/data-manager.js`, `js/app.js`
- Wykres trendu fabrykował historię z `expectedAmount` dla pustych miesięcy. Files: `js/data-manager.js`
- Alerty celów z "Infinity mies." + fałszywe alerty dla zobowiązań cyklicznych. Files: `js/data-manager.js`
- Korzyści firmowe liczone zawsze dla "teraz" zamiast oglądanego miesiąca. Files: `js/data-manager.js`, `js/app.js`
- Zmiany kosztów firmowych/todos nie odświeżały dashboardu (renderAll rozszerzony). Files: `js/app.js`
- Modale todo/kosztu dziedziczyły tytuł i prefill z ostatniej edycji. Files: `index.html`
- Hero dashboardu: statyczne "Zostało/31%" przy żywym pasku. Files: `index.html`, `js/app.js`
- XSS gap: `cost.name/note`, `cat.name` bez escapeHtml. Files: `js/app.js`
- Crash-kandydat `_checkCoupleStreak` bez guardu gm. Files: `js/engagement-manager.js`
- `changePin` bez await (fałszywy sukces) + goły zapis localStorage. Files: `js/app.js`
- Backup: import kategorii (były tracone), eksport+import todos/kosztów/ustawień. Files: `js/app.js`
- Dane demo: `income[]` jako lustro wpłat źródeł (był wbudowany rozjazd dashboard↔przychody). Files: `js/app.js`

#### Changed (porządki UI + dane dostępowe)
- DevLog przeniesiony na górę po prawej; przycisk odświeżania ↻ usunięty (relikt debugowania z sesji 12 — w APK reload zastępuje OTA). Wydane OTA `2026-07-24T19:20:47Z`. Files: `index.html`
- `DANE-LOGOWANIA.md` (gitignored) + kopia w Pobranych: URL backendu, token rodziny, arkusz, checklist konfiguracji telefonu. Files: `.gitignore`

#### Added (profile urządzeń — pierwsza aktualizacja dostarczona przez OTA)
- Profil urządzenia (`familygoals_device_profile`, lokalny/niesynchronizowany): picker „Kto korzysta z tego telefonu?" przy 1. uruchomieniu + zmiana w Ustawieniach; `currentPerson` z profilu (wcześniej hardcoded 'wife' — oba telefony nabijały streak żonie). Files: `js/app.js`, `index.html`
- Domyślny właściciel nowego przychodu = osoba telefonu (chipy pozycyjnie — 2. grupa .chips); miękka ochrona: edycja/kasowanie pozycji współmałżonka wymaga potwierdzenia (źródła + zadania). Files: `js/app.js`
- Guardy null-ownera w managerach (getStreakStats/recordLogin/checkAchievements — default parametru nie łapie null). Files: `js/engagement-manager.js`, `js/gamification-manager.js`
- Fix mignięcia ekranu PIN na starcie (active nadawane przez JS, nie statycznie). Files: `index.html`
- Wydane jako paczka OTA `2026-07-24T18:24:35Z` — bez nowego APK.

#### Added (OTA — aktualizacje z wnętrza aplikacji, zero GitHuba)
- Backend `Releases.gs`: paczka web + APK prywatnie na Dysku (folder FamilyGoals-Releases); metody getAppInfo/getWebBundle/uploadWebBundle/getApk/uploadApk; upload chroniony osobnym ADMIN_TOKEN (first-writer-wins); redeploy tego samego ID (@2/@3 — URL bez zmian). Files: `backend-gas/Releases.gs`, `backend-gas/Code.gs`, `backend-gas/appsscript.json` (scope drive)
- Mostek natywny `window.FGUpdater` (v1.2.0, versionCode 3): hot-swap paczki web do `filesDir/www-live` (atomowo, safe-mode przy błędzie ładowania → powrót do assets), instalacja APK przez własny ContentProvider + systemowy instalator (REQUEST_INSTALL_PACKAGES). Files: `android-apk/src/.../MainActivity.java`, `android-apk/src/.../ApkProvider.java`, `android-apk/AndroidManifest.xml`
- `js/update-manager.js` + UI: baner „🔄 Nowa wersja — Aktualizuj" na dashboardzie (ciche sprawdzenie po starcie), „Sprawdź aktualizacje" w Ustawieniach; wersja web stemplowana (`js/app-version.js`); 7 testów (decyzje wersji, przepływ apply). Files: `js/update-manager.js`, `js/app-version.js`, `js/app.js`, `js/sync-manager.js` (_apiCall), `index.html`, `css/main.css`, `tests/update-manager.test.js`
- Pipeline wydań jedną komendą: `android-apk/release.sh` (bramka testowa → publikacja paczki web → build APK z tym samym stemplem → upload APK → kopia do Pobranych); codzienny fix = `release.sh --web-only`. Files: `android-apk/release.sh`, `android-apk/publish-web.sh`, `android-apk/build-apk.sh`

#### Added (natywne APK — decyzja: koniec z publicznym hostingiem)
- `android-apk/`: natywne opakowanie w stylu KmylSales (aapt2+javac+d8+apksigner, bez Gradle) — WebView ładujący aplikację Z PLIKÓW WEWNĄTRZ APK (`assets/www`), zero hostingu i paska przeglądarki; sync do GAS działa z originu `file://` (probe: gasFetch OK); podpis kluczem rodzinnym z `apk/` (versionCode 2 = update po TWA). Wynik: `apk/FamilyGoals-1.1.0.apk` (110 KB). Files: `android-apk/AndroidManifest.xml`, `android-apk/src/.../MainActivity.java`, `android-apk/build-apk.sh`, `android-apk/res/*`
- Kierunek: po potwierdzeniu działania repo przechodzi na PRYWATNE (Pages/TWA wygaszone); wariant TWA + assetlinks porzucony.

#### Added (backend rodzinny — arkusz Google + sync między urządzeniami)
- Backend GAS (wzorzec proxy_call z KmylSales): `getFamilyBootstrap`/`Delta`, `pushChanges` (LWW po updatedAt), `claimToken` (first-writer-wins), arkusz „FamilyGoals-Data" auto-tworzony z kartami per encja + kolumną Json. Files: `backend-gas/Code.gs`, `backend-gas/FamilyBackend.gs`, `backend-gas/appsscript.json`. Deploy clasp @1.
- `js/sync-manager.js`: silnik snapshot-diff localStorage (łapie każdego writera bez monkey-patchy), trwała kolejka offline z replayem, stemplowanie updatedAt, pull delta z kursorem, merge LWW per rekord, tombstony, encje obiektowe dzielone per osoba (achievements/engagement). Files: `js/sync-manager.js`, `index.html`, `sw.js` (v12)
- UI: „Synchronizacja rodzinna" w Ustawieniach (URL + token, status, rozłączanie); auto-czyszczenie danych demo przy pierwszym połączeniu; start sync w init; demo pomijane przy skonfigurowanym sync. Files: `index.html`, `js/app.js`, `css/main.css`
- Testy: 7 kontraktowych sync (emulator backendu z semantyką GAS) — red→green; E2E dwa profile chromium na mock backendzie: 9/9 (bootstrap, delta, tombstone, czyszczenie demo). Files: `tests/sync-manager.test.js`
- Plan i decyzje: `thoughts/shared/plans/2026-07-24-backend-sheets-sync.md`

#### Changed (fala 3 — decyzje Kamila po audycie)
- family-unity + family-balance (1510 linii, 100% martwe) zarchiwizowane. Files: `js/archive/`, `index.html`, `sw.js` (v11), `js/app.js`, `tests/harness/load-app.js`
- AIAdvisor + AlertManager podpięte do dashboardu: porada dnia + max 3 alerty z dismissem. Files: `js/app.js`, `index.html`, `css/main.css`
- Osiągnięcia: UI pokazuje tylko 33 realnie zdobywalne (`EARNABLE_IDS`); nowe warunki streak_3..365 + week_user/month_user z danych EngagementManagera; check odznak przy logowaniu. Files: `js/gamification-manager.js`, `js/app.js`

---

## [2026-01-26] Sesja 11 - Major Audit Fixes (75/90 issues)

### Security
- SHA-256 PIN hashing via Web Crypto API. Files: `js/pin-manager.js`. Commit: `38a0558`
- XSS protection via escapeHtml() throughout codebase. Files: `js/utils.js`, `js/app.js`. Commit: `38a0558`
- Rate limiting: 5 attempts, 5 min lockout. Files: `js/pin-manager.js`. Commit: `38a0558`
- Import validation and sanitization. Files: `js/app.js`. Commit: `38a0558`
- Array growth limits to prevent unbounded storage. Files: `js/engagement-manager.js`. Commit: `38a0558`

### Performance
- In-memory caching layer in DataManager. Files: `js/data-manager.js`. Commit: `38a0558`
- Debounced renderAll at 100ms. Files: `js/app.js`. Commit: `38a0558`
- N+1 query fix in getTrendByOwner. Files: `js/data-manager.js`. Commit: `38a0558`

### Fixed
- All JSON.parse wrapped in try-catch. Files: `js/*.js` (multiple). Commit: `38a0558`
- Null checks throughout codebase. Files: `js/*.js` (multiple). Commit: `38a0558`
- Division by zero prevention. Files: `js/ai-advisor.js`, `js/data-manager.js`. Commit: `38a0558`
- Response cloning in service worker. Files: `sw.js`. Commit: `38a0558`
- Bounds checking for array access. Files: `js/app.js`. Commit: `38a0558`

### Added
- Shared utilities module. Files: `js/utils.js`. Commit: `38a0558`
- ACHIEVEMENT_CATEGORY_NAMES constant. Files: `js/utils.js`. Commit: `38a0558`
- renderEmptyState helper function. Files: `js/utils.js`. Commit: `38a0558`

### Changed
- Consolidated MONTHS, formatMoney, escapeHtml to utils.js. Files: `js/utils.js`, `js/app.js`. Commit: `38a0558`
- Removed console.log statements. Files: `js/app.js`. Commit: `38a0558`
- Named constants for magic numbers. Files: `js/pin-manager.js`. Commit: `38a0558`
- SW version bumped to v9. Files: `sw.js`. Commit: `38a0558`

---

## [2026-01-19] Sesja 10 - Bug Fixes (partial)

### Fixed
- Console error: `dismissAlert is not defined` - usunięto z window.app. Files: `js/app.js`
- Console error: `DataManager.getGoals not a function` - użyto instancji dataManager zamiast klasy. Files: `js/ui-features.js`
- Horizontal scroll w modalach - dodano max-width i overflow-x:hidden. Files: `css/main.css`
- Static goal-item i list-item w HTML blokowały dynamiczne renderowanie. Files: `index.html`

### Changed
- Mniejsze pola formularzy (min-height: 44px). Files: `css/main.css`
- Goals/Income lists używają ID zamiast querySelector. Files: `js/app.js`

### Added
- CSS dla `.line-chart-container` i `.line-chart`. Files: `css/main.css`

---

## [2026-01-10] Sesja 9 - Optymalizacja + Todo Lista

### Added
- **Optymalizacja** - zakładka na ekranie Przychody. Files: `index.html`, `js/app.js`, `css/main.css`
- **Todo Lista Domowa** - 6-ta zakładka w nawigacji. Files: `index.html`, `js/app.js`, `css/main.css`
- CRUD dla businessCosts (koszty firmowe). Files: `js/data-manager.js`
- CRUD dla todos (zadania domowe). Files: `js/data-manager.js`
- Modal dodawania/edycji kosztów firmowych. Files: `index.html`
- Modal dodawania/edycji zadań. Files: `index.html`
- Tabs UI component. Files: `css/main.css`

### Changed
- Bottom nav: 5 → 6 zakładek. Files: `index.html`, `css/main.css`
- showScreen() obsługuje 6 ekranów. Files: `index.html`

---

## [2026-01-10] Sesja 7 - Dev Environment + Bug Fixes

### Added
- Środowisko dev: live-server + Puppeteer Pixel 7 (412x915). Files: `package.json`, `scripts/dev-browser.js`
- Deep linking URL params (`?screen=X`, `?action=X`). Files: `js/app.js`
- Automatyczne testy ekranów (headless screenshots). Files: `scripts/test-screens.js`

### Fixed
- Progress bary celów pokazywały 0% - `getPlannedExpenses()` nie używał override z localStorage. Files: `js/data-manager.js`
- Service Worker cache lista - usunięto nieistniejący ui-controller.js. Files: `sw.js`

### Changed
- Service Worker cache version: v2 → v3. Files: `sw.js`

---

## [2025-12-30] Sesja 6 - Major Refactor

### Removed
- Usunięto funkcjonalność wydatków (zaarchiwizowano w komentarzach). Files: `index.html`, `js/app.js`
- Usunięto osiągnięcia "Kontrola wydatków" (15 achievementów). Files: `js/gamification-manager.js`

### Added
- Nowe osiągnięcia "Systematyczność" (15 achievementów). Files: `js/gamification-manager.js`. Commit: `6e62604`
- Filtr osiągnięć po osobie (klik na mąż/żona). Files: `js/app.js`. Commit: `6e62604`
- Popup z kwotą przy oznaczaniu pensji jako otrzymane. Files: `js/app.js`. Commit: `6e62604`
- Confirm dialog przy odznaczaniu pensji. Files: `js/app.js`. Commit: `6e62604`

### Changed
- Compact dashboard design (mniejsze paddingi, fonty). Files: `css/main.css`. Commit: `1f90963`
- Usunięto wykres historii z dashboard (przeniesiony do Przychody). Files: `index.html`. Commit: `1f90963`
- "Wasze przychody" pokazuje breakdown mąż/żona. Files: `js/app.js`. Commit: `6e62604`
- Historia zarobków 12 miesięcy (było 6). Files: `js/app.js`. Commit: `6e62604`

### Fixed
- Krzyżyk usuwania kategorii nie działał (brak window. prefix). Files: `js/app.js`. Commit: `6e62604`
- Zakres dat w celach nie mieścił się. Files: `css/main.css`. Commit: `6e62604`
- Jednorazowy/Stały chipy łamały się na nową linię. Files: `css/main.css`. Commit: `6e62604`

---

## [2025-12-29] Sesja 4-5

### Added
- feat: Toggle status Otrzymane/Oczekiwane (klik na ✓/⏳). Files: `js/app.js`, `js/data-manager.js`, `css/main.css`. Commit: `b352825`
- feat: Modal Kategorie w Settings. Files: `index.html`, `js/app.js`, `css/main.css`. Commit: `b352825`
- feat: Typ przychodu Cykliczny/Jednorazowy. Files: `index.html`, `js/app.js`, `js/data-manager.js`. Commit: `b352825`

### Changed
- Redesign delete button (subtelny szary zamiast różowego). Files: `css/main.css`. Commit: `b352825`

### Fixed
- fix: Data consistency - Dashboard vs Income screen (Mąż 2500→6000). Files: `index.html`. Commit: `df83f91`
- fix: Remove sticky button overlapping expense categories. Files: `css/main.css`. Commit: `d4db6de`
- fix: Compact UI - smaller padding, gaps, fonts for mobile fit. Files: `css/main.css`. Commit: `ef29a2c`
- fix: Base font size 18px → 16px. Files: `css/main.css`. Commit: `f2c555f`
- fix: Emoji icons in JSON (graduation-cap → 🎓). Files: `data/config.json`, `data/planned.json`. Commit: `afef4af`
- fix: Form submit buttons closed modal without saving. Files: `index.html`. Commit: `5a35029`
- fix: Chart placeholder when no data, values on bars. Files: `js/app.js`, `css/main.css`. Commit: `5a35029`
- fix: Expense categories expanded to 12, kids→children ID. Files: `index.html`. Commit: `5a35029`

### Added
- feat: Date range (from-to) for recurring expenses. Files: `index.html`, `js/app.js`, `css/main.css`. Commit: `8d8f52a`
- Demo data with leasing/insurance examples. Files: `js/app.js`. Commit: `8d8f52a`
- Demo data auto-initialization on first run. Files: `js/app.js`. Commit: `5a35029`

### Changed
- Compact mobile UI (padding 16px, gap 8px, nav 60px). Files: `css/main.css`. Commit: `ef29a2c`

---

### Fixed
- fix: Data consistency - Dashboard vs Income screen. Files: `index.html`. Commit: `df83f91` (previous session)
- fix: Deep frontend-backend integration (10 issues). Files: `js/app.js`, `index.html`. Commit: `1cb28ea`
- fix: checkAndUnlock() → checkAchievements() crash. Files: `js/app.js`. Commit: `1cb28ea`
- fix: Expense category chips missing data-category-id. Files: `index.html`. Commit: `1cb28ea`
- fix: Correct manager initialization and method names. Files: `js/app.js`. Commit: `0eb6e45`
- fix: Add service worker registration for PWA. Files: `index.html`. Commit: `e72415e`

### Added
- AlertManager integration on dashboard. Files: `js/app.js`, `index.html`, `css/main.css`. Commit: `1cb28ea`
- AIAdvisor daily tip on dashboard. Files: `js/app.js`, `index.html`, `css/main.css`. Commit: `1cb28ea`
- Edit prefill for goals and income sources. Files: `js/app.js`. Commit: `1cb28ea`
- All 11 manager scripts loaded. Files: `index.html`. Commit: `1cb28ea`

### Changed
- PIN handling unified with PinManager. Files: `index.html`, `js/app.js`. Commit: `1cb28ea`
- EventBus connected for UI reactivity. Files: `js/app.js`. Commit: `1cb28ea`
- RecurringManager initialized on app start. Files: `js/app.js`. Commit: `1cb28ea`
- Achievement category mapping expanded. Files: `js/app.js`. Commit: `1cb28ea`

### Added
- **CODEBASE.md** - dokumentacja API wszystkich managerów. Files: `logs/CODEBASE.md`. Commit: `0eb6e45`
- **app.js** - UI controller integrujący managery z frontendem. Files: `js/app.js`. Commit: `b3ac4c5`
- **PWA icons** - ikony 192x192 i 512x512. Files: `icons/`. Commit: `4aab851`
- **PWA screenshots** - dashboard i goals. Files: `screenshots/`. Commit: `c680d78`
- **PWA manifest** - kompletny z shortcuts, screenshots, id. Files: `manifest.json`. Commit: `c680d78`
- **Frontend v2** - jasny pastelowy motyw, fokus na przychody. Files: `css/main.css`, `index.html`. Commit: `608d9e4`
- **Complete UI** - wszystkie ekrany + modale. Files: `index.html`, `css/main.css`. Commit: `6248915`
- **New goals logic** - suma celów → miesięczne oszczędności. Files: `index.html`. Commit: `19e7fff`
- **GitHub Pages** - publiczny deploy. Commit: `2413bfa`
- **Goals system** - cele z dynamicznym deadline. Files: `js/data-manager.js`
- **Income Sources** - źródła przychodów + śledzenie wpłat. Files: `js/data-manager.js`
- **Gamification** - 105 osiągnięć, 12 nagród. Files: `js/gamification-manager.js`
- **AI Advisor** - szczere porady, ocena A-F. Files: `js/ai-advisor.js`
- **EventBus** - reaktywność UI. Files: `js/event-bus.js`
- **Engagement** - login streak, freeze, daily challenges. Files: `js/engagement-manager.js`
- **Family Unity** - współpraca > rywalizacja, wspólne punkty. Files: `js/family-unity.js`
- **Family Balance** - personalizacja mąż/żona, cele z "dlaczego". Files: `js/family-balance.js`
- Add README.md. Files: `README.md`. Commit: `f2183e1`
- Log File Genius v0.2.0 installed. Files: `.log-file-genius/`, `.logfile-config.yml`
- ADR-001: Adopted LFG for documentation. Files: `logs/adr/001-adopt-log-file-genius.md`
- Architecture + Design docs. Files: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`
- PIN Manager - 4-digit auth with sessions. Files: `js/pin-manager.js`
- Data Manager - full CRUD + stats + trends. Files: `js/data-manager.js`
- Recurring Manager - auto stałe wydatki. Files: `js/recurring-manager.js`
- Alert Manager - alerty budżetowe. Files: `js/alert-manager.js`
- PWA config. Files: `manifest.json`, `sw.js`
- Initial data files. Files: `data/*.json`

### Changed
- DESIGN.md rozszerzony o 5 nowych ekranów (Goals, Income Sources, Achievements, Rewards, AI Advisor)
- ARCHITECTURE.md rozszerzony o nowe modele i klasy
- Nawigacja: 📁 Kategorie → 🎯 Cele

### Changed
- Initial commit. Commit: `021b627`
- Architecture and core logic. Commit: `b5279cd`

---
