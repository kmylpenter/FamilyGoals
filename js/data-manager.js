/**
 * Data Manager - sync między repo JSON a localStorage
 */
class DataManager {
  static STORAGE_KEYS = {
    expenses: 'familygoals_expenses',
    income: 'familygoals_income',
    categories: 'familygoals_categories',
    settings: 'familygoals_settings',
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

  // === STATS ===

  getMonthlyStats(year, month) {
    const expenses = this.getExpenses().filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const income = this.getIncome().filter(i => {
      const d = new Date(i.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

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
