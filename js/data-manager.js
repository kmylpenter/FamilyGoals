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
    lastSync: 'familygoals_last_sync'
  };

  constructor() {
    this.config = null;
    this.inflation = null;
    this.planned = null;
    this.isOffline = !navigator.onLine;

    window.addEventListener('online', () => this.isOffline = false);
    window.addEventListener('offline', () => this.isOffline = true);
  }

  /**
   * Inicjalizacja - ładuje dane z repo i localStorage
   */
  async init() {
    try {
      await this._loadRepoData();
    } catch (e) {
      console.warn('Nie udało się pobrać danych z repo, używam cache');
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
      this.config = cached ? JSON.parse(cached) : this._getDefaultConfig();
    }
    if (!this.inflation) {
      const cached = localStorage.getItem('familygoals_inflation_cache');
      this.inflation = cached ? JSON.parse(cached) : null;
    }
    if (!this.planned) {
      const cached = localStorage.getItem('familygoals_planned_cache');
      this.planned = cached ? JSON.parse(cached) : { plannedExpenses: [] };
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
    const data = localStorage.getItem(this.constructor.STORAGE_KEYS.expenses);
    return data ? JSON.parse(data) : [];
  }

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: this._generateId(),
      date: new Date().toISOString(),
      ...expense
    };
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
    localStorage.setItem(this.constructor.STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }

  // === INCOME ===

  getIncome() {
    const data = localStorage.getItem(this.constructor.STORAGE_KEYS.income);
    return data ? JSON.parse(data) : [];
  }

  addIncome(income) {
    const incomes = this.getIncome();
    const newIncome = {
      id: this._generateId(),
      date: new Date().toISOString(),
      ...income
    };
    incomes.push(newIncome);
    localStorage.setItem(this.constructor.STORAGE_KEYS.income, JSON.stringify(incomes));
    return newIncome;
  }

  deleteIncome(id) {
    const incomes = this.getIncome();
    const filtered = incomes.filter(i => i.id !== id);
    localStorage.setItem(this.constructor.STORAGE_KEYS.income, JSON.stringify(filtered));
  }

  // === INCOME SOURCES (Źródła przychodów) ===

  /**
   * Pobierz wszystkie źródła przychodów
   */
  getIncomeSources() {
    const data = localStorage.getItem(this.constructor.STORAGE_KEYS.incomeSources);
    return data ? JSON.parse(data) : [];
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
    this._saveIncomeSources(sources.filter(s => s.id !== id));
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

    source.payments = source.payments || [];
    source.payments.push(newPayment);
    this._saveIncomeSources(sources);

    // Opcjonalnie dodaj też do ogólnych przychodów
    this.addIncome({
      amount: payment.amount,
      source: source.name,
      sourceId: sourceId,
      description: payment.note,
      date: payment.date
    });

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

    source.payments = source.payments.filter(p => {
      const d = new Date(p.date);
      return !(d.getFullYear() === year && d.getMonth() === month);
    });

    this._saveIncomeSources(sources);
    this.emit('income-updated');
  }

  /**
   * Usuń pojedynczą płatność
   */
  deletePayment(sourceId, paymentId) {
    const sources = this.getIncomeSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source || !source.payments) return false;

    const idx = source.payments.findIndex(p => p.id === paymentId);
    if (idx === -1) return false;

    source.payments.splice(idx, 1);
    this._saveIncomeSources(sources);
    this.emit('income-updated');
    return true;
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
      return true;
    });

    return sources.map(source => {
      const payments = this.getPaymentsByMonth(source.id, year, month);
      const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
      const expected = source.expectedAmount || 0;

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
    localStorage.setItem(this.constructor.STORAGE_KEYS.incomeSources, JSON.stringify(sources));
  }

  // === CATEGORIES ===

  getCategories() {
    const defaults = this.config?.categories || [];
    const custom = this.getCustomCategories();
    return [...defaults, ...custom];
  }

  getCustomCategories() {
    const data = localStorage.getItem(this.constructor.STORAGE_KEYS.categories);
    return data ? JSON.parse(data) : [];
  }

  addCategory(category) {
    const categories = this.getCustomCategories();
    const newCategory = {
      id: this._generateId(),
      isCustom: true,
      ...category
    };
    categories.push(newCategory);
    localStorage.setItem(this.constructor.STORAGE_KEYS.categories, JSON.stringify(categories));
    return newCategory;
  }

  updateCategory(id, updates) {
    const categories = this.getCustomCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      localStorage.setItem(this.constructor.STORAGE_KEYS.categories, JSON.stringify(categories));
      return categories[index];
    }
    return null;
  }

  deleteCategory(id) {
    const categories = this.getCustomCategories();
    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(this.constructor.STORAGE_KEYS.categories, JSON.stringify(filtered));
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

  getMonthlyStats(year, month) {
    const expenses = this.getExpensesByMonth(year, month);
    const income = this.getIncomeByMonth(year, month);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const savings = totalIncome - totalExpenses;

    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
    });

    return {
      totalExpenses,
      totalIncome,
      savings,
      savingsTarget: this.config?.goals?.monthlySavingsTarget || 0,
      byCategory,
      expenseCount: expenses.length,
      incomeCount: income.length
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
    const trend = [];
    const sources = this.getIncomeSources();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();

      let wifeIncome = 0;
      let husbandIncome = 0;

      // Zbierz zarobki per owner z sources
      sources.forEach(source => {
        const payments = this.getPaymentsByMonth(source.id, year, month);
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        if (source.owner === 'wife') {
          wifeIncome += total;
        } else if (source.owner === 'husband') {
          husbandIncome += total;
        }
      });

      // Jeśli brak płatności, użyj expected amounts
      if (wifeIncome === 0 && husbandIncome === 0) {
        sources.forEach(source => {
          if (source.isActive) {
            if (source.owner === 'wife') {
              wifeIncome += source.expectedAmount || 0;
            } else if (source.owner === 'husband') {
              husbandIncome += source.expectedAmount || 0;
            }
          }
        });
      }

      trend.push({
        year,
        month,
        monthName: d.toLocaleDateString('pl-PL', { month: 'short' }),
        wifeIncome,
        husbandIncome,
        totalIncome: wifeIncome + husbandIncome
      });
    }

    return trend;
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

    // Process recurring expenses
    this.getRecurringExpenses().forEach(exp => {
      if (exp.recurringDay === day) {
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
            recurringSourceId: exp.id
          });
          processed.push(newExp);
        }
      }
    });

    // Process recurring income
    this.getRecurringIncome().forEach(inc => {
      if (inc.recurringDay === day) {
        const exists = this.getIncomeByMonth(year, month).some(i =>
          i.recurringSourceId === inc.id
        );
        if (!exists) {
          const newInc = this.addIncome({
            amount: inc.amount,
            source: inc.source,
            description: inc.description || 'Przychód stały',
            isRecurring: false,
            recurringSourceId: inc.id
          });
          processed.push(newInc);
        }
      }
    });

    return processed;
  }

  // === PLANNED EXPENSES (GOALS) ===

  getPlannedExpenses() {
    // Check override first (user data / demo data)
    const override = localStorage.getItem('familygoals_planned_override');
    if (override) {
      try {
        return JSON.parse(override);
      } catch (e) {
        console.warn('Invalid planned override data');
      }
    }
    return this.planned?.plannedExpenses || [];
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
    const monthsUntilDeadline = (targetDate.getFullYear() - now.getFullYear()) * 12
      + (targetDate.getMonth() - now.getMonth());

    return {
      months,
      remaining,
      monthly,
      complete: false,
      onTrack: months <= monthsUntilDeadline,
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

    // Recalculate monthly contribution when deadline changes
    if (updates.targetDate || updates.targetAmount) {
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
    const remaining = targetAmount - (currentAmount || 0);
    if (remaining <= 0) return 0;

    const now = new Date();
    const target = new Date(targetDate);
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
    // Check for local overrides first
    const override = localStorage.getItem('familygoals_planned_override');
    if (override) return JSON.parse(override);
    return this.planned?.plannedExpenses || [];
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
    const categories = this.getCategories();
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
    const now = new Date();
    const stats = this.getMonthlyStats(now.getFullYear(), now.getMonth());

    // Savings goal
    const savingsTarget = this.config?.goals?.monthlySavingsTarget || 0;
    if (savingsTarget > 0) {
      const percent = (stats.savings / savingsTarget) * 100;

      if (stats.savings >= savingsTarget) {
        alerts.push({
          type: 'success',
          goalType: 'savings',
          message: `Cel osiągnięty! Oszczędzono ${this.formatCurrency(stats.savings)}`,
          percent,
          current: stats.savings,
          target: savingsTarget
        });
      } else if (percent < 50 && now.getDate() > 15) {
        alerts.push({
          type: 'warning',
          goalType: 'savings',
          message: `Zostało ${this.formatCurrency(savingsTarget - stats.savings)} do celu`,
          percent,
          current: stats.savings,
          target: savingsTarget
        });
      }
    }

    // Planned expenses goals
    this.getPlannedExpenses().forEach(goal => {
      const progress = this.calculateTimeToGoal(goal.id);
      if (progress && !progress.complete && !progress.onTrack) {
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

  importData(data) {
    if (data.expenses) {
      localStorage.setItem(this.constructor.STORAGE_KEYS.expenses, JSON.stringify(data.expenses));
    }
    if (data.income) {
      localStorage.setItem(this.constructor.STORAGE_KEYS.income, JSON.stringify(data.income));
    }
    if (data.categories) {
      localStorage.setItem(this.constructor.STORAGE_KEYS.categories, JSON.stringify(data.categories));
    }
    if (data.settings) {
      localStorage.setItem(this.constructor.STORAGE_KEYS.settings, JSON.stringify(data.settings));
    }
  }

  // === SETTINGS ===

  getSettings() {
    const data = localStorage.getItem(this.constructor.STORAGE_KEYS.settings);
    return data ? JSON.parse(data) : {};
  }

  updateSettings(updates) {
    const settings = { ...this.getSettings(), ...updates };
    localStorage.setItem(this.constructor.STORAGE_KEYS.settings, JSON.stringify(settings));
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

// Singleton
const dataManager = new DataManager();
