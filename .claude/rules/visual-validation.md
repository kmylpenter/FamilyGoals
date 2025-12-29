# Visual Validation Rules

## Trigger

Gdy użytkownik powie **"visual test"**, **"sprawdź screenshot"**, **"porównaj screenshoty"** lub pracujesz nad UI.

---

## 0. KRYTYCZNE - Walidacja przed DONE (OBOWIĄZKOWE)

### Zasada nadrzędna

**Screenshot ≠ Walidacja. Musisz AKTYWNIE ANALIZOWAĆ obraz.**

### PRZED ogłoszeniem "gotowe" / "DONE" MUSISZ:

1. **Zrobić screenshot KAŻDEJ funkcji z zadania**
2. **Przeanalizować KRYTYCZNIE** - szukaj BŁĘDÓW, nie potwierdzeń
3. **Sprawdzić PEŁNĄ checklistę:**

```
WIDOCZNOŚĆ (podstawowe):
[ ] Wszystkie elementy z zadania WIDOCZNE?
[ ] Coś przysłania inne elementy?
[ ] Proporcje i rozmiary poprawne?
[ ] Tekst czytelny (nie ucięty, nie za mały)?
[ ] Elementy interaktywne wyglądają klikalnie?
[ ] Layout nie rozjechany?

STANY INTERAKTYWNE:
[ ] Hover state (jeśli dotyczy)
[ ] Focus state (widoczny?)
[ ] Disabled state (jeśli dotyczy)
[ ] Loading state (jeśli dotyczy)
[ ] Error state (jeśli dotyczy)
[ ] Success state (jeśli dotyczy)

RESPONSYWNOŚĆ:
[ ] Mobile view OK? (jeśli dotyczy)
[ ] Desktop view OK? (jeśli dotyczy)
[ ] Breakpointy nie psują layoutu?

EDGE CASES:
[ ] Długi tekst - overflow/truncate OK?
[ ] Puste dane - placeholder/empty state?
[ ] Dużo danych - scroll działa?
[ ] Minimalny content - nie rozjeżdża?

ACCESSIBILITY:
[ ] Kontrast wystarczający (WCAG)?
[ ] Focus visible (klawiatura)?
[ ] Touch target min 48px (mobile)?
[ ] Tekst nie za mały (<12px)?

SPÓJNOŚĆ Z DESIGNEM:
[ ] Zgodność z design system/mockup?
[ ] Spójne marginesy i paddingi?
[ ] Spójna typografia (font, size, weight)?
[ ] Spójna kolorystyka?
[ ] Spójne zaokrąglenia (border-radius)?

DATA CONSISTENCY (spójność danych) - WYMAGA PORÓWNANIA:
[ ] LISTA: Wypisałem WSZYSTKIE ekrany pokazujące te same dane?
[ ] SCREENSHOTY: Mam screenshot KAŻDEGO z tych ekranów?
[ ] SIDE-BY-SIDE: Porównałem wartości między ekranami?
[ ] Wartości liczbowe IDENTYCZNE (np. zarobki na liście = szczegóły)?
[ ] Daty/terminy IDENTYCZNE między widokami?
[ ] Nazwy/tytuły IDENTYCZNE wszędzie?

TEXT HANDLING (obsługa tekstu):
[ ] Tekst NIE ucięty bez ellipsis (...)?
[ ] Jeśli truncated → ma tooltip lub expand?
[ ] Daty/liczby mieszczą się w kontenerze?
[ ] Tekst nie wychodzi poza granice elementu?

LAYOUT GROUPING (grupowanie elementów):
[ ] Przyciski które powinny być obok siebie - SĄ obok?
[ ] Elementy nie łamią się niepotrzebnie na nową linię?
[ ] Jeśli brak miejsca → zmniejszenie zamiast łamania?
[ ] Flex/grid wrap działa sensownie?

FLOATING ELEMENTS (elementy pływające):
[ ] FAB nie przysłania ważnej treści?
[ ] Sticky header/footer nie zasłania contentu?
[ ] Modal/popup nie ucina własnej treści?
[ ] Snackbar/toast nie zasłania akcji?
```

**UWAGA:** Nie wszystkie punkty dotyczą każdego zadania.
Sprawdź te, które SĄ RELEVANTNE dla konkretnego zadania.

### Co jest BLOCKER (nie footnote):

| Sytuacja | Status |
|----------|--------|
| Element niewidoczny na screenshot | 🛑 BLOCKER |
| Element przysłonięty przez inny | 🛑 BLOCKER |
| Tekst ucięty lub nieczytelny | 🛑 BLOCKER |
| Funkcja z zadania nie pokazana | 🛑 BLOCKER |
| "Nie widziałem X" | 🛑 BLOCKER |
| Layout rozjechany | 🛑 BLOCKER |
| Brak wymaganego stanu (error/loading/success) | 🛑 BLOCKER |
| Overflow tekstu bez obsługi | 🛑 BLOCKER |
| Mobile view zepsute (jeśli wymagane) | 🛑 BLOCKER |
| Niezgodność z mockupem (jeśli dostarczony) | 🛑 BLOCKER |
| **Dane niespójne między ekranami** | 🛑 BLOCKER |
| **Tekst ucięty bez ellipsis** | 🛑 BLOCKER |
| **FAB/floating przysłania treść** | 🛑 BLOCKER |
| **Przyciski złamane zamiast zmniejszone** | 🛑 BLOCKER |
| Focus niewidoczny (accessibility) | ⚠️ PROBLEM |
| Kontrast za niski | ⚠️ PROBLEM |
| Touch target za mały (<48px) | ⚠️ PROBLEM |
| Niespójne marginesy/style | ⚠️ PROBLEM |
| Elementy łamią się na nową linię | ⚠️ PROBLEM |

### NIE MÓW "gotowe" jeśli:

- Nie widziałeś funkcji na screenshot
- Cokolwiek wygląda źle
- Masz wątpliwości
- Element "prawdopodobnie działa" ale nie sprawdziłeś wizualnie

### Analiza = szukanie PROBLEMÓW

```
❌ ŹLE: "Sprawdzam czy X jest po prawej... tak, jest. OK!"
✅ DOBRZE: "Co może być źle? Czy coś przysłania X?
           Czy X jest w całości widoczny? Czy nic nie nachodzi?"
```

### Confirmation bias - jak unikać

1. Najpierw wymień CO POWINNO BYĆ widoczne (z zadania)
2. Dla KAŻDEGO elementu sprawdź:
   - Czy jest widoczny W CAŁOŚCI?
   - Czy coś go nie przysłania?
   - Czy wygląda poprawnie?
3. Dopiero potem ogłoś sukces lub zgłoś problem

### CROSS-SCREEN VALIDATION (OBOWIĄZKOWE dla danych)

**Jeśli te same dane pojawiają się na >1 ekranie:**

#### Krok 1: WYMIEŃ wszystkie ekrany z danymi
```
EKRANY Z DANYMI [nazwa_encji]:
1. Lista [encji] - pokazuje: X, Y, Z
2. Szczegóły [encji] - pokazuje: X, Y, Z, W
3. Edycja [encji] - pokazuje: X, Y
4. Dashboard - pokazuje: suma X
```

#### Krok 2: ZRÓB screenshot KAŻDEGO ekranu
```
# MUSISZ mieć screenshot każdego!
logs/screenshots/lista-[encji].png
logs/screenshots/szczegoly-[encji].png
logs/screenshots/edycja-[encji].png
logs/screenshots/dashboard.png
```

#### Krok 3: PORÓWNAJ side-by-side
```
PORÓWNANIE WARTOŚCI:

| Pole     | Lista | Szczegóły | Edycja | Dashboard |
|----------|-------|-----------|--------|-----------|
| nazwa    | "X"   | "X"       | "X"    | -         |
| kwota    | 1000  | 1000      | 1000   | suma:1000 |
| data     | 01-15 | 01-15     | 01-15  | -         |

✅ SPÓJNE / 🛑 NIESPÓJNE: [pole] różni się!
```

#### Przykład BŁĘDU do wykrycia:
```
| Pole     | Lista | Szczegóły |
|----------|-------|-----------|
| zarobki  | 5500  | 4500      |  ← 🛑 NIESPÓJNE!

BLOCKER: Zarobki na liście (5500) ≠ szczegóły (4500)
```

**NIE MÓW DONE jeśli:**
- Nie wypisałeś wszystkich ekranów z danymi
- Brakuje screenshot któregoś ekranu
- Nie zrobiłeś tabeli porównawczej

### Porównanie z mockupem/design system

**Jeśli użytkownik dostarczył mockup/design:**

1. Otwórz mockup OBOK screenshot
2. Porównaj PIXEL BY PIXEL (w miarę możliwości):
   - Rozmiary elementów
   - Odstępy (margin, padding)
   - Kolory (dokładne wartości)
   - Typografia (font, size, weight)
   - Zaokrąglenia, cienie
3. Zgłoś KAŻDĄ różnicę (nawet małą)

**Jeśli projekt ma design system:**

1. Sprawdź czy użyte:
   - Właściwe tokeny kolorów
   - Właściwe tokeny spacing
   - Właściwe komponenty
2. Zgłoś odstępstwa od design system

**Jeśli NIE MA mockupu/design system:**

1. Sprawdź spójność z RESZTĄ PROJEKTU
2. Porównaj z istniejącymi komponentami
3. Zachowaj ten sam styl

---

## 1. MANUAL SCREENSHOT (Android native apps)

### Workflow

```
1. Użytkownik robi screenshot (Power + Vol Down)
2. Przenosi do projektu:
   mv ~/storage/downloads/Screenshot*.png logs/screenshots/
3. Mówi: "sprawdź screenshot logs/screenshots/nazwa.png"
4. Claude analizuje obraz (multimodal)
```

### Co sprawdzam

**Podstawowe:**
- Layout i rozmieszczenie elementów
- Czytelność tekstu
- Kontrast i kolory
- Responsywność
- Błędy wizualne (overlapping, cut-off)
- Zgodność z Material Design (Android)

**Stany i interakcje:**
- Czy pokazano wszystkie stany (normal/pressed/disabled)?
- Czy error/success states widoczne?
- Czy loading indicators obecne?

**Edge cases:**
- Długi tekst - czy się mieści?
- Puste stany - czy jest placeholder?
- Scroll - czy działa dla dużej ilości danych?

**Spójność:**
- Czy pasuje do reszty aplikacji?
- Czy marginesy/paddingi spójne?
- Czy typografia spójna?

### Odpowiedź

```markdown
📸 **Analiza Screenshot**

**Widoczne elementy:**
- Element 1
- Element 2

**Problemy:**
- ⚠️ Problem 1
- ⚠️ Problem 2

**Rekomendacje:**
- Zmiana 1
- Zmiana 2

**Ocena:** OK / WYMAGA POPRAWEK
```

---

## 2. WEB SCREENSHOT (automatyczne)

### Puppeteer - pojedynczy screenshot

```bash
# Wymaga: npm install puppeteer (w projekcie)
node scripts/capture-web.js http://localhost:3000
node scripts/capture-web.js http://localhost:3000 homepage
```

**Output:** `logs/screenshots/homepage-2025-12-29T14-30-00.png`

### Puppeteer - porównanie before/after

```bash
# Przed zmianami:
node scripts/capture-web-compare.js http://localhost:3000 test-name

# Po zmianach:
node scripts/capture-web-compare.js http://localhost:3000 test-name

# Claude porównuje:
"porównaj logs/screenshots/test-name-before.png z test-name-after.png"
```

---

## 3. IMAGE COMPARE (Python)

### Porównanie dwóch obrazów

```bash
python3 scripts/image-compare.py before.png after.png
python3 scripts/image-compare.py before.png after.png --diff diff.png
```

**Output:**
```
Similarity: 97.5%
Status: ⚠ MINOR DIFFERENCES
```

### Exit codes

| Code | Znaczenie |
|------|-----------|
| 0 | Podobne (>95%) |
| 2 | Różnice (<95%) |
| 1 | Error |

---

## 4. INTEGRACJA Z AUTO MODE

### Przy pracy nad UI

```markdown
auto landing page

KRYTERIA:
- Hero section widoczna
- Mobile responsive
- Przyciski klikalne

VISUAL:
- Screenshot przed: logs/screenshots/landing-before.png
- Screenshot po: automatyczny przez Puppeteer
- Porównanie: Claude multimodal
```

### Workflow w auto mode (OBOWIĄZKOWY)

```
1. [opcjonalnie] Zrób screenshot BEFORE (baseline)
2. Implementuj zmiany
3. OBOWIĄZKOWO: Screenshot KAŻDEJ funkcji z zadania
4. OBOWIĄZKOWO: Screenshot KAŻDEGO ekranu z danymi
   (lista, szczegóły, edycja, dashboard - WSZYSTKIE!)
5. OBOWIĄZKOWO: Analiza krytyczna (sekcja 0)
6. OBOWIĄZKOWO: Cross-screen validation (tabela porównawcza)
7. Jeśli BLOCKER → napraw → goto 3
8. Jeśli wszystko OK → dopiero teraz DONE
```

### NIGDY nie mów DONE bez:

- Screenshot każdej funkcji
- Screenshot KAŻDEGO ekranu pokazującego dane
- Tabeli porównawczej wartości cross-screen
- Krytycznej analizy każdego screenshot
- Potwierdzenia że WSZYSTKO widoczne i poprawne

---

## 5. KOMENDY

### Dla użytkownika

| Komenda | Akcja |
|---------|-------|
| `visual test` | Analizuj ostatni screenshot |
| `sprawdź [plik]` | Analizuj konkretny obraz |
| `porównaj [a] z [b]` | Porównaj dwa obrazy |
| `web screenshot [url]` | Puppeteer capture |

### Dla Claude (wewnętrzne)

```bash
# Capture web
node scripts/capture-web.js <url> [name]

# Compare images
python3 scripts/image-compare.py <img1> <img2>

# Read image (multimodal)
Read logs/screenshots/nazwa.png
```

---

## 6. BEST PRACTICES

### Nazewnictwo

```
logs/screenshots/
├── homepage-before.png      # Baseline
├── homepage-after.png       # Po zmianach
├── homepage-diff.png        # Różnice
├── mobile-2025-12-29.png    # Timestamped
└── bug-123-evidence.png     # Bug reference
```

### Kiedy robić screenshoty

- Przed major UI changes (baseline)
- Po implementacji (verification)
- Przy bug reports (evidence)
- Dla dokumentacji (README)

### Cleanup

```bash
# Usuń stare screenshoty (>7 dni)
find logs/screenshots -name "*.png" -mtime +7 -delete
```

---

## 7. OGRANICZENIA TERMUX

| Funkcja | Status |
|---------|--------|
| Manual screenshot | ✅ Power+Vol Down |
| Claude multimodal | ✅ Read tool |
| Puppeteer (web) | ✅ Zainstalowany globalnie |
| Native app auto | ❌ Wymaga PC+adb |
| Image compare | ✅ Python PIL |

### WAŻNE: NIE instaluj ponownie!

Chromium i puppeteer-core są już zainstalowane globalnie:
- `chromium-browser` → `/data/data/com.termux/files/usr/bin/`
- `puppeteer-core` → globalny npm package

**NIE RÓB:**
```bash
pkg install chromium   # ❌ już jest
npm install puppeteer  # ❌ już jest
```

**PO PROSTU UŻYJ:**
```bash
node scripts/capture-web.js <url>
```

---

## 8. PRZYKŁAD SESJI (prosty - bez danych cross-screen)

```
Użytkownik: auto formularz kontaktowy

KRYTERIA Z ZADANIA:
- Pola: name, email, message
- Walidacja błędów
- Submit button
- Potwierdzenie wysłania

Claude:
1. Tworzę formularz...

2. Screenshot PRZED ogłoszeniem DONE:
   node scripts/capture-web.js http://localhost:3000/contact form-v1

3. KRYTYCZNA ANALIZA:
   [ ] name field - WIDOCZNY? tak
   [ ] email field - WIDOCZNY? tak
   [ ] message field - WIDOCZNY? tak, ale...
       ⚠️ PROBLEM: textarea ucięta!
   [ ] error states - NIE WIDZĘ
       🛑 BLOCKER: brak screenshot walidacji

   WYNIK: BLOCKER → naprawiam

4. Nowy screenshot form-v2 + form-error + form-success
   [x] wszystko widoczne
   WYNIK: 0 BLOCKER

5. DONE
```

---

## 9. PRZYKŁAD SESJI (z danymi cross-screen - OBOWIĄZKOWE!)

```
Użytkownik: auto zarządzanie pracownikami

KRYTERIA Z ZADANIA:
- Lista pracowników
- Szczegóły pracownika
- Edycja pracownika
- Dashboard z podsumowaniem

Claude:
1. Implementuję...

2. IDENTYFIKACJA EKRANÓW Z DANYMI:
   Dane pracownika pojawiają się na:
   - Lista pracowników (imię, zarobki, stanowisko)
   - Szczegóły pracownika (wszystkie dane)
   - Edycja pracownika (wszystkie dane)
   - Dashboard (suma zarobków)

3. SCREENSHOTY - WSZYSTKIE ekrany:
   ✅ lista-pracownikow.png
   ✅ szczegoly-jan-kowalski.png
   ✅ edycja-jan-kowalski.png
   ✅ dashboard.png

4. CROSS-SCREEN VALIDATION (OBOWIĄZKOWE):

   PORÓWNANIE - Jan Kowalski:
   | Pole      | Lista | Szczegóły | Edycja |
   |-----------|-------|-----------|--------|
   | imię      | Jan K.| Jan Kowalski | Jan Kowalski |
   | zarobki   | 5500  | 4500      | 4500   |  ← 🛑
   | stanowisko| Dev   | Developer | Developer |

   🛑 BLOCKER: Zarobki na liście (5500) ≠ szczegóły (4500)
   NIE MOGĘ POWIEDZIEĆ "DONE"

5. Naprawiam źródło danych...

6. PONOWNE SCREENSHOTY + PORÓWNANIE:
   | Pole      | Lista | Szczegóły | Edycja |
   |-----------|-------|-----------|--------|
   | zarobki   | 4500  | 4500      | 4500   | ✅

   WYNIK: 0 BLOCKER

7. DONE - wszystkie wartości SPÓJNE cross-screen
```
