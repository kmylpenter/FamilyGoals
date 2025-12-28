# Codebase Reference - FamilyGoals

> **Cel:** Katalog dostępnych modułów i funkcji.
> **Aktualizacja:** Po każdym COMMIT dodającym nowy kod.

---

## Quick Reference

| Moduł | Plik | Opis |
|-------|------|------|
| DataManager | `js/data-manager.js` | CRUD dla wszystkich danych |
| GamificationManager | `js/gamification-manager.js` | 100+ osiągnięć |
| EngagementManager | `js/engagement-manager.js` | Streak, daily challenges |
| EventBus | `js/event-bus.js` | Reaktywność UI |
| AIAdvisor | `js/ai-advisor.js` | Porady finansowe |
| FamilyBalanceManager | `js/family-balance.js` | Cele + wartości rodzinne |
| FamilyUnityManager | `js/family-unity.js` | Role rodzinne, współpraca |
| AlertManager | `js/alert-manager.js` | Powiadomienia |
| PinManager | `js/pin-manager.js` | Zabezpieczenie PIN |
| RecurringManager | `js/recurring-manager.js` | Wydatki/przychody stałe |

---

## Modules

### DataManager (`js/data-manager.js`)

**Opis:** Główny manager danych. CRUD dla wydatków, przychodów, kategorii, celów. Sync z localStorage i repo JSON.

**Inicjalizacja:**
```javascript
const dataManager = new DataManager();
await dataManager.init();
```

**Expenses:**
| Metoda | Parametry | Zwraca |
|--------|-----------|--------|
| `getExpenses()` | - | `Expense[]` |
| `addExpense(expense)` | `{amount, category, description}` | `Expense` |
| `updateExpense(id, updates)` | `string, object` | `Expense` |
| `deleteExpense(id)` | `string` | `void` |

**Income:**
| Metoda | Parametry | Zwraca |
|--------|-----------|--------|
| `getIncome()` | - | `Income[]` |
| `addIncome(income)` | `{amount, source, description}` | `Income` |
| `deleteIncome(id)` | `string` | `void` |

**Income Sources:**
| Metoda | Parametry | Zwraca |
|--------|-----------|--------|
| `getIncomeSources()` | - | `Source[]` |
| `addIncomeSource(source)` | `{name, expectedAmount, owner}` | `Source` |
| `updateIncomeSource(id, updates)` | `string, object` | `Source` |
| `deleteIncomeSource(id)` | `string` | `void` |
| `recordPayment(sourceId, payment)` | `string, {amount, date}` | `Payment` |
| `getIncomeSourcesStatus(year, month)` | `number, number` | `Status[]` |
| `getMonthlyIncomeSummary(year, month)` | `number, number` | `Summary` |

**Categories:**
| Metoda | Parametry | Zwraca |
|--------|-----------|--------|
| `getCategories()` | - | `Category[]` |
| `getCustomCategories()` | - | `Category[]` |
| `addCategory(category)` | `{name, icon, budget}` | `Category` |

**Statistics:**
| Metoda | Parametry | Zwraca |
|--------|-----------|--------|
| `getMonthlyStats(year, month)` | `number, number` | `Stats` |
| `getTrend(months)` | `number` | `Trend[]` |
| `getAllAlerts()` | - | `Alert[]` |

---

### GamificationManager (`js/gamification-manager.js`)

**Opis:** System 100+ osiągnięć. Punkty, odznaki, kategorie.

**Statyczny - nie wymaga instancji.**

**Kluczowe:**
| Metoda | Opis |
|--------|------|
| `GamificationManager.ACHIEVEMENTS` | Obiekt z 100+ osiągnięciami |
| `getUnlockedAchievements()` | Odblokowane osiągnięcia |
| `checkAndUnlock(achievementId)` | Sprawdź i odblokuj |
| `getTotalPoints()` | Suma punktów |

**Kategorie osiągnięć:**
- `start` - Pierwsze kroki (10)
- `savings` - Oszczędności (20)
- `discipline` - Dyscyplina (15)
- `family` - Rodzina (15)
- `goals` - Cele (15)
- `secret` - Sekretne (10+)

---

### EngagementManager (`js/engagement-manager.js`)

**Opis:** System codziennego zaangażowania - streak, daily challenges, mnożniki.

**Streak:**
| Metoda | Opis |
|--------|------|
| `recordLogin()` | Zapisz dzisiejsze logowanie |
| `getCurrentStreak()` | Aktualny streak |
| `getMultiplier()` | Mnożnik punktów (1.0-10.0) |
| `freezeStreak(days)` | Zamroź streak (kosztuje punkty) |

**Daily Challenges:**
| Metoda | Opis |
|--------|------|
| `getTodaysChallenges()` | Dzisiejsze wyzwania |
| `checkChallenge(id)` | Sprawdź wykonanie |
| `getCompletedToday()` | Ukończone dziś |

**Konfiguracja:** `EngagementManager.STREAK_CONFIG`
- Mnożniki: 3d=1.2x, 7d=1.5x, 30d=2.5x, 365d=10x
- Milestones z bonusami

---

### EventBus (`js/event-bus.js`)

**Opis:** Reaktywność UI - eventy między modułami.

**Statyczny:**
```javascript
EventBus.on('expense:added', (data) => { ... });
EventBus.emit('expense:added', expense);
EventBus.once('data:changed', callback);
EventBus.off('expense:added');
```

**Dostępne eventy:**
- `expense:added/updated/deleted`
- `income:added/deleted`
- `achievement:unlocked`
- `streak:updated`
- `data:changed` (ogólny)

---

### AIAdvisor (`js/ai-advisor.js`)

**Opis:** Generuje szczere porady finansowe na przyszły miesiąc.

```javascript
const advisor = new AIAdvisor(dataManager);
const report = advisor.generateAdvice();
```

**Zwraca:**
```javascript
{
  summary: string,
  keyMessage: string,
  advice: Advice[],
  priorities: Priority[],
  warnings: Warning[],
  opportunities: Opportunity[],
  projections: Projection[]
}
```

---

### FamilyBalanceManager (`js/family-balance.js`)

**Opis:** Łączy cele finansowe z wartościami rodzinnymi. Motywacje dla męża i żony.

**Stałe:**
- `GOAL_MEANINGS` - Znaczenie każdego typu celu
- Dla każdego celu: `motivation.husband`, `motivation.wife`, `timeValue`

**Typy celów:** vacation, education, emergency, home, retirement, car, hobby

---

### FamilyUnityManager (`js/family-unity.js`)

**Opis:** System ról rodzinnych. Każdy wkład jest wartościowy.

**Stałe:**
- `ROLES` - Definicje ról (breadwinner, home_ceo, budget_guardian, etc.)
- Typy: financial, home, parenting, organizational

---

### AlertManager (`js/alert-manager.js`)

**Opis:** Zarządzanie alertami i powiadomieniami.

**Statyczny:**
| Metoda | Opis |
|--------|------|
| `getAlerts()` | Aktywne alerty |
| `getAlertsByType(type)` | Filtruj (danger/warning/success/info) |
| `hasCriticalAlerts()` | Czy są krytyczne? |
| `dismiss(alert)` | Ukryj do końca miesiąca |
| `getFormattedAlerts()` | Z ikonami i tytułami |

---

### PinManager (`js/pin-manager.js`)

**Opis:** Prosty system PIN (4 cyfry). Sesja 30 minut.

**Statyczny:**
| Metoda | Opis |
|--------|------|
| `setPin(pin)` | Ustaw PIN (4 cyfry) |
| `verify(pin)` | Sprawdź PIN |
| `isEnabled()` | Czy PIN aktywny? |
| `removePin()` | Usuń PIN |
| `requiresUnlock()` | Czy wymaga odblokowania? |
| `startSession()` | Rozpocznij sesję |
| `extendSession()` | Przedłuż sesję |

---

### RecurringManager (`js/recurring-manager.js`)

**Opis:** Wydatki i przychody stałe (miesięczne).

**Statyczny:**
| Metoda | Opis |
|--------|------|
| `processIfNeeded()` | Przetwórz jeśli nowy dzień |
| `getSummary()` | Podsumowanie stałych |
| `addRecurringExpense(data)` | Dodaj stały wydatek |
| `addRecurringIncome(data)` | Dodaj stały przychód |
| `getNextOccurrence(item)` | Następne wystąpienie |

---

## File Structure

```
FamilyGoals/
├── js/
│   ├── data-manager.js      # CRUD, localStorage, repo sync
│   ├── gamification-manager.js  # 100+ osiągnięć
│   ├── engagement-manager.js    # Streak, challenges
│   ├── event-bus.js         # Reaktywność
│   ├── ai-advisor.js        # Porady finansowe
│   ├── family-balance.js    # Cele + wartości
│   ├── family-unity.js      # Role rodzinne
│   ├── alert-manager.js     # Powiadomienia
│   ├── pin-manager.js       # Zabezpieczenie
│   ├── recurring-manager.js # Stałe wydatki
│   └── app.js               # Entry point, UI
├── data/
│   ├── config.json          # Konfiguracja
│   ├── inflation.json       # Dane inflacji
│   └── planned.json         # Planowane wydatki
├── css/
│   └── styles.css
└── index.html
```

---

## Integration

```
User Action
    ↓
app.js (UI) ←→ EventBus
    ↓
DataManager ←→ localStorage
    ↓
GamificationManager / EngagementManager
    ↓
AlertManager (sprawdza limity)
```

---

## Anti-Patterns (NIE RÓB)

- ❌ Nie pisz własnych funkcji CRUD - użyj `DataManager`
- ❌ Nie manipuluj localStorage bezpośrednio - użyj managerów
- ❌ Nie twórz nowych osiągnięć - dodaj do `ACHIEVEMENTS`
- ❌ Nie emituj eventów ręcznie - managery to robią
- ❌ Nie duplikuj logiki alertów - użyj `AlertManager`

---

## Changelog API

| Data | Moduł | Zmiana |
|------|-------|--------|
| 2025-12-28 | Initial | Utworzono CODEBASE.md |

---

> **Dla AI:** ZANIM napiszesz nowy kod, sprawdź ten dokument.
> Używaj istniejących modułów zamiast tworzyć duplikaty!
