/**
 * Recurring Manager - zarządzanie wydatkami/przychodami stałymi
 */
class RecurringManager {
  static PROCESSED_KEY = 'familygoals_recurring_processed';

  /**
   * Przetwórz wszystkie stałe wydatki/przychody
   * Wywołaj przy starcie aplikacji
   */
  static processAll() {
    const processed = dataManager.processRecurring();

    if (processed.length > 0) {
      this._markProcessed(new Date());
      console.log(`Processed ${processed.length} recurring items`);
    }

    return processed;
  }

  /**
   * Czy dziś już przetworzono?
   */
  static wasProcessedToday() {
    const lastProcessed = localStorage.getItem(this.PROCESSED_KEY);
    if (!lastProcessed) return false;

    const lastDate = new Date(lastProcessed);
    const today = new Date();

    return lastDate.toDateString() === today.toDateString();
  }

  /**
   * Przetwórz tylko jeśli jeszcze nie dziś
   */
  static processIfNeeded() {
    if (!this.wasProcessedToday()) {
      return this.processAll();
    }
    return [];
  }

  /**
   * Zapisz datę ostatniego przetworzenia
   */
  static _markProcessed(date) {
    localStorage.setItem(this.PROCESSED_KEY, date.toISOString());
  }

  /**
   * Następne wystąpienie wydatku stałego
   */
  static getNextOccurrence(item) {
    const today = new Date();
    const day = item.recurringDay || 1;

    let next = new Date(today.getFullYear(), today.getMonth(), day);

    if (next <= today) {
      next = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }

    return next;
  }

  /**
   * Podsumowanie wydatków stałych
   */
  static getSummary() {
    const expenses = dataManager.getRecurringExpenses();
    const income = dataManager.getRecurringIncome();

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);

    return {
      expensesCount: expenses.length,
      incomeCount: income.length,
      totalExpenses,
      totalIncome,
      netRecurring: totalIncome - totalExpenses,
      expenses,
      income
    };
  }

  /**
   * Dodaj nowy wydatek stały
   */
  static addRecurringExpense(data) {
    return dataManager.addExpense({
      ...data,
      isRecurring: true,
      recurringDay: data.recurringDay || 1
    });
  }

  /**
   * Dodaj nowy przychód stały
   */
  static addRecurringIncome(data) {
    return dataManager.addIncome({
      ...data,
      isRecurring: true,
      recurringDay: data.recurringDay || 1
    });
  }
}
