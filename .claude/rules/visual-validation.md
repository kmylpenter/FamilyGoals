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

DATA CONSISTENCY (spójność danych):
[ ] Te same dane wyświetlane tak samo na różnych ekranach?
[ ] Wartości liczbowe spójne (np. zarobki, sumy)?
[ ] Daty/terminy spójne między widokami?
[ ] Nazwy/tytuły identyczne wszędzie?

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
4. OBOWIĄZKOWO: Analiza krytyczna (sekcja 0)
5. Jeśli BLOCKER → napraw → goto 3
6. Jeśli wszystko OK → dopiero teraz DONE
```

### NIGDY nie mów DONE bez:

- Screenshot każdej funkcji
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
| Puppeteer (web) | ✅ npm install |
| Native app auto | ❌ Wymaga PC+adb |
| Image compare | ✅ Python PIL |

---

## 8. PRZYKŁAD SESJI

```
Użytkownik: auto formularz kontaktowy z visual test

KRYTERIA Z ZADANIA:
- Pola: name, email, message
- Walidacja błędów
- Submit button
- Potwierdzenie wysłania

Claude:
1. Tworzę formularz...

2. Screenshot PRZED ogłoszeniem DONE:
   node scripts/capture-web.js http://localhost:3000/contact form-v1

3. KRYTYCZNA ANALIZA (szukam problemów):

   Checklist z zadania:
   [ ] name field - WIDOCZNY? tak, w całości
   [ ] email field - WIDOCZNY? tak, w całości
   [ ] message field - WIDOCZNY? tak, ale...
       ⚠️ PROBLEM: textarea ucięta na dole!
   [ ] submit button - WIDOCZNY? tak
       ⚠️ PROBLEM: za mały, trudno kliknąć
   [ ] error states - WIDOCZNE? NIE WIDZĘ
       🛑 BLOCKER: nie pokazano walidacji błędów
   [ ] confirmation - WIDOCZNE? NIE TESTOWANE
       🛑 BLOCKER: brak screenshot po submit

   WYNIK: 2x BLOCKER, 2x PROBLEM
   NIE MOGĘ POWIEDZIEĆ "DONE"

4. Naprawiam błędy...

5. Nowy screenshot form-v2 + form-v2-error + form-v2-success

6. PONOWNA ANALIZA:
   [x] wszystkie pola widoczne w całości
   [x] button odpowiedni rozmiar
   [x] error state widoczny (czerwony tekst)
   [x] success state widoczny (zielone potwierdzenie)

   WYNIK: 0 BLOCKER, 0 PROBLEM

7. DONE - wszystkie funkcje zweryfikowane wizualnie
```
