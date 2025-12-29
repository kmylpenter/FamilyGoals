# Autonomous Work Rules

## Trigger: "auto [zadanie]"

Gdy użytkownik powie **"auto"** + opis zadania, uruchom tryb autonomiczny.

---

## 1. INICJALIZACJA

### Krok 1: Przeczytaj kontekst
```
1. logs/STATE.md - stan projektu
2. logs/CONTINUITY.md - ostatnia sesja
3. logs/handoffs/ - ostatni handoff (jeśli istnieje)
4. VALIDATION.md - jeśli istnieje
```

### Krok 2: Wybierz szablon walidacji

Na podstawie zadania wybierz odpowiedni szablon z `~/.templates/validation/`:

| Zadanie zawiera | Szablon |
|-----------------|---------|
| frontend, UI, React, Vue, CSS | web-frontend.md |
| backend, API, server, Node | web-backend.md |
| android, kotlin, mobile app | android-app.md |
| CLI, script, bash, command | cli-tool.md |
| REST, endpoints, API design | api-rest.md |
| python, script.py | python-script.md |
| docs, README, documentation | documentation.md |

### Krok 3: Zapisz cel w CONTINUITY.md

```markdown
## Aktywna Sesja

**Start:** [timestamp]
**Cel:** [zadanie od użytkownika]
**Status:** IN_PROGRESS
**Poziom:** 1
```

### Krok 4: Utwórz VALIDATION.md

1. Skopiuj wybrany szablon
2. Dodaj specyficzne kryteria z zadania
3. Zapisz jako `./VALIDATION.md`

---

## 2. PĘTLA PRACY

### Cykl podstawowy

```
while not DONE:
    1. Wybierz następny punkt z checklisty
    2. Implementuj
    3. [Hook waliduje automatycznie]
    4. Jeśli FAIL → napraw → goto 3
    5. Jeśli PASS → oznacz [x] w VALIDATION.md
    6. Aktualizuj CONTINUITY.md (co 15-30 min)
```

### Delegowanie do walidacji

Dla złożonych walidacji użyj **Task tool** z agentem:

```
Główny agent: Implementuje kod
    │
    ▼
Task(subagent_type="Explore"):
    "Zwaliduj czy [komponent] spełnia:
     - kryterium A
     - kryterium B
     Zwróć: PASS/FAIL + szczegóły"
    │
    ▼
Główny agent: Analizuje wynik
    │
    ├─ PASS → następny punkt
    └─ FAIL → napraw → ponów walidację
```

### Kiedy delegować

| Sytuacja | Akcja |
|----------|-------|
| Prosty check (lint, test) | Hook automatyczny |
| Sprawdzenie wielu plików | Deleguj do agenta Explore |
| Walidacja architektury | Deleguj do agenta |
| Porównanie z wzorcem | Deleguj do agenta |
| Review kodu | Deleguj do agenta |

### Przykład delegowania

```
# Po napisaniu komponentu React

Task(subagent_type="Explore"):
    "Sprawdź src/components/Button.jsx:
     1. Ma onClick lub href?
     2. Ma hover/focus styles?
     3. Ma aria-label jeśli icon-only?
     4. Używa design tokens?

     Zwróć checklist z PASS/FAIL dla każdego."
```

---

## 2.5 VISUAL VALIDATION (dla zadań UI - OBOWIĄZKOWE)

**Jeśli zadanie dotyczy UI/frontend** (React, Vue, CSS, layout, komponenty):

### PRZED ogłoszeniem DONE musisz:

1. Zrobić screenshot KAŻDEJ funkcji z zadania
2. Przeanalizować KRYTYCZNIE (szukaj błędów!)
3. Sprawdzić checklistę z sekcji 0 w `visual-validation.md`

### Co jest BLOCKER (nie footnote):

- Element niewidoczny na screenshot
- Element przysłonięty przez inny
- Tekst ucięty lub nieczytelny
- Funkcja z zadania nie pokazana na screenshot
- "Nie widziałem X na screenshot"

### NIE MÓW "DONE" jeśli:

- Nie zrobiłeś screenshot każdej funkcji
- Nie przeanalizowałeś krytycznie każdego screenshot
- Masz jakiekolwiek wątpliwości wizualne
- Coś "prawdopodobnie działa" ale nie sprawdziłeś

**Szczegóły:** Zobacz `.claude/rules/visual-validation.md` sekcja 0

---

## 3. AKTUALIZACJA STANU

### CONTINUITY.md - co 15-30 min

```markdown
## Postęp

- [x] Krok 1 - ukończony
- [x] Krok 2 - ukończony
- [ ] Krok 3 - W TRAKCIE (70%)
- [ ] Krok 4 - oczekuje

## Następne Kroki

1. Dokończyć krok 3
2. Zacząć krok 4
```

### VALIDATION.md - po każdym kroku

Oznaczaj ukończone punkty:
```markdown
- [x] Punkt ukończony
- [ ] Punkt do zrobienia
```

---

## 4. WARUNKI STOPU

### Zatrzymaj się gdy:

1. **Sukces** - Wszystkie kryteria VALIDATION.md spełnione
   - Dla UI: + visual validation PASS (sekcja 2.5)
2. **Bloker** - Napotkasz problem wymagający decyzji użytkownika
3. **Visual bloker** - Element niewidoczny/przysłonięty na screenshot
4. **Czas** - Minęły 2h (przypomnij o przerwie)
5. **Błąd** - 3x nieudana próba naprawy tego samego problemu
6. **Brak postępu** - 30 min bez zmiany statusu

### NIE MOŻESZ ogłosić sukcesu jeśli (dla UI):

- Nie zrobiłeś screenshot każdej funkcji
- Nie przeanalizowałeś krytycznie screenshotów
- Jakikolwiek element niewidoczny/przysłonięty

### Przy zatrzymaniu:

1. Zapisz stan do CONTINUITY.md
2. Wylistuj co zostało
3. Zaproponuj następne kroki
4. Czekaj na komendę użytkownika

---

## 5. KOMENDY W TRAKCIE PRACY

### "status"

Pokaż zwięźle:
```
📍 Status: [zadanie]

Postęp: 7/12 (58%)
✅ Ukończone: A, B, C
🔄 W trakcie: D (80%)
⏳ Pozostało: E, F, G

Następny krok: [co teraz robię]
```

### "pause"

1. Zapisz stan do CONTINUITY.md
2. Oznacz: `**Status:** PAUSED`
3. Pokaż co zostało:
```
⏸️ Sesja wstrzymana

Zapisano w: logs/CONTINUITY.md
Zrobione: 7/12
Pozostało: E, F, G

Wznów komendą: resume
```

### "resume"

1. Przeczytaj CONTINUITY.md
2. Znajdź ostatni punkt IN_PROGRESS
3. Zmień status na IN_PROGRESS
4. Kontynuuj od tego miejsca:
```
▶️ Wznawiam sesję

Cel: [zadanie]
Kontynuuję od: [punkt]
```

### "stop"

Zakończ bieżący krok, potem zatrzymaj:
```
🛑 Zatrzymuję po tym kroku

[dokończ bieżący krok]
[zapisz stan]
```

---

## 6. KOMENDA "eos" (End of Session)

Rozszerzenie standardowego eos o handoff:

### Krok 1: Utwórz handoff

Zapisz do `logs/handoffs/YYYY-MM-DD-HHMM.md`:

```markdown
# Session Handoff

**Data:** [timestamp]
**Czas pracy:** [czas od startu]
**Outcome:** SUCCEEDED | PARTIAL | FAILED

## Podsumowanie
[1-2 zdania co osiągnięto]

## Zrobione
- [x] punkt 1
- [x] punkt 2

## Nie ukończone
- [ ] punkt 3

## Kluczowe decyzje
- Decyzja X - powód

## Dla następnej sesji
1. Kontynuować od punktu 3
2. ...

## Pliki zmienione
- path/to/file1
- path/to/file2
```

### Krok 2: Aktualizuj CONTINUITY.md

```markdown
**Status:** COMPLETED
```

Lub jeśli nie ukończono:
```markdown
**Status:** HANDOFF_CREATED
```

### Krok 3: Standardowe eos

- Aktualizuj STATE.md
- Aktualizuj CHANGELOG.md
- Aktualizuj DEVLOG.md (jeśli milestone)
- Git commit + push

---

## 7. BEST PRACTICES

### Dobre zadanie

```
auto formularz kontaktowy

KRYTERIA:
- Pola: name, email, message
- Walidacja email regex
- Submit do /api/contact
- Loading state
- Success/error feedback
- Mobile responsive

DONE = wszystkie powyżej + testy PASS
```

### Złe zadanie

```
auto zrób stronę
```
(zbyt ogólne, brak kryteriów)

### Delegowanie

- Deleguj walidację gdy >3 plików do sprawdzenia
- Deleguj review gdy kod krytyczny
- NIE deleguj prostych checków (lint, test)

### Aktualizacje

- CONTINUITY.md: co 15-30 min LUB po ważnym kroku
- VALIDATION.md: po każdym ukończonym punkcie
- Handoff: tylko przy eos

---

## 8. DELEGOWANIE (CRITICAL)

### Kiedy ZAWSZE delegować do Task(Explore):

| Sytuacja | Deleguj |
|----------|---------|
| Czytanie >3 plików | ✅ TAK |
| Kopiowanie wielu plików | ✅ TAK |
| Analiza dużego pliku (>200 linii) | ✅ TAK |
| Szukanie wzorca w codebase | ✅ TAK |
| Powtarzalne zadanie (np. 7x szablon) | ✅ TAK |
| Review kodu | ✅ TAK |

### Kiedy NIE delegować:

- Główna logika zadania
- Decyzje wymagające pełnego kontekstu
- Edycje 1-2 plików które już przeczytałeś

### Jak delegować efektywnie:

```
Task(subagent_type="Explore"):
    "KONTEKST: Aktualizuję instalator desktop.

    ZADANIE: Przeczytaj pliki w ~/.templates/validation/
    i dla każdego zwróć:
    - nazwa pliku
    - ile ma checkboxów
    - główne kategorie

    FORMAT: lista markdown"
```

**WAŻNE:** Agent ma PUSTY kontekst - prompt musi zawierać:
- Co robimy (1 zdanie)
- Co dokładnie ma zrobić
- W jakim formacie zwrócić

### Oszczędność tokenów:

- Bez delegacji: ~40k tokenów na duże zadanie
- Z delegacją: ~25k tokenów (37% mniej)

---

## 9. CHECKLISTA PRZED STARTEM

Przed rozpoczęciem pracy autonomicznej sprawdź:

- [ ] Zadanie ma jasne kryteria akceptacji
- [ ] Wybrany szablon walidacji
- [ ] CONTINUITY.md zainicjalizowany
- [ ] Testy/walidacja skonfigurowane (hooks)
- [ ] **Zidentyfikowane zadania do delegacji**
