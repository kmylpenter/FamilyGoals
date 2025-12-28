/**
 * Alert Manager - zarządzanie alertami i powiadomieniami
 */
class AlertManager {
  static DISMISSED_KEY = 'familygoals_dismissed_alerts';

  /**
   * Pobierz wszystkie aktywne alerty
   */
  static getAlerts() {
    const all = dataManager.getAllAlerts();
    const dismissed = this.getDismissed();

    return all.filter(alert => {
      const alertId = this._getAlertId(alert);
      return !dismissed.includes(alertId);
    });
  }

  /**
   * Pobierz alerty wg typu
   */
  static getAlertsByType(type) {
    return this.getAlerts().filter(a => a.type === type);
  }

  /**
   * Czy są krytyczne alerty?
   */
  static hasCriticalAlerts() {
    return this.getAlertsByType('danger').length > 0;
  }

  /**
   * Liczba alertów
   */
  static getAlertCount() {
    return this.getAlerts().length;
  }

  /**
   * Odrzuć alert (ukryj do końca miesiąca)
   */
  static dismiss(alert) {
    const alertId = this._getAlertId(alert);
    const dismissed = this.getDismissed();

    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      this._saveDismissed(dismissed);
    }
  }

  /**
   * Pobierz odrzucone alerty
   */
  static getDismissed() {
    const data = localStorage.getItem(this.DISMISSED_KEY);
    if (!data) return [];

    const { month, dismissed } = JSON.parse(data);
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Reset na nowy miesiąc
    if (month !== currentMonth) {
      this._saveDismissed([]);
      return [];
    }

    return dismissed;
  }

  /**
   * Zapisz odrzucone
   */
  static _saveDismissed(dismissed) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    localStorage.setItem(this.DISMISSED_KEY, JSON.stringify({
      month: currentMonth,
      dismissed
    }));
  }

  /**
   * Generuj unikalny ID alertu
   */
  static _getAlertId(alert) {
    const parts = [
      alert.type,
      alert.categoryId || alert.goalId || alert.goalType,
      new Date().toISOString().slice(0, 7) // miesięczny scope
    ];
    return parts.join('_');
  }

  /**
   * Formatuj alert do wyświetlenia
   */
  static formatAlert(alert) {
    const icons = {
      danger: '🚨',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };

    return {
      ...alert,
      icon: icons[alert.type] || '📢',
      title: alert.categoryName || alert.goalName || 'Alert',
      dismissable: alert.type !== 'danger'
    };
  }

  /**
   * Pobierz sformatowane alerty
   */
  static getFormattedAlerts() {
    return this.getAlerts().map(a => this.formatAlert(a));
  }

  /**
   * Sprawdź alerty i zwróć podsumowanie
   */
  static checkAlerts() {
    const alerts = this.getAlerts();

    return {
      total: alerts.length,
      danger: alerts.filter(a => a.type === 'danger').length,
      warning: alerts.filter(a => a.type === 'warning').length,
      success: alerts.filter(a => a.type === 'success').length,
      hasCritical: this.hasCriticalAlerts(),
      alerts
    };
  }
}
