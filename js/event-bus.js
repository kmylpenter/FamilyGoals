/**
 * EventBus - Reaktywność UI
 * Wszystkie dane aktualizują się dynamicznie bez przeładowania
 */
class EventBus {
  static _listeners = {};

  /**
   * Subskrybuj event
   * @param {string} event - Nazwa eventu
   * @param {Function} callback - Funkcja do wywołania
   * @returns {Function} Funkcja do anulowania subskrypcji
   */
  static on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Emituj event
   * @param {string} event - Nazwa eventu
   * @param {*} data - Dane do przekazania
   */
  static emit(event, data = null) {
    // Debug logging disabled in production
    // console.log(`[EventBus] ${event}`, data);

    if (this._listeners[event]) {
      this._listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[EventBus] Error in listener for ${event}:`, e);
        }
      });
    }

    // Emituj też ogólny event 'data:changed'
    if (event !== 'data:changed' && event.includes(':')) {
      this.emit('data:changed', { event, data });
    }
  }

  /**
   * Jednorazowa subskrypcja
   */
  static once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Usuń wszystkie listenery dla eventu
   */
  static off(event) {
    delete this._listeners[event];
  }

  /**
   * Wyczyść wszystkie listenery
   */
  static clear() {
    this._listeners = {};
  }
}

// === EVENTS ===
// Expenses
// - expense:added     - Dodano wydatek
// - expense:updated   - Zaktualizowano wydatek
// - expense:deleted   - Usunięto wydatek

// Income
// - income:added      - Dodano przychód
// - income:deleted    - Usunięto przychód
// - income:recorded   - Oznaczono wpłatę ze źródła

// Income Sources
// - source:added      - Dodano źródło przychodu
// - source:updated    - Zaktualizowano źródło
// - source:deleted    - Usunięto źródło

// Goals
// - goal:added        - Dodano cel
// - goal:updated      - Zaktualizowano cel (deadline, kwota)
// - goal:progress     - Wpłata na cel
// - goal:completed    - Cel osiągnięty!

// Categories
// - category:added    - Dodano kategorię
// - category:updated  - Zaktualizowano
// - category:deleted  - Usunięto

// Achievements
// - achievement:unlocked  - Odblokowano osiągnięcie
// - reward:purchased      - Kupiono nagrodę
// - reward:redeemed       - Wykorzystano nagrodę

// General
// - data:changed      - Cokolwiek się zmieniło (auto-emitowane)
// - month:changed     - Zmieniono wyświetlany miesiąc
// - user:switched     - Zmieniono użytkownika (żona/mąż)


/**
 * ReactiveUI - Helper do aktualizacji UI
 */
class ReactiveUI {
  /**
   * Animowana zmiana liczby
   */
  static animateNumber(element, targetValue, duration = 500) {
    const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * eased;

      element.textContent = this._formatNumber(currentValue, element.dataset.format);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animowany progress bar
   */
  static animateProgress(element, targetPercent, duration = 400) {
    element.style.transition = `width ${duration}ms ease-out`;
    element.style.width = `${Math.min(100, targetPercent)}%`;
  }

  /**
   * Fade in nowy element
   */
  static fadeIn(element, duration = 200) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  /**
   * Fade out i usuń element
   */
  static fadeOut(element, duration = 200) {
    element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';

    setTimeout(() => element.remove(), duration);
  }

  /**
   * Slide in z boku
   */
  static slideIn(element, direction = 'right', duration = 300) {
    const start = direction === 'right' ? '100%' : '-100%';
    element.style.transform = `translateX(${start})`;
    element.style.opacity = '0';
    element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;

    requestAnimationFrame(() => {
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });
  }

  /**
   * Efekt "shake" przy błędzie
   */
  static shake(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
  }

  /**
   * Efekt celebracji (dla osiągnięć)
   */
  static celebrate(element) {
    element.classList.add('celebrate');

    // Confetti effect (prosty)
    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'];
    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: ${colors[i % colors.length]};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: confetti-fall 1s ease-out forwards;
      `;
      element.appendChild(confetti);
      setTimeout(() => confetti.remove(), 1000);
    }

    setTimeout(() => element.classList.remove('celebrate'), 1000);
  }

  /**
   * Pulse effect (dla ważnych zmian)
   */
  static pulse(element) {
    element.classList.add('pulse');
    setTimeout(() => element.classList.remove('pulse'), 600);
  }

  /**
   * Format number based on type
   */
  static _formatNumber(value, format) {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pl-PL', {
          style: 'currency',
          currency: 'PLN'
        }).format(value);
      case 'percent':
        return `${Math.round(value)}%`;
      default:
        return Math.round(value).toLocaleString('pl-PL');
    }
  }
}

/**
 * Automatyczne podłączenie do DataManager
 * Rozszerza metody DataManager o emitowanie eventów
 */
function connectDataManagerToEventBus(dataManager) {
  const originalAddExpense = dataManager.addExpense.bind(dataManager);
  dataManager.addExpense = function(expense) {
    const result = originalAddExpense(expense);
    EventBus.emit('expense:added', result);
    return result;
  };

  const originalDeleteExpense = dataManager.deleteExpense.bind(dataManager);
  dataManager.deleteExpense = function(id) {
    originalDeleteExpense(id);
    EventBus.emit('expense:deleted', { id });
  };

  const originalAddIncome = dataManager.addIncome.bind(dataManager);
  dataManager.addIncome = function(income) {
    const result = originalAddIncome(income);
    EventBus.emit('income:added', result);
    return result;
  };

  const originalRecordPayment = dataManager.recordPayment.bind(dataManager);
  dataManager.recordPayment = function(sourceId, payment) {
    const result = originalRecordPayment(sourceId, payment);
    EventBus.emit('income:recorded', { sourceId, payment: result });
    return result;
  };

  const originalAddPlannedGoal = dataManager.addPlannedGoal.bind(dataManager);
  dataManager.addPlannedGoal = function(goal) {
    const result = originalAddPlannedGoal(goal);
    EventBus.emit('goal:added', result);
    return result;
  };

  const originalUpdatePlannedGoal = dataManager.updatePlannedGoal.bind(dataManager);
  dataManager.updatePlannedGoal = function(id, updates) {
    const result = originalUpdatePlannedGoal(id, updates);
    EventBus.emit('goal:updated', result);

    // Check if goal completed
    if (result && result.currentAmount >= result.targetAmount) {
      EventBus.emit('goal:completed', result);
    }
    return result;
  };

  // console.log('[EventBus] Connected to DataManager');
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventBus, ReactiveUI, connectDataManagerToEventBus };
}
