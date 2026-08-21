/**
 * Data Manager - sync między repo JSON a localStorage
 */
class DataManager {
  static STORAGE_KEYS = {
    expenses: 'familygoals_expenses',
    income: 'familygoals_income',
    incomeSources: 'familygoals_income_sources',
    categories: 'familygoals_categories',
    settings: 'familygoals_settings',
    achievements: 'familygoals_achievements',
    lastSync: 'familygoals_last_sync',
    businessCosts: 'familygoals_business_costs',
    todos: 'familygoals_todos'
  };

  constructor() {
    this.config = null;
    this.inflation = null;
    this.planned = null;
    this.isOffline = !navigator.onLine;

    // In-memory cache to avoid repeated localStorage parsing (P1-P3)
    this._cache = {};
    this._cacheValid = {};

    window.addEventListener('online', () => this.isOffline = false);
    window.addEventListener('offline', () => this.isOffline = true);
  }

  /**
   * Get data from cache or localStorage
   * @param {string} key - Storage key
   * @param {*} fallback - Default value
   * @returns {*} Cached or parsed data
   */
  _getCached(key, fallback = []) {
    if (this._cacheValid[key] && this._cache[key] !== undefined) {
      return this._cache[key];
    }
    const data = localStorage.getItem(key);
    this._cache[key] = this._safeJsonParse(data, fallback);
    this._cacheValid[key] = true;
    return this._cache[key];
  }

  /**
   * Save data to localStorage and update cache
   * @param {string} key - Storage key
   * @param {*} data - Data to save
   */
  _setCached(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    this._cache[key] = data;
    this._cacheValid[key] = true;
  }

  /**
   * Invalidate cache for a key
   * @param {string} key - Storage key
   */
  _invalidateCache(key) {
    this._cacheValid[key] = false;
  }

  /**
   * Invalidate all cache
   */
  _invalidateAllCache() {
    this._cacheValid = {};
  }

  /**
   * Safe JSON parse with fallback
   */
  _safeJsonParse(data, fallback = []) {
    if (!data) return fallback;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('JSON parse error:', e);
      return fallback;
    }
  }

  /**
   * Inicjalizacja - ładuje dane z repo i localStorage
   */
  async init() {
    try {
      await this._loadRepoData();
    } catch (e) {
      // W APK (file://) fetch lokalnych JSON-ów nie działa z definicji —
      // cache/defaulty to normalna ścieżka, nie ostrzeżenie
      if (typeof location === 'undefined' || location.protocol !== 'file:') {
        console.warn('Nie udało się pobrać danych z repo, używam cache');
      }
    }
    return this._mergeData();
  }

  /**
   * Pobierz dane z repo JSON
   */
  async _loadRepoData() {
    const baseUrl = this._getBaseUrl();

    const [configRes, inflationRes, plannedRes] = await Promise.all([
      fetch(`${baseUrl}/data/config.json`),
      fetch(`${baseUrl}/data/inflation.json`),
      fetch(`${baseUrl}/data/planned.json`)
    ]);

    if (configRes.ok) {
      this.config = await configRes.json();
      localStorage.setItem('familygoals_config_cache', JSON.stringify(this.config));
    }
    if (inflationRes.ok) {
      this.inflation = await inflationRes.json();
      localStorage.setItem('familygoals_inflation_cache', JSON.stringify(this.inflation));
    }
    if (plannedRes.ok) {
      this.planned = await plannedRes.json();
      localStorage.setItem('familygoals_planned_cache', JSON.stringify(this.planned));
    }

    localStorage.setItem(this.constructor.STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  /**
   * Połącz dane repo z localStorage
   */
  _mergeData() {
    // Użyj cache jeśli brak danych z repo
    if (!this.config) {
      const cached = localStorage.getItem('familygoals_config_cache');
      this.config = this._safeJsonParse(cached, this._getDefaultConfig());
    }
    if (!this.inflation) {
      const cached = localStorage.getItem('familygoals_inflation_cache');
      this.inflation = this._safeJsonParse(cached, null);
    }
    if (!this.planned) {
      const cached = localStorage.getItem('familygoals_planned_cache');
      this.planned = this._safeJsonParse(cached, { plannedExpenses: [] });
    }

    return {
      config: this.config,
      inflation: this.inflation,
      planned: this.planned,
      expenses: this.getExpenses(),
      income: this.getIncome(),
      customCategories: this.getCustomCategories()
    };
  }

  _getBaseUrl() {
    // GitHub Pages lub localhost
    const { origin, pathname } = window.location;
    return pathname.includes('FamilyGoals')
      ? `${origin}${pathname.split('FamilyGoals')[0]}FamilyGoals`
      : origin;
  }

  _getDefaultConfig() {
    return {
      version: '1.0.0',
      currency: 'PLN',
      locale: 'pl-PL',
      goals: { monthlySavingsTarget: 2000 },
      categories: [],
      fixedExpenses: []
    };
  }

  // === EXPENSES ===

  getExpenses() {
    return this._getCached(this.constructor.STORAGE_KEYS.expenses, []);
  }

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      date: new Date().toISOString(),
      ...expense
    };
    // OWN-8: spread mógł nadpisać datę wartością undefined/pustą
    if (!newExpense.date) newExpense.date = new Date().toISOString();
    if (!newExpense.createdAt) newExpense.createdAt = new Date().toISOString();
    expenses.push(newExpense);
    this._saveExpenses(expenses);
    return newExpense;
  }

  updateExpense(id, updates) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates };
      this._saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  }

  deleteExpense(id) {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this._saveExpenses(filtered);
  }

  _saveExpenses(expenses) {
    this._setCached(this.constructor.STORAGE_KEYS.expenses, expenses);
  }

  /**
   * Wpisy wydatków do historii: jednorazowe pod swoją datą + naliczenia
   * miesięczne wydatków STAŁYCH w zakresie od–do.
   *
   * Model jak korzyści firmowe: w bazie siedzi JEDNA definicja stałego
   * wydatku, a naliczenia liczone są w locie. Dzięki temu (a) sync nie mnoży
   * duplikatów, gdy telefon Kamila i APK Żony naliczą ten sam miesiąc offline,
   * (b) edycja kwoty poprawia całą historię, (c) widać też miesiące sprzed
   * dodania wpisu (zakres od–do), czego materializacja nie daje.
   *
   * Zero fabrykacji wstecz: stały bez activeFrom startuje od miesiąca dodania,
   * i nigdy nie nalicza w przyszłość (koniec = bieżący miesiąc).
   */
  getExpenseEntries() {
    const now = new Date();
    const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const entries = [];

    this.getExpenses().forEach(e => {
      // Wydatki są WSPÓLNE (decyzja Kamila 2026-07-28) — żadnego właściciela,
      // nawet gdy stary rekord jeszcze niesie pole `owner`.
      const base = {
        expenseId: e.id,
        amount: e.amount || 0,
        categoryId: e.categoryId || 'other',
        description: e.description || ''
      };

      if (e.isRecurring) {
        const startYM = e.activeFrom || String(e.createdAt || e.date || '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(startYM)) return;
        const endYM = e.activeTo && e.activeTo < nowYM ? e.activeTo : nowYM;
        let [y, m] = startYM.split('-').map(Number);
        let guard = 0;
        while (guard++ < 600) {
          const ym = `${y}-${String(m).padStart(2, '0')}`;
          if (ym > endYM) break;
          entries.push({ ...base, date: `${ym}-01`, isAccrual: true });
          m++; if (m > 12) { m = 1; y++; }
        }
      } else {
        const date = String(e.date || '').slice(0, 10);
        if (!date) return;
        entries.push({ ...base, date, isAccrual: false });
      }
    });

    return entries;
  }

  /**
   * Podsumowanie wydatków miesiąca (karta „Wasze wydatki" — WYŁĄCZNIE
   * informacyjne, nie wchodzi w wyliczenia przychodów; decyzja Kamila).
   * `items` = składniki do okienka „skąd ta kwota", `byCategory` posortowane
   * malejąco (na co idzie najwięcej).
   */
  getMonthExpensesSummary(year, month) {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    const items = this.getExpenseEntries().filter(e => e.date.slice(0, 7) === ym);

    let recurring = 0, oneoff = 0;
    const cats = {};
    items.forEach(e => {
      if (e.isAccrual) recurring += e.amount; else oneoff += e.amount;
      cats[e.categoryId] = (cats[e.categoryId] || 0) + e.amount;
    });

    const byCategory = Object.keys(cats)
      .map(categoryId => ({ categoryId, amount: cats[categoryId] }))
      .sort((a, b) => b.amount - a.amount);

    return {
      recurring,
      oneoff,
      total: recurring + oneoff,
      items: items.slice().sort((a, b) => b.amount - a.amount),
      byCategory
    };
  }

  // === INCOME ===

  getIncome() {
    return this._getCached(this.constructor.STORAGE_KEYS.income, []);
  }

  addIncome(income) {
    const incomes = this.getIncome();
    const newIncome = {
      id: this._generateId(),
      date: new Date().toISOString(),
      ...income
    };
    // OWN-8: spread mógł nadpisać datę wartością undefined/pustą
    if (!newIncome.date) newIncome.date = new Date().toISOString();
    incomes.push(newIncome);
    this._setCached(this.constructor.STORAGE_KEYS.income, incomes);
    return newIncome;
  }

  deleteIncome(id) {
    const incomes = this.getIncome();
    const filtered = incomes.filter(i => i.id !== id);
    this._setCached(this.constructor.STORAGE_KEYS.income, filtered);
  }

  // === INCOME SOURCES (Źródła przychodów) ===

  /**
   * Pobierz wszystkie źródła przychodów
   */
  getIncomeSources() {
    return this._getCached(this.constructor.STORAGE_KEYS.incomeSources, []);
  }

  /**
   * Dodaj nowe źródło przychodu
   * @param {Object} source - {name, expectedAmount, frequency, owner, icon, color}
   */
  addIncomeSource(source) {
    const sources = this.getIncomeSources();
    const newSource = {
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      isActive: true,
      payments: [], // historia wpłat
      ...source
    };
    sources.push(newSource);
    this._saveIncomeSources(sources);
    return newSource;
  }

  /**
   * Edytuj źródło przychodu
   */
  updateIncomeSource(id, updates) {
    const sources = this.getIncomeSources();
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) return null;
    sources[index] = { ...sources[index], ...updates };
    this._saveIncomeSources(sources);
    return sources[index];
  }

  /**
   * Usuń źródło przychodu
   */
  deleteIncomeSource(id) {
    const sources = this.getIncomeSources();
    const removed = sources.find(s => s.id === id);
    this._saveIncomeSources(sources.filter(s => s.id !== id));
    // B-M1c: lustra wpłat źródła w income[] muszą zniknąć razem z nim —
    // inaczej skasowane źródło dalej zawyża statystyki (widmowe przychody)
    if (removed && removed.payments && removed.payments.length) {
      removed.payments.forEach(p => this._removePaymentMirror(id, p));
    }
  }

  /**
   * Oznacz wpłatę ze źródła
   * @param {string} sourceId - ID źródła
   * @param {Object} payment - {amount, date, note}
   */
  recordPayment(sourceId, payment) {
    const sources = this.getIncomeSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source) return null;

    const newPayment = {
      id: this._generateId(),
      recordedAt: new Date().toISOString(),
      date: payment.date || new Date().toISOString(),
      amount: payment.amount,
      note: payment.note || '',
      type: payment.type || 'transfer' // 'transfer' lub 'cash'
    };
    // Bez własnej nazwy: etykieta "{źródło} za {miesiąc rok}" z daty wpłaty
    // (decyzja Kamila 2026-07-26 — jednolicie dla wszystkich wpłat)
    if (!newPayment.note && typeof FGUtils !== 'undefined' && FGUtils.MONTHS) {
      const d = new Date(newPayment.date);
      newPayment.note = `${source.name} za ${FGUtils.MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
    }

    source.payments = source.payments || [];
    source.payments.push(newPayment);
    this._saveIncomeSources(sources);

    // Lustrzany wpis w ogólnych przychodach — paymentId pozwala go
    // usunąć razem z wpłatą (B-M1), data z fallbackiem jak w newPayment (OWN-8)
    this.addIncome({
      amount: payment.amount,
      source: source.name,
      sourceId: sourceId,
      paymentId: newPayment.id,
      description: newPayment.note,
      date: newPayment.date
    });

    // Jak updatePayment/deletePayment — bez emitu sync nie wiedział
    // o nowej wpłacie aż do zegara (zgubione 4000, 2026-08-21)
    if (typeof EventBus !== 'undefined') EventBus.emit('income:updated');
    return newPayment;
  }

  /**
   * Pobierz wpłaty ze źródła w danym miesiącu
   */
  getPaymentsByMonth(sourceId, year, month) {
    const source = this.getIncomeSources().find(s => s.id === sourceId);
    if (!source) return [];

    return (source.payments || []).filter(p => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  /**
   * Usuń płatności ze źródła w danym miesiącu
   */
  clearPaymentsForMonth(sourceId, year, month) {
    const sources = this.getIncomeSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source || !source.payments) return;

    const removed = source.payments.filter(p => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    source.payments = source.payments.filter(p => {
      const d = new Date(p.date);
      return !(d.getFullYear() === year && d.getMonth() === month);
    });

    this._saveIncomeSources(sources);
    removed.forEach(p => this._removePaymentMirror(sourceId, p));
    if (typeof EventBus !== 'undefined') EventBus.emit('income:updated');
  }

  /**
   * Usuń pojedynczą płatność
   */
  /**
   * Edycja wpłaty (kwota/data/nazwa) + aktualizacja lustra w income.
   * Lustro po paymentId; legacy (bez paymentId) po sourceId+data+kwota —
   * dopasowanie na STARYCH wartościach, przed podmianą pól (jak B-M1).
   */
  updatePayment(sourceId, paymentId, updates) {
    const sources = this.getIncomeSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source || !source.payments) return null;
    const payment = source.payments.find(p => p.id === paymentId);
    if (!payment) return null;

    const incomes = this.getIncome();
    let mirror = incomes.find(i => i.paymentId === paymentId);
    if (!mirror) {
      mirror = incomes.find(i =>
        !i.paymentId && i.sourceId === sourceId &&
        i.date === payment.date && i.amount === payment.amount
      );
    }

    if (updates.amount !== undefined) payment.amount = updates.amount;
    if (updates.date !== undefined) payment.date = updates.date;
    if (updates.note !== undefined) payment.note = updates.note;
    this._saveIncomeSources(sources);

    if (mirror) {
      if (updates.amount !== undefined) mirror.amount = updates.amount;
      if (updates.date !== undefined) mirror.date = updates.date;
      if (updates.note !== undefined) mirror.description = updates.note;
      if (!mirror.paymentId) mirror.paymentId = paymentId;
      this._setCached(this.constructor.STORAGE_KEYS.income, incomes);
    }

    if (typeof EventBus !== 'undefined') EventBus.emit('income:updated');
    return payment;
  }

  deletePayment(sourceId, paymentId) {
    const sources = this.getIncomeSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source || !source.payments) return false;

    const idx = source.payments.findIndex(p => p.id === paymentId);
    if (idx === -1) return false;

    const [removed] = source.payments.splice(idx, 1);
    // Tombstone kasowania — bez niego unia płatności na backendzie
    // (mergeSourcePayments_, incydent 2026-08-21) przywróciłaby wpłatę
    source.deletedPaymentIds = (source.deletedPaymentIds || []).concat(String(paymentId));
    this._saveIncomeSources(sources);
    this._removePaymentMirror(sourceId, removed);
    if (typeof EventBus !== 'undefined') EventBus.emit('income:updated');
    return true;
  }

  /**
   * B-M1: usuń lustrzany wpis wpłaty z ogólnej tablicy income.
   * Nowe mirrory mają paymentId; stare (legacy) dopasowujemy po
   * sourceId + data + kwota, żeby nie zostawić widmowego przychodu.
   */
  _removePaymentMirror(sourceId, payment) {
    if (!payment) return;
    const incomes = this.getIncome();
    let idx = incomes.findIndex(i => i.paymentId === payment.id);
    if (idx === -1) {
      idx = incomes.findIndex(i =>
        !i.paymentId && i.sourceId === sourceId &&
        i.date === payment.date && i.amount === payment.amount
      );
    }
    if (idx !== -1) {
      incomes.splice(idx, 1);
      this._setCached(this.constructor.STORAGE_KEYS.income, incomes);
    }
  }

  /**
   * Status źródeł w danym miesiącu
   */
  getIncomeSourcesStatus(year, month) {
    const currentForMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    const sources = this.getIncomeSources().filter(s => {
      if (!s.isActive) return false;
      // Jednorazowe źródła pokazuj tylko w ich miesiącu
      if (s.incomeType === 'oneoff' && s.forMonth && s.forMonth !== currentForMonth) {
        return false;
      }
      // Cykliczne: zakres obowiązywania od–do (YYYY-MM, stringi porównywalne
      // leksykalnie; brak pola = bez ograniczenia). Umożliwia uzupełnianie
      // historii wstecz i wygaszanie źródeł bez ich kasowania.
      if (s.incomeType !== 'oneoff') {
        if (s.activeFrom && currentForMonth < s.activeFrom) return false;
        if (s.activeTo && currentForMonth > s.activeTo) return false;
      }
      return true;
    });

    return sources.map(source => {
      const payments = this.getPaymentsByMonth(source.id, year, month);
      const expected = source.expectedAmount || 0;
      // MODEL PULI (opt-in przez activeFrom): wszystkie wpłaty źródła
      // sumują się jak saldo i pokrywają KOLEJNE miesiące od activeFrom
      // po expected/mies. — nadpłata idzie w przód, jedna wpłata potrafi
      // uzupełnić historię wstecz. Bez activeFrom: klasycznie po dacie.
      const pooled = this._allocatedForMonth(source, year, month);
      const totalReceived = pooled !== null
        ? pooled
        : payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...source,
        paymentsThisMonth: payments,
        totalReceived,
        expected,
        percentReceived: expected > 0 ? Math.round((totalReceived / expected) * 100) : 0,
        status: totalReceived >= expected ? 'complete' :
                totalReceived > 0 ? 'partial' : 'pending',
        remaining: Math.max(0, expected - totalReceived)
      };
    });
  }

  /**
   * Alokacja z puli dla miesiąca (null = źródło nie działa w modelu puli).
   * idx = numer miesiąca licząc od activeFrom; miesiąc dostaje to, co
   * zostało z sumy wszystkich wpłat po pokryciu wcześniejszych miesięcy.
   */
  _allocatedForMonth(source, year, month) {
    if (source.incomeType === 'oneoff') return null;
    const expected = source.expectedAmount || 0;
    if (!source.activeFrom || expected <= 0) return null;
    const currentForMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (source.activeTo && currentForMonth > source.activeTo) return 0;
    const [ay, am] = source.activeFrom.split('-').map(Number);
    const idx = (year - ay) * 12 + (month - (am - 1));
    if (idx < 0) return 0;
    const totalPaid = (source.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    return Math.max(0, Math.min(expected, totalPaid - expected * idx));
  }

  /**
   * Podsumowanie wszystkich źródeł w miesiącu
   */
  getMonthlyIncomeSummary(year, month) {
    const statuses = this.getIncomeSourcesStatus(year, month);

    const totalExpected = statuses.reduce((sum, s) => sum + s.expected, 0);
    const totalReceived = statuses.reduce((sum, s) => sum + s.totalReceived, 0);

    return {
      sources: statuses,
      totalExpected,
      totalReceived,
      percentReceived: totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0,
      completeCount: statuses.filter(s => s.status === 'complete').length,
      partialCount: statuses.filter(s => s.status === 'partial').length,
      pendingCount: statuses.filter(s => s.status === 'pending').length
    };
  }

  _saveIncomeSources(sources) {
    this._setCached(this.constructor.STORAGE_KEYS.incomeSources, sources);
  }

  // === CATEGORIES ===

  getCategories() {
    const defaults = this.config?.categories || [];
    const custom = this.getCustomCategories('expense');
    return [...defaults, ...custom];
  }

  /**
   * Własne kategorie; kind = 'income' | 'expense' (opcjonalny filtr).
   * Legacy wpisy bez `kind` = wydatkowe (dotychczasowa semantyka modala).
   */
  getCustomCategories(kind) {
    const all = this._getCached(this.constructor.STORAGE_KEYS.categories, []);
    if (!kind) return all;
    return all.filter(c => (c.kind || 'expense') === kind);
  }

  addCategory(category) {
    const categories = this.getCustomCategories();
    const newCategory = {
      id: this._generateId(),
      isCustom: true,
      ...category
    };
    categories.push(newCategory);
    this._setCached(this.constructor.STORAGE_KEYS.categories, categories);
    return newCategory;
  }

  updateCategory(id, updates) {
    const categories = this.getCustomCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      this._setCached(this.constructor.STORAGE_KEYS.categories, categories);
      return categories[index];
    }
    return null;
  }

  deleteCategory(id) {
    const categories = this.getCustomCategories();
    const filtered = categories.filter(c => c.id !== id);
    this._setCached(this.constructor.STORAGE_KEYS.categories, filtered);
  }

  // === FILTERED GETTERS ===

  getExpensesByMonth(year, month) {
    return this.getExpenses().filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  getIncomeByMonth(year, month) {
    return this.getIncome().filter(i => {
      const d = new Date(i.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  // === STATS ===

  /**
   * Cel oszczędzania = suma z REALNYCH celów usera (jak kafel "Do odłożenia").
   * Bez celów: 0 — koniec widma 2000 z config.json.
   */
  getMonthlySavingsTarget() {
    return this.getPlannedExpenses().reduce((sum, g) => {
      if (g.monthlyContribution) return sum + g.monthlyContribution;
      if (g.targetAmount && g.targetDate) {
        return sum + this.calculateRequiredMonthlySavings(g.targetAmount, g.currentAmount || 0, g.targetDate);
      }
      return sum;
    }, 0);
  }

  getMonthlyStats(year, month) {
    const expenses = this.getExpensesByMonth(year, month);

    // Wyrównanie 2026-07-25 (2700 vs 3600): "odłożone" = DOKŁADNIE ta sama
    // formuła co karta "Wasze przychody" — summary (model puli) + korzyści
    // firmowe. NIE lustra income[] (bywały niekompletne, korzyści ich nie mają)
    const summary = this.getMonthlyIncomeSummary(year, month);
    const totalIncome = (summary.totalReceived || 0) + this.calculateBusinessSavings(year, month);
    let incomeCount = 0;
    this.getIncomeSources().forEach(s => {
      (s.payments || []).forEach(p => {
        const d = new Date(p.date);
        if (d.getFullYear() === year && d.getMonth() === month) incomeCount++;
      });
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const savings = totalIncome - totalExpenses;

    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
    });

    return {
      totalExpenses,
      totalIncome,
      savings,
      savingsTarget: this.getMonthlySavingsTarget(),
      byCategory,
      expenseCount: expenses.length,
      incomeCount
    };
  }

  getYearlyStats(year) {
    const expenses = this.getExpenses().filter(e =>
      new Date(e.date).getFullYear() === year
    );
    const income = this.getIncome().filter(i =>
      new Date(i.date).getFullYear() === year
    );

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);

    const byMonth = {};
    for (let m = 0; m < 12; m++) {
      byMonth[m] = this.getMonthlyStats(year, m);
    }

    return {
      totalExpenses,
      totalIncome,
      savings: totalIncome - totalExpenses,
      byMonth
    };
  }

  getCategoryStats(categoryId, year = null, month = null) {
    let expenses = this.getExpenses().filter(e => e.categoryId === categoryId);

    if (year !== null) {
      expenses = expenses.filter(e => new Date(e.date).getFullYear() === year);
    }
    if (month !== null) {
      expenses = expenses.filter(e => new Date(e.date).getMonth() === month);
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const category = this.getCategories().find(c => c.id === categoryId);
    const budget = category?.budget || 0;

    return {
      categoryId,
      categoryName: category?.name || 'Nieznana',
      total,
      budget,
      percentUsed: budget > 0 ? (total / budget) * 100 : 0,
      count: expenses.length,
      expenses
    };
  }

  getTrend(months = 6) {
    const now = new Date();
    const trend = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stats = this.getMonthlyStats(d.getFullYear(), d.getMonth());
      trend.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        monthName: d.toLocaleDateString('pl-PL', { month: 'short' }),
        ...stats
      });
    }

    return trend;
  }

  /**
   * Pobierz trend zarobków z podziałem na osoby (żona/mąż)
   */
  getTrendByOwner(months = 6) {
    const now = new Date();
    // Okna kończą się na ostatnim ZAMKNIĘTYM miesiącu (zgłoszenie Kamila
    // 2026-08-21): pieniądze za trwający miesiąc przychodzą dopiero
    // w kolejnym, więc bieżący punkt wyglądał jak załamanie przychodów.
    // Dotyczy wykresu i legendy Śr. 12M (getYearOverYear); projekcja karty
    // przychodów celowo zostaje przy oknie z bieżącym miesiącem.
    const end = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sources = this.getIncomeSources();

    // 'auto': okno od najwcześniejszych danych (activeFrom / forMonth /
    // pierwsza wpłata) do ostatniego zamkniętego miesiąca — cała historia
    if (months === 'auto') {
      let earliest = null;
      const note = (ym) => { if (ym && (!earliest || ym < earliest)) earliest = ym; };
      sources.forEach(s => {
        note(s.activeFrom);
        note(s.forMonth);
        (s.payments || []).forEach(p => {
          if (p.date) note(String(p.date).slice(0, 7));
        });
      });
      // Korzyści firmowe też rozciągają okno (np. zakup z 2023)
      this.getBusinessCosts().forEach(c => {
        note(c.activeFrom);
        if (c.lastPurchaseDate) note(String(c.lastPurchaseDate).slice(0, 7));
      });
      // Wydatki tak samo — inaczej czynsz wpisany wstecz nie miałby gdzie się
      // narysować (linia czerwona zaczynałaby się dopiero od okna przychodów)
      this.getExpenseEntries().forEach(e => note(e.date.slice(0, 7)));

      if (earliest) {
        const [ey, em] = earliest.split('-').map(Number);
        const span = (end.getFullYear() - ey) * 12 + (end.getMonth() - (em - 1)) + 1;
        months = Math.min(48, Math.max(6, span));
      } else {
        months = 6;
      }
    }

    const trend = [];

    // Wydatki (wspólne) pogrupowane po miesiącu — trzecia, czerwona linia.
    // Liczone RAZ przed pętlą: getExpenseEntries rozwija naliczenia stałych.
    const expensesByYm = {};
    this.getExpenseEntries().forEach(e => {
      const ym = e.date.slice(0, 7);
      expensesByYm[ym] = (expensesByYm[ym] || 0) + e.amount;
    });

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();

      let wifeIncome = 0;
      let husbandIncome = 0;

      // Wykres = FAKTYCZNE wpłaty wg daty zaksięgowania (decyzja Kamila
      // 2026-07-25: prawda kasowa, bez wygładzania). Alokacja z puli
      // (_allocatedForMonth) służy statusom/oczekiwanym na ekranie Przychody.
      sources.forEach(source => {
        const total = (source.payments || []).filter(p => {
          const d = new Date(p.date);
          return d.getFullYear() === year && d.getMonth() === month;
        }).reduce((sum, p) => sum + p.amount, 0);
        if (source.owner === 'wife') {
          wifeIncome += total;
        } else if (source.owner === 'husband') {
          husbandIncome += total;
        }
      });

      // Korzyści firmowe = przychód Męża (firma Męża — decyzja Kamila
      // 2026-07-25): jednorazowe w miesiącu realizacji, cykliczne jako
      // naliczenie miesięczne w zakresie od–do
      husbandIncome += this.calculateBusinessSavings(year, month);

      // B-M5: miesiące bez wpłat pokazują 0 — bez fabrykowania historii
      // z expectedAmount (fałszowało wykres, także wstecz przed
      // istnieniem źródła)

      trend.push({
        year,
        month,
        monthName: d.toLocaleDateString('pl-PL', { month: 'short' }),
        wifeIncome,
        husbandIncome,
        totalIncome: wifeIncome + husbandIncome,
        // Osobna linia — wydatki CELOWO nie pomniejszają przychodów
        expenses: expensesByYm[`${year}-${String(month + 1).padStart(2, '0')}`] || 0
      });
    }

    return trend;
  }

  /**
   * Początek REGULARNEGO śledzenia zarobków: pierwsza wpłata źródła albo
   * start cyklicznej korzyści. Jednorazowe korzyści (np. zakup z 2023)
   * celowo NIE otwierają okna — pojedynczy punkt sprzed śledzenia
   * rozwadniałby średnie zerami z nieśledzonych miesięcy.
   */
  _earliestRegularIncomeYM() {
    let earliest = null;
    const note = (ym) => { if (ym && (!earliest || ym < earliest)) earliest = ym; };
    this.getIncomeSources().forEach(s => {
      (s.payments || []).forEach(p => { if (p.date) note(String(p.date).slice(0, 7)); });
    });
    this.getBusinessCosts().forEach(c => {
      if (c.isRecurring && c.recurringMonths > 0) {
        note(c.activeFrom || String(c.createdAt || '').slice(0, 7));
      }
    });
    return earliest;
  }

  /**
   * Średnia miesięczna z ostatnich 12 mies. + % zmiany vs poprzednie 12 mies.
   * (mies. 13–24 wstecz), per Żona/Mąż/Razem. Dane jak na wykresie: wpłaty
   * wg dat + korzyści firmowe u Męża. Średnia = suma / liczba miesięcy OD
   * początku śledzenia w danym oknie; okno bez danych → yoy null.
   */
  getYearOverYear() {
    const t = this.getTrendByOwner(24);
    const prev = t.slice(0, 12);
    const last = t.slice(12);
    const firstYM = this._earliestRegularIncomeYM();
    const ymOf = (e) => `${e.year}-${String(e.month + 1).padStart(2, '0')}`;
    const effective = (win) => firstYM ? win.filter(e => ymOf(e) >= firstYM).length : 0;
    const effLast = effective(last);
    const effPrev = effective(prev);

    const mk = (key) => {
      const sumLast = last.reduce((s, e) => s + (e[key] || 0), 0);
      const sumPrev = prev.reduce((s, e) => s + (e[key] || 0), 0);
      const avgLast = effLast > 0 ? sumLast / effLast : 0;
      const avgPrev = effPrev > 0 ? sumPrev / effPrev : null;
      const yoy = (avgPrev !== null && avgPrev > 0)
        ? Math.round(((avgLast - avgPrev) / avgPrev) * 100)
        : null;
      return { avg: Math.round(avgLast), yoy };
    };

    return {
      wife: mk('wifeIncome'),
      husband: mk('husbandIncome'),
      total: mk('totalIncome'),
      monthsCompared: { last: effLast, prev: effPrev }
    };
  }

  /**
   * Projekcja "ile realnie daje" (karta Wasze przychody, kolumna "/"):
   * osoby: założenia cykliczne (wybrany miesiąc) + średnia 12-mies. NADWYŻEK
   * wpłat kasowych ponad założenia (obejmuje źródła jednorazowe i nadpłaty;
   * niedopłaty nie dają ujemnych nadwyżek). Korzyści: cykliczne naliczenia
   * bieżące + średnia 12-mies. korzyści jednorazowych. Okno od pierwszego
   * regularnego śledzenia (bez rozwadniania zerami sprzed danych).
   */
  getIncomeProjection(year, month) {
    const ymView = `${year}-${String(month + 1).padStart(2, '0')}`;
    const sources = this.getIncomeSources();

    const recurringExpectedFor = (owner, ym) => sources
      .filter(s => s.isActive && s.owner === owner && s.incomeType !== 'oneoff')
      .filter(s => !(s.activeFrom && ym < s.activeFrom) && !(s.activeTo && ym > s.activeTo))
      .reduce((sum, s) => sum + (s.expectedAmount || 0), 0);

    // Okno: ostatnie 12 miesięcy od dziś
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    }
    const firstYM = this._earliestRegularIncomeYM();
    const effMonths = firstYM ? months.filter(mm => mm.ym >= firstYM) : [];
    const eff = effMonths.length;

    const person = (owner) => {
      const recurringExpected = recurringExpectedFor(owner, ymView);
      // Składniki do okienka "jak to policzone"
      const recurringSources = sources
        .filter(s => s.isActive && s.owner === owner && s.incomeType !== 'oneoff')
        .filter(s => !(s.activeFrom && ymView < s.activeFrom) && !(s.activeTo && ymView > s.activeTo))
        .map(s => ({ name: s.name, icon: s.icon || '💵', expected: s.expectedAmount || 0 }));
      const oneoffPayments = [];
      sources.filter(s => s.owner === owner && s.incomeType === 'oneoff').forEach(s => {
        (s.payments || []).forEach(p => {
          const d = new Date(p.date);
          if (effMonths.some(mm => mm.y === d.getFullYear() && mm.m === d.getMonth())) {
            oneoffPayments.push({ name: p.note && p.note !== 'import z arkusza' ? `${s.name}: ${p.note}` : s.name, icon: s.icon || '💵', amount: p.amount || 0, ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
          }
        });
      });
      if (eff === 0) return { recurringExpected, extrasAvg: 0, projected: recurringExpected, recurringSources, oneoffPayments, extrasMonths: [], extrasSum: 0 };
      let extrasSum = 0;
      const extrasMonths = []; // nadwyżki per miesiąc — sumują się do extrasSum
      effMonths.forEach(mm => {
        let cash = 0;
        sources.filter(s => s.owner === owner).forEach(s => {
          (s.payments || []).forEach(p => {
            const d = new Date(p.date);
            if (d.getFullYear() === mm.y && d.getMonth() === mm.m) cash += p.amount || 0;
          });
        });
        const extra = Math.max(0, cash - recurringExpectedFor(owner, mm.ym));
        if (extra > 0) extrasMonths.push({ ym: mm.ym, amount: extra });
        extrasSum += extra;
      });
      const extrasAvg = Math.round(extrasSum / eff);
      return { recurringExpected, extrasAvg, projected: recurringExpected + extrasAvg, recurringSources, oneoffPayments, extrasMonths, extrasSum };
    };

    // Korzyści: cykliczne naliczenia aktywne w oglądanym miesiącu (+ listy)
    const recurringItems = [];
    this.getBusinessCosts().forEach(c => {
      if (!(c.isRecurring && c.recurringMonths > 0)) return;
      const startYM = c.activeFrom || String(c.createdAt || '').slice(0, 7);
      if (startYM && ymView < startYM) return;
      if (c.activeTo && ymView > c.activeTo) return;
      recurringItems.push({ name: c.name, category: c.category, monthly: Math.round(c.amount / c.recurringMonths) });
    });
    const recurringMonthly = recurringItems.reduce((sum, it) => sum + it.monthly, 0);
    const oneoffItems = [];
    if (eff > 0) {
      this.getBusinessCosts().forEach(c => {
        if (c.isRecurring || !c.lastPurchaseDate) return;
        const d = new Date(c.lastPurchaseDate);
        if (effMonths.some(mm => mm.y === d.getFullYear() && mm.m === d.getMonth())) {
          oneoffItems.push({ name: c.name, category: c.category, amount: c.amount || 0 });
        }
      });
    }
    const oneoffSum = oneoffItems.reduce((sum, it) => sum + it.amount, 0);
    const oneoffAvg = eff > 0 ? Math.round(oneoffSum / eff) : 0;

    return {
      wife: person('wife'),
      husband: person('husband'),
      business: { recurringMonthly, oneoffAvg, projected: recurringMonthly + oneoffAvg, recurringItems, oneoffItems, oneoffSum, effMonths: eff }
    };
  }

  // === RECURRING ===

  getRecurringExpenses() {
    return this.getExpenses().filter(e => e.isRecurring);
  }

  getRecurringIncome() {
    return this.getIncome().filter(i => i.isRecurring);
  }

  processRecurring() {
    const today = new Date();
    const day = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();
    const processed = [];

    // B-M4: dzień naliczenia przycięty do długości miesiąca (29-31 działa
    // w krótkich miesiącach), a warunek >= dogania pominięte dni w miesiącu.
    // Idempotencję per miesiąc zapewnia check recurringSourceId poniżej.
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dueDate = (recurringDay) => {
      const effDay = Math.min(recurringDay || 1, daysInMonth);
      return { due: day >= effDay, date: new Date(year, month, effDay).toISOString() };
    };

    // Process recurring expenses
    this.getRecurringExpenses().forEach(exp => {
      const { due, date } = dueDate(exp.recurringDay);
      if (due) {
        // Check if already added this month
        const exists = this.getExpensesByMonth(year, month).some(e =>
          e.recurringSourceId === exp.id
        );
        if (!exists) {
          const newExp = this.addExpense({
            amount: exp.amount,
            categoryId: exp.categoryId,
            description: exp.description || 'Wydatek stały',
            isRecurring: false,
            recurringSourceId: exp.id,
            date
          });
          processed.push(newExp);
        }
      }
    });

    // Process recurring income
    this.getRecurringIncome().forEach(inc => {
      const { due, date } = dueDate(inc.recurringDay);
      if (due) {
        const exists = this.getIncomeByMonth(year, month).some(i =>
          i.recurringSourceId === inc.id
        );
        if (!exists) {
          const newInc = this.addIncome({
            amount: inc.amount,
            source: inc.source,
            description: inc.description || 'Przychód stały',
            isRecurring: false,
            recurringSourceId: inc.id,
            date
          });
          processed.push(newInc);
        }
      }
    });

    return processed;
  }

  // === PLANNED EXPENSES (GOALS) ===

  getPlannedExpenses() {
    // TYLKO realne dane usera (override; demo też pisze override przy seedzie).
    // Fallback do pliku data/planned.json USUNIĘTY (2026-07-25): domyślne cele
    // demo świeciły jako widmowe „Do odłożenia" mimo braku celów i były
    // zatrzaskiwane do danych przy pierwszym addPlannedGoal.
    const override = localStorage.getItem('familygoals_planned_override');
    if (override) {
      try {
        return JSON.parse(override);
      } catch (e) {
        console.warn('Invalid planned override data');
      }
    }
    return [];
  }

  updatePlannedProgress(id, amount) {
    const planned = this.getPlannedExpenses();
    const item = planned.find(p => p.id === id);
    if (item) {
      item.currentAmount = (item.currentAmount || 0) + amount;
      // Save to localStorage as user override
      localStorage.setItem('familygoals_planned_override', JSON.stringify(planned));
    }
    return item;
  }

  calculateTimeToGoal(id) {
    const item = this.getPlannedExpenses().find(p => p.id === id);
    if (!item) return null;

    const remaining = item.targetAmount - (item.currentAmount || 0);
    if (remaining <= 0) return { months: 0, complete: true };

    const monthly = item.monthlyContribution || 0;
    if (monthly <= 0) return { months: Infinity, complete: false };

    const months = Math.ceil(remaining / monthly);
    const targetDate = new Date(item.targetDate);
    const now = new Date();
    // B-M7: bez ważnego terminu nie da się ocenić "czy zdążymy" —
    // onTrack=null zamiast porównania z NaN (dawało false i fałszywy alert)
    const hasDeadline = item.targetDate && !isNaN(targetDate.getTime());
    const monthsUntilDeadline = hasDeadline
      ? (targetDate.getFullYear() - now.getFullYear()) * 12
        + (targetDate.getMonth() - now.getMonth())
      : null;

    return {
      months,
      remaining,
      monthly,
      complete: false,
      onTrack: hasDeadline ? months <= monthsUntilDeadline : null,
      targetDate: item.targetDate
    };
  }

  /**
   * Dodaj nowy cel finansowy
   */
  addPlannedGoal(goal) {
    const planned = this._getPlannedFromStorage();
    const newGoal = {
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      currentAmount: 0,
      ...goal
    };

    // Auto-calculate monthly contribution if not provided
    if (!newGoal.monthlyContribution && newGoal.targetDate) {
      newGoal.monthlyContribution = this.calculateRequiredMonthlySavings(
        newGoal.targetAmount,
        newGoal.currentAmount || 0,
        newGoal.targetDate
      );
    }

    planned.push(newGoal);
    this._savePlanned(planned);
    return newGoal;
  }

  /**
   * Edytuj cel (w tym deadline)
   */
  updatePlannedGoal(id, updates) {
    const planned = this._getPlannedFromStorage();
    const index = planned.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updated = { ...planned[index], ...updates };

    // Recalculate monthly contribution when deadline changes.
    // C-C1: NIE dla celów cyklicznych (nie mają targetDate — przeliczenie
    // dawało NaN i niszczyło monthlyContribution) ani bez ważnego terminu.
    const hasValidTargetDate =
      updated.targetDate && !isNaN(new Date(updated.targetDate).getTime());
    if ((updates.targetDate || updates.targetAmount) &&
        updated.type !== 'recurring' && hasValidTargetDate) {
      updated.monthlyContribution = this.calculateRequiredMonthlySavings(
        updated.targetAmount,
        updated.currentAmount || 0,
        updated.targetDate
      );
    }

    planned[index] = updated;
    this._savePlanned(planned);
    return updated;
  }

  /**
   * Usuń cel
   */
  deletePlannedGoal(id) {
    const planned = this._getPlannedFromStorage();
    const filtered = planned.filter(p => p.id !== id);
    this._savePlanned(filtered);
  }

  /**
   * Oblicz wymagane oszczędności miesięczne
   */
  calculateRequiredMonthlySavings(targetAmount, currentAmount, targetDate) {
    const remaining = (targetAmount || 0) - (currentAmount || 0);
    if (remaining <= 0) return 0;

    const now = new Date();
    const target = new Date(targetDate);
    // B-M7/C-M4: bez ważnego terminu nie ma z czego liczyć — 0 zamiast NaN,
    // żeby nie zatruwać sum i nie zapisywać null do danych
    if (!targetDate || isNaN(target.getTime())) return 0;
    const monthsLeft = Math.max(1,
      (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth())
    );

    return Math.ceil(remaining / monthsLeft);
  }

  /**
   * Projekcja celu przy różnych deadline'ach
   * Zwraca tablicę opcji: [{date, requiredMonthly, feasibility}]
   */
  getGoalProjections(id, options = { variants: [6, 12, 18, 24] }) {
    const item = this.getPlannedExpenses().find(p => p.id === id);
    if (!item) return [];

    const remaining = item.targetAmount - (item.currentAmount || 0);
    const now = new Date();
    const avgSavings = this._getAverageMonthlySavings();

    return options.variants.map(monthsFromNow => {
      const targetDate = new Date(now);
      targetDate.setMonth(targetDate.getMonth() + monthsFromNow);

      const requiredMonthly = Math.ceil(remaining / monthsFromNow);
      const feasibility = avgSavings > 0
        ? Math.min(100, Math.round((avgSavings / requiredMonthly) * 100))
        : 0;

      return {
        monthsFromNow,
        targetDate: targetDate.toISOString().split('T')[0],
        targetDateFormatted: this.formatDate(targetDate),
        requiredMonthly,
        feasibility,
        feasibilityLabel: feasibility >= 80 ? 'łatwe' :
                          feasibility >= 50 ? 'możliwe' :
                          feasibility >= 30 ? 'trudne' : 'bardzo trudne'
      };
    });
  }

  /**
   * Dynamiczna wizualizacja - co się zmienia przy przesunięciu deadline'u
   */
  simulateDeadlineChange(id, newTargetDate) {
    const item = this.getPlannedExpenses().find(p => p.id === id);
    if (!item) return null;

    const remaining = item.targetAmount - (item.currentAmount || 0);
    const now = new Date();
    const newTarget = new Date(newTargetDate);
    const oldTarget = new Date(item.targetDate);

    const oldMonths = Math.max(1,
      (oldTarget.getFullYear() - now.getFullYear()) * 12 +
      (oldTarget.getMonth() - now.getMonth())
    );
    const newMonths = Math.max(1,
      (newTarget.getFullYear() - now.getFullYear()) * 12 +
      (newTarget.getMonth() - now.getMonth())
    );

    const oldRequired = Math.ceil(remaining / oldMonths);
    const newRequired = Math.ceil(remaining / newMonths);
    const difference = newRequired - oldRequired;

    return {
      goalName: item.name,
      remaining,
      oldDeadline: item.targetDate,
      newDeadline: newTargetDate,
      oldMonthsLeft: oldMonths,
      newMonthsLeft: newMonths,
      oldRequiredMonthly: oldRequired,
      newRequiredMonthly: newRequired,
      monthlyDifference: difference,
      changePercent: Math.round((difference / oldRequired) * 100),
      impact: difference > 0 ? 'więcej/mies.' :
              difference < 0 ? 'mniej/mies.' : 'bez zmian'
    };
  }

  _getPlannedFromStorage() {
    // Jak getPlannedExpenses: tylko override, bez fallbacku do pliku demo
    const override = localStorage.getItem('familygoals_planned_override');
    if (override) {
      return this._safeJsonParse(override, []);
    }
    return [];
  }

  _savePlanned(planned) {
    localStorage.setItem('familygoals_planned_override', JSON.stringify(planned));
    // Also update in-memory
    if (this.planned) {
      this.planned.plannedExpenses = planned;
    }
  }

  _getAverageMonthlySavings() {
    const trend = this.getTrend(6);
    const savingsData = trend.filter(t => t.savings > 0);
    if (savingsData.length === 0) return 0;
    return Math.round(
      savingsData.reduce((sum, t) => sum + t.savings, 0) / savingsData.length
    );
  }

  // === INFLATION ===

  getInflationRate() {
    return this.inflation?.currentRate?.cpi || 0;
  }

  getInflationByCategory(categoryId) {
    return this.inflation?.categoryRates?.[categoryId] || this.getInflationRate();
  }

  adjustForInflation(amount, months = 12) {
    const rate = this.getInflationRate() / 100;
    const years = months / 12;
    return amount * Math.pow(1 + rate, years);
  }

  // === ALERTS ===

  getBudgetAlerts() {
    const now = new Date();
    const stats = this.getMonthlyStats(now.getFullYear(), now.getMonth());
    // TYLKO budżety ustawione przez usera. `getCategories()` dokleja kategorie
    // demo z data/config.json, które niosą budżety (Mieszkanie 3000, Jedzenie
    // 2000...) — nikt ich nie ustawiał i nie ma na to UI. Dopóki nie było
    // wydatków, ten kod spał; z wydatkami sypałby widmowymi alertami
    // „Przekroczono budżet" (ten sam gatunek co usunięty alert celu z configu).
    const categories = this.getCustomCategories('expense');
    const alerts = [];

    categories.forEach(cat => {
      if (!cat.budget || cat.budget <= 0) return;

      const spent = stats.byCategory[cat.id] || 0;
      const percent = (spent / cat.budget) * 100;

      if (percent >= 100) {
        alerts.push({
          type: 'danger',
          categoryId: cat.id,
          categoryName: cat.name,
          message: `Przekroczono budżet o ${this.formatCurrency(spent - cat.budget)}`,
          percent,
          spent,
          budget: cat.budget
        });
      } else if (percent >= 80) {
        alerts.push({
          type: 'warning',
          categoryId: cat.id,
          categoryName: cat.name,
          message: `Wykorzystano ${Math.round(percent)}% budżetu`,
          percent,
          spent,
          budget: cat.budget
        });
      }
    });

    return alerts;
  }

  getGoalAlerts() {
    const alerts = [];

    // USUNIĘTE (2026-07-25): alert "celu oszczędności" z config.goals
    // .monthlySavingsTarget — w APK config.json się nie ładuje, wchodził
    // domyślny target 2000 i produkował WIDMOWY alert ("Zostało 1300 zł
    // do celu" przy zerze celów usera). Jedyne źródło celów = realne cele
    // z aplikacji (blok niżej).

    // Planned expenses goals
    // B-M7: cele cykliczne to zobowiązania (bez "deadline'u") — bez alertów;
    // alert tylko przy jednoznacznym onTrack === false (nie null/undefined)
    this.getPlannedExpenses().forEach(goal => {
      if (goal.type === 'recurring') return;
      const progress = this.calculateTimeToGoal(goal.id);
      if (progress && !progress.complete && progress.onTrack === false) {
        alerts.push({
          type: 'warning',
          goalType: 'planned',
          goalId: goal.id,
          goalName: goal.name,
          message: `${goal.name}: potrzeba ${progress.months} mies., zostało mniej`,
          ...progress
        });
      }
    });

    return alerts;
  }

  getAllAlerts() {
    return [...this.getBudgetAlerts(), ...this.getGoalAlerts()];
  }

  // === BUSINESS COSTS (Optymalizacja) ===

  getBusinessCosts() {
    return this._getCached(this.constructor.STORAGE_KEYS.businessCosts, []);
  }

  addBusinessCost(cost) {
    const costs = this.getBusinessCosts();
    const newCost = {
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      lastPurchaseDate: null,
      ...cost
    };

    // Calculate next due date for recurring
    if (newCost.isRecurring && newCost.recurringMonths) {
      newCost.nextDueDate = this._calculateNextDueDate(new Date(), newCost.recurringMonths);
    }

    costs.push(newCost);
    this._saveBusinessCosts(costs);
    return newCost;
  }

  updateBusinessCost(id, updates) {
    const costs = this.getBusinessCosts();
    const index = costs.findIndex(c => c.id === id);
    if (index === -1) return null;

    costs[index] = { ...costs[index], ...updates };

    // Recalculate next due if recurring changed
    if (updates.isRecurring !== undefined || updates.recurringMonths) {
      if (costs[index].isRecurring && costs[index].recurringMonths) {
        const baseDate = costs[index].lastPurchaseDate ? new Date(costs[index].lastPurchaseDate) : new Date();
        costs[index].nextDueDate = this._calculateNextDueDate(baseDate, costs[index].recurringMonths);
      } else {
        costs[index].nextDueDate = null;
      }
    }

    this._saveBusinessCosts(costs);
    return costs[index];
  }

  deleteBusinessCost(id) {
    const costs = this.getBusinessCosts();
    this._saveBusinessCosts(costs.filter(c => c.id !== id));
  }

  /**
   * Mark business cost as purchased (updates lastPurchaseDate and nextDueDate)
   */
  markBusinessCostPurchased(id) {
    const costs = this.getBusinessCosts();
    const cost = costs.find(c => c.id === id);
    if (!cost) return null;

    cost.lastPurchaseDate = new Date().toISOString();

    if (cost.isRecurring && cost.recurringMonths) {
      cost.nextDueDate = this._calculateNextDueDate(new Date(), cost.recurringMonths);
    }

    this._saveBusinessCosts(costs);
    return cost;
  }

  /**
   * Get upcoming business costs (due within next month)
   */
  getUpcomingBusinessCosts() {
    const costs = this.getBusinessCosts();
    const now = new Date();
    const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return costs.filter(c => {
      if (!c.nextDueDate) return false;
      // Zakres od–do: przed startem / po końcu nie ma czego odkupywać
      if (c.activeFrom && nowYM < c.activeFrom) return false;
      if (c.activeTo && nowYM > c.activeTo) return false;
      const dueDate = new Date(c.nextDueDate);
      return dueDate <= nextMonth;
    }).sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  }

  /**
   * Calculate monthly savings from business costs
   */
  calculateBusinessSavings(year, month) {
    const costs = this.getBusinessCosts();
    let monthlySavings = 0;

    // C-M5: liczone dla wskazanego miesiąca (spójnie z resztą dashboardu),
    // domyślnie bieżący — wcześniej zawsze "teraz", co psuło sumy przy
    // przewijaniu miesięcy
    const now = new Date();
    const refYear = year ?? now.getFullYear();
    const refMonth = month ?? now.getMonth();
    const refYM = `${refYear}-${String(refMonth + 1).padStart(2, '0')}`;

    costs.forEach(cost => {
      if (cost.isRecurring && cost.recurringMonths && cost.recurringMonths > 0) {
        // Zakres od–do (YYYY-MM, opcjonalny) — poza nim korzyść się nie liczy
        // (np. leasing). Bez activeFrom: od miesiąca DODANIA (zero fabrykacji
        // wstecz — wpłaty to datowane fakty), bez activeTo: bezterminowo
        const startYM = cost.activeFrom || String(cost.createdAt || '').slice(0, 7);
        if (startYM && refYM < startYM) return;
        if (cost.activeTo && refYM > cost.activeTo) return;
        // Distribute cost over recurring period
        monthlySavings += cost.amount / cost.recurringMonths;
      } else {
        // One-time costs count only in the month they were purchased
        if (cost.lastPurchaseDate) {
          const purchaseDate = new Date(cost.lastPurchaseDate);
          if (purchaseDate.getMonth() === refMonth &&
              purchaseDate.getFullYear() === refYear) {
            monthlySavings += cost.amount;
          }
        }
      }
    });

    return Math.round(monthlySavings);
  }

  /**
   * Get total business costs (lifetime)
   */
  getTotalBusinessCosts() {
    const costs = this.getBusinessCosts();
    return costs.reduce((sum, c) => {
      // Count only purchased items
      if (c.lastPurchaseDate) {
        return sum + c.amount;
      }
      return sum;
    }, 0);
  }

  _saveBusinessCosts(costs) {
    this._setCached(this.constructor.STORAGE_KEYS.businessCosts, costs);
  }

  _calculateNextDueDate(fromDate, months) {
    const date = new Date(fromDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  }

  // === TODOS (Zadania domowe) ===

  getTodos() {
    return this._getCached(this.constructor.STORAGE_KEYS.todos, []);
  }

  addTodo(todo) {
    const todos = this.getTodos();
    const newTodo = {
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
      lastCompletedDate: null,
      nextDueDate: new Date().toISOString(), // Due today by default
      priority: 'normal',
      ...todo
    };

    todos.push(newTodo);
    this._saveTodos(todos);
    return newTodo;
  }

  updateTodo(id, updates) {
    const todos = this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    todos[index] = { ...todos[index], ...updates };
    this._saveTodos(todos);
    return todos[index];
  }

  deleteTodo(id) {
    const todos = this.getTodos();
    this._saveTodos(todos.filter(t => t.id !== id));
  }

  /**
   * Complete a todo - handles both one-time and recurring
   */
  completeTodo(id) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return null;

    const now = new Date();
    todo.lastCompletedDate = now.toISOString();

    if (todo.isRecurring && todo.recurringDays) {
      // Reset for next occurrence
      todo.isCompleted = false;
      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + todo.recurringDays);
      todo.nextDueDate = nextDue.toISOString();
    } else {
      // One-time task - mark as done
      todo.isCompleted = true;
    }

    this._saveTodos(todos);
    return todo;
  }

  /**
   * Uncomplete a todo (undo)
   */
  uncompleteTodo(id) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return null;

    todo.isCompleted = false;
    todo.lastCompletedDate = null;
    todo.nextDueDate = new Date().toISOString(); // Reset to today

    this._saveTodos(todos);
    return todo;
  }

  /**
   * Get todos filtered by owner
   */
  getTodosByOwner(owner) {
    if (!owner || owner === 'all') return this.getTodos();
    return this.getTodos().filter(t => t.owner === owner || t.owner === 'both');
  }

  /**
   * Get pending todos (not completed, due today or earlier)
   */
  getPendingTodos(owner = 'all') {
    const todos = this.getTodosByOwner(owner);
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    return todos.filter(t => {
      if (t.isCompleted) return false;
      const dueDate = new Date(t.nextDueDate);
      return dueDate <= now;
    }).sort((a, b) => {
      // Sort by priority (high first), then by due date
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.nextDueDate) - new Date(b.nextDueDate);
    });
  }

  /**
   * Get completed todos (for display)
   */
  getCompletedTodos(owner = 'all') {
    const todos = this.getTodosByOwner(owner);
    return todos.filter(t => t.isCompleted);
  }

  /**
   * Check if todo is due (today or overdue)
   */
  isTodoDue(todo) {
    if (todo.isCompleted) return false;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return new Date(todo.nextDueDate) <= now;
  }

  /**
   * Get todo stats
   */
  getTodoStats(owner = 'all') {
    const todos = this.getTodosByOwner(owner);
    const pending = this.getPendingTodos(owner);
    const completed = this.getCompletedTodos(owner);

    return {
      total: todos.length,
      pending: pending.length,
      completed: completed.length,
      overdue: pending.filter(t => {
        const dueDate = new Date(t.nextDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length
    };
  }

  _saveTodos(todos) {
    this._setCached(this.constructor.STORAGE_KEYS.todos, todos);
  }

  // === EXPORT/IMPORT ===

  exportData() {
    return {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      expenses: this.getExpenses(),
      income: this.getIncome(),
      categories: this.getCustomCategories(),
      settings: this.getSettings()
    };
  }

  /**
   * B-C1: oficjalna ścieżka importu backupu — pisze przez _setCached
   * (spójnie cache+localStorage), cele przez override, na końcu pełna
   * invalidacja. app.js/importData MUSI używać tej metody zamiast
   * gołych localStorage.setItem (które zostawiały stale cache, a kolejna
   * edycja trwale nadpisywała zaimportowane dane).
   */
  importBackup(data) {
    if (!data || typeof data !== 'object') return false;
    const K = this.constructor.STORAGE_KEYS;
    const fieldToKey = {
      expenses: K.expenses,
      income: K.income,
      incomeSources: K.incomeSources,
      categories: K.categories,
      settings: K.settings,
      businessCosts: K.businessCosts,
      todos: K.todos
    };
    for (const [field, key] of Object.entries(fieldToKey)) {
      if (data[field] !== undefined && data[field] !== null) {
        this._setCached(key, data[field]);
      }
    }
    if (Array.isArray(data.goals)) {
      localStorage.setItem('familygoals_planned_override', JSON.stringify(data.goals));
    }
    this._invalidateAllCache();
    return true;
  }

  importData(data) {
    if (data.expenses) {
      this._setCached(this.constructor.STORAGE_KEYS.expenses, data.expenses);
    }
    if (data.income) {
      this._setCached(this.constructor.STORAGE_KEYS.income, data.income);
    }
    if (data.categories) {
      this._setCached(this.constructor.STORAGE_KEYS.categories, data.categories);
    }
    if (data.settings) {
      this._setCached(this.constructor.STORAGE_KEYS.settings, data.settings);
    }
  }

  // === SETTINGS ===

  getSettings() {
    return this._getCached(this.constructor.STORAGE_KEYS.settings, {});
  }

  updateSettings(updates) {
    const settings = { ...this.getSettings(), ...updates };
    this._setCached(this.constructor.STORAGE_KEYS.settings, settings);
    return settings;
  }

  // === HELPERS ===

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat(this.config?.locale || 'pl-PL', {
      style: 'currency',
      currency: this.config?.currency || 'PLN'
    }).format(amount);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat(this.config?.locale || 'pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }
}

// Singleton — wystawiony też na window (B-M3): app.js i wszystkie moduły
// MUSZĄ używać tej jednej instancji; druga instancja = osobny cache
// i niewidoczne naliczenia recurring
const dataManager = new DataManager();
window.dataManager = dataManager;
