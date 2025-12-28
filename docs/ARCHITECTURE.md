# FamilyGoals - Architektura i Specyfikacja

## Cel Aplikacji

Webapp do śledzenia celów finansowych rodziny:
- Miesięczne cele oszczędnościowe
- Śledzenie wydatków i przychodów
- Dynamiczne aktualizacje (inflacja GUS)
- Cele długoterminowe (edukacja, remont)

---

## Użytkownicy

**Główny:** Żona (nietechniczna)
**Wymagania UX:**
- Maksymalnie prosty interfejs
- Duże przyciski (min 48px)
- Polski język
- Ciepłe, rodzinne kolory
- Jedno kliknięcie = jedna akcja

---

## Stack Techniczny

| Warstwa | Technologia |
|---------|-------------|
| Hosting | GitHub Pages (statyczny) |
| Frontend | Vanilla JS + Web Components |
| Style | CSS Variables |
| Offline | PWA + Service Worker |
| Dane | JSON (repo) + localStorage |
| UI Design | frontend-design plugin |

---

## Modele Danych

### 1. Expense (Wydatek)

```javascript
{
  id: string,          // unikalny ID
  amount: number,      // kwota w PLN
  categoryId: string,  // ID kategorii
  description: string, // opcjonalny opis
  date: string,        // ISO date
  isRecurring: boolean,// czy stały
  recurringDay: number // dzień miesiąca (1-31)
}
```

### 2. Income (Przychód)

```javascript
{
  id: string,
  amount: number,
  source: string,      // np. "Pensja", "Freelance"
  description: string,
  date: string,
  isRecurring: boolean,
  recurringDay: number
}
```

### 3. Category (Kategoria)

```javascript
{
  id: string,
  name: string,        // np. "Jedzenie"
  icon: string,        // emoji lub nazwa ikony
  color: string,       // hex color
  budget: number,      // miesięczny limit (0 = brak)
  isCustom: boolean,   // czy dodana przez użytkownika
  isActive: boolean    // czy widoczna
}
```

### 4. PlannedExpense (Cel długoterminowy)

```javascript
{
  id: string,
  name: string,           // np. "Edukacja dziecka"
  description: string,
  targetAmount: number,   // cel (np. 50000 zł)
  currentAmount: number,  // zebrano
  targetDate: string,     // do kiedy
  priority: 'high'|'medium'|'low',
  monthlyContribution: number, // ile miesięcznie
  icon: string,
  color: string
}
```

### 5. Settings (Ustawienia)

```javascript
{
  pin: string,             // hash PINu
  currency: 'PLN',
  locale: 'pl-PL',
  monthlySavingsTarget: number,
  emergencyFundTarget: number,
  currentEmergencyFund: number,
  showInflation: boolean,
  theme: 'dark'|'light'
}
```

### 6. Inflation (Dane inflacyjne - repo JSON)

```javascript
{
  lastUpdated: string,
  source: 'GUS',
  currentRate: {
    year: number,
    month: number,
    cpi: number      // wskaźnik CPI %
  },
  categoryRates: {   // inflacja per kategoria
    housing: number,
    food: number,
    // ...
  },
  history: [         // historia
    { year, month, cpi }
  ]
}
```

---

## Funkcje Biznesowe

### DataManager

```javascript
class DataManager {
  // === INICJALIZACJA ===
  async init()           // Ładuje dane z repo + localStorage

  // === WYDATKI ===
  getExpenses()          // Wszystkie wydatki
  getExpensesByMonth(y,m)// Wydatki z danego miesiąca
  addExpense(data)       // Dodaj wydatek
  updateExpense(id,data) // Edytuj wydatek
  deleteExpense(id)      // Usuń wydatek

  // === PRZYCHODY ===
  getIncome()
  getIncomeByMonth(y,m)
  addIncome(data)
  deleteIncome(id)

  // === KATEGORIE ===
  getCategories()        // Domyślne + własne
  getCustomCategories()  // Tylko własne
  addCategory(data)
  updateCategory(id,data)
  deleteCategory(id)

  // === STATYSTYKI ===
  getMonthlyStats(y,m)   // Podsumowanie miesiąca
  getYearlyStats(y)      // Podsumowanie roku
  getCategoryStats(catId)// Wydatki per kategoria
  getTrend(months)       // Trend oszczędności

  // === RECURRING ===
  processRecurring()     // Auto-dodaj stałe wydatki
  getRecurringExpenses()
  getRecurringIncome()

  // === CELE ===
  getPlannedExpenses()
  updatePlannedProgress(id, amount)
  calculateTimeToGoal(id)

  // === INFLACJA ===
  getInflationRate()
  adjustForInflation(amount, months)

  // === ALERTY ===
  getBudgetAlerts()      // Przekroczenia budżetu
  getGoalAlerts()        // Postęp celów

  // === BACKUP ===
  exportData()
  importData(json)

  // === HELPERS ===
  formatCurrency(amount)
  formatDate(date)
}
```

### PinManager

```javascript
class PinManager {
  static setPin(pin)     // Ustaw 4-cyfrowy PIN
  static verify(pin)     // Sprawdź PIN
  static isEnabled()     // Czy PIN ustawiony
  static removePin()     // Usuń PIN

  static startSession()  // Rozpocznij sesję (30 min)
  static endSession()    // Zakończ sesję
  static isSessionActive()
  static extendSession() // Przedłuż przy aktywności
  static requiresUnlock()// Czy pokazać ekran PIN
}
```

### RecurringManager

```javascript
class RecurringManager {
  static processAll()    // Sprawdź i dodaj stałe
  static shouldProcess(item, today)
  static getNextOccurrence(item)
  static markProcessed(item)
}
```

### AlertManager

```javascript
class AlertManager {
  static getAlerts(stats, categories, goals)
  static checkBudgetOverflow(stats, categories)
  static checkSavingsProgress(stats, goals)
  static checkGoalDeadlines(planned)
}
```

---

## Przepływy Użytkownika

### 1. Pierwszy uruchomienie
```
[Start] → [Ustaw PIN] → [Potwierdź PIN] → [Dashboard]
```

### 2. Powrót do aplikacji
```
[Start] → [Wpisz PIN] → [Dashboard]
```

### 3. Dodanie wydatku
```
[Dashboard] → [FAB +] → [Wydatek] →
[Kwota] → [Kategoria] → [Zapisz] → [Dashboard]
```

### 4. Sprawdzenie postępu
```
[Dashboard] → [Widzi: oszczędności, alerty, wykresy]
```

### 5. Zarządzanie kategoriami
```
[Kategorie] → [+ Dodaj] → [Nazwa, kolor, budżet] → [Zapisz]
```

---

## Widoki (Ekrany)

### 1. PIN Screen
- Logo rodziny
- 4 kropki (wypełnione/puste)
- Klawiatura numeryczna (1-9, 0, backspace)
- Tryby: setup, confirm, unlock

### 2. Dashboard
- Główny cel oszczędności + progress bar
- Alerty (przekroczenia budżetu)
- Statystyki: przychody vs wydatki
- Top 5 kategorii wydatków
- Cele długoterminowe (progress)
- Inflacja (opcjonalnie)

### 3. Expenses List
- Lista wydatków (najnowsze pierwsze)
- Ikona kategorii + nazwa + kwota + data
- Swipe/tap to delete
- Filtr: miesiąc, kategoria

### 4. Add Expense Modal
- Input: kwota (numeryczny)
- Wybór kategorii (chips)
- Opis (opcjonalny)
- Data (domyślnie dziś)
- Przycisk: Zapisz

### 5. Categories
- Lista kategorii (domyślne + własne)
- Własne: edycja, usuwanie
- Dodaj nową: nazwa, kolor, budżet

### 6. Settings
- Zmień PIN
- Eksport/Import danych
- Wyczyść dane
- Info o aplikacji

---

## Nawigacja

```
Bottom Navigation (4 tabs):
┌─────────────────────────────────────┐
│  🏠 Start │ 💰 Wydatki │ 📁 Kategorie │ ⚙️ Ustawienia │
└─────────────────────────────────────┘

FAB (Floating Action Button):
  [+] → Wydatek / Przychód
```

---

## Kolory i Styl

### Paleta
```css
--bg-primary: #1a1a2e     /* Tło główne */
--bg-secondary: #16213e   /* Tło nawigacji */
--bg-card: #1f2b4d        /* Karty */

--accent-primary: #4A90A4 /* Główny akcent */
--accent-success: #4CAF50 /* Pozytywne */
--accent-warning: #FF9800 /* Ostrzeżenia */
--accent-danger: #E91E63  /* Negatywne */

--text-primary: #ffffff
--text-secondary: #a0a0b0
```

### Kategorie - kolory
```
Mieszkanie:  #4A90A4
Jedzenie:    #7CB342
Transport:   #FF7043
Zdrowie:     #E91E63
Edukacja:    #9C27B0
Rozrywka:    #FF9800
Ubrania:     #00BCD4
Higiena:     #8BC34A
Dzieci:      #FFEB3B
Oszczędności:#4CAF50
Prezenty:    #F44336
Inne:        #607D8B
```

---

## Kategorie Domyślne

| ID | Nazwa | Ikona | Budżet |
|----|-------|-------|--------|
| housing | Mieszkanie | 🏠 | 3000 |
| food | Jedzenie | 🍽️ | 2000 |
| transport | Transport | 🚗 | 800 |
| health | Zdrowie | ❤️ | 500 |
| education | Edukacja | 📚 | 300 |
| entertainment | Rozrywka | 🎬 | 400 |
| clothing | Ubrania | 👕 | 300 |
| hygiene | Higiena | 💧 | 200 |
| children | Dzieci | 👶 | 500 |
| savings | Oszczędności | 💰 | 2000 |
| gifts | Prezenty | 🎁 | 200 |
| other | Inne | ⋯ | 300 |

---

## Dane z Repo (Claude zarządza)

### data/config.json
- Kategorie domyślne
- Cele oszczędnościowe
- Wydatki stałe (czynsz, media)

### data/inflation.json
- Aktualne dane inflacyjne (GUS)
- Historia inflacji
- Inflacja per kategoria

### data/planned.json
- Cele długoterminowe
- Postęp (aktualizowany przez Claude)

---

## localStorage (Użytkownik zarządza)

```
familygoals_pin          # Hash PINu
familygoals_session      # Timestamp sesji
familygoals_expenses     # Tablica wydatków
familygoals_income       # Tablica przychodów
familygoals_categories   # Własne kategorie
familygoals_settings     # Ustawienia
familygoals_last_sync    # Ostatnia synchronizacja
familygoals_*_cache      # Cache danych repo
```

---

## Walidacje

### Expense
- amount > 0
- categoryId istnieje
- date <= today

### Category
- name: 1-30 znaków
- color: valid hex
- budget >= 0

### PIN
- 4 cyfry
- tylko 0-9

---

## Alerty (In-App)

| Warunek | Typ | Komunikat |
|---------|-----|-----------|
| Budżet kategorii >= 100% | danger | "Przekroczono budżet o X zł" |
| Budżet kategorii >= 80% | warning | "Wykorzystano X% budżetu" |
| Oszczędności >= cel | success | "Cel osiągnięty!" |
| Oszczędności < 50% po 15. | warning | "Zostało X zł do celu" |
| Cel długoterminowy bliski | info | "Do X zostało Y miesięcy" |

---

## Workflow Miesięczny (Claude)

1. Sprawdź GUS (stat.gov.pl)
2. Zaktualizuj `data/inflation.json`
3. Przelicz cele jeśli trzeba
4. Commit + push
5. App pobiera przy load

---

## Przyszłe Rozszerzenia

- [ ] Wykresy (Chart.js)
- [ ] Powiadomienia push
- [ ] Synchronizacja między urządzeniami
- [ ] Widok kalendarza
- [ ] Raporty PDF
- [ ] Ciemny/jasny motyw
- [ ] Multi-waluta
