/**
 * UI Controller - FamilyGoals
 * Connects the logic layer with the UI
 */

class UIController {
  constructor() {
    this.currentScreen = null;
    this.pinCode = '';
    this.isSettingPin = false;
    this.confirmPin = '';
    this.fabOpen = false;

    // Default categories with emojis
    this.defaultCategories = [
      { id: 'housing', name: 'Mieszkanie', icon: '🏠', budget: 3000 },
      { id: 'food', name: 'Jedzenie', icon: '🍽️', budget: 2000 },
      { id: 'transport', name: 'Transport', icon: '🚗', budget: 800 },
      { id: 'kids', name: 'Dzieci', icon: '👶', budget: 500 },
      { id: 'entertainment', name: 'Rozrywka', icon: '🎬', budget: 400 },
      { id: 'health', name: 'Zdrowie', icon: '❤️', budget: 300 },
      { id: 'education', name: 'Edukacja', icon: '📚', budget: 200 },
      { id: 'clothes', name: 'Ubrania', icon: '👕', budget: 300 },
      { id: 'hygiene', name: 'Higiena', icon: '💧', budget: 150 },
      { id: 'gifts', name: 'Prezenty', icon: '🎁', budget: 200 },
      { id: 'other', name: 'Inne', icon: '⋯', budget: 500 }
    ];

    this.tips = [
      'Przed zakupem poczekaj 24h. Nadal chcesz? Kup.',
      'Zapisuj wydatki od razu - później zapomnisz.',
      'Małe kwoty się sumują. 10 zł dziennie = 300 zł/mies.',
      'Cel bez daty to tylko marzenie.',
      'Oszczędzanie to płacenie sobie w przyszłości.',
      'Budżet to mówieniu pieniądzom gdzie mają iść.',
      'Każdy wydatek to wybór - wybieraj mądrze.',
      'Porównuj ceny - 5 minut może zaoszczędzić 50 zł.',
      'Gotuj w domu - zdrowo i tanio.',
      'Wyłączaj subskrypcje, których nie używasz.'
    ];
  }

  // === INITIALIZATION ===

  async init() {
    // ALWAYS setup event listeners first
    this.setupEventListeners();
    console.log('Event listeners ready');

    try {
      // Initialize data manager
      if (typeof dataManager !== 'undefined') {
        await dataManager.init();
      }

      // Check if engagement manager exists and record login
      if (typeof EngagementManager !== 'undefined') {
        EngagementManager.recordLogin();
      }

      // Determine initial screen
      this.showInitialScreen();

      // Update month display
      this.updateMonthDisplay();

      // Set random daily tip
      this.setRandomTip();

      console.log('FamilyGoals UI initialized');
    } catch (error) {
      console.error('Init error:', error);
      // Fallback - show PIN screen
      this.showScreen('pin-screen');
    }
  }

  showInitialScreen() {
    if (PinManager.requiresUnlock()) {
      this.showScreen('pin-screen');
      this.isSettingPin = false;
    } else if (!PinManager.isEnabled()) {
      // First time - setup PIN
      this.showScreen('pin-screen');
      this.isSettingPin = true;
      this.updatePinUI();
    } else {
      // PIN valid or session active
      this.showScreen('dashboard-screen');
      this.updateDashboard();
    }
  }

  // === EVENT LISTENERS ===

  setupEventListeners() {
    // PIN keypad
    const keypad = document.getElementById('pin-keypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const key = e.target.closest('.pin-key');
        if (key && key.dataset.key) {
          this.handlePinKey(key.dataset.key);
        }
      });
    }

    // FAB button
    const fab = document.getElementById('fab-button');
    if (fab) {
      fab.addEventListener('click', () => this.toggleFab());
    }

    // FAB menu items
    document.getElementById('fab-expense')?.addEventListener('click', () => {
      this.toggleFab();
      this.showAddExpenseModal();
    });

    document.getElementById('fab-income')?.addEventListener('click', () => {
      this.toggleFab();
      this.showAddIncomeModal();
    });

    // Close FAB when clicking outside
    document.addEventListener('click', (e) => {
      if (this.fabOpen && !e.target.closest('.fab-container')) {
        this.toggleFab(false);
      }
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        this.handleNavigation(screen);
      });
    });

    // Extend session on activity
    document.addEventListener('click', () => {
      PinManager.extendSession();
    });

    // Listen to EventBus if available
    if (typeof EventBus !== 'undefined') {
      EventBus.on('expense:added', () => this.updateDashboard());
      EventBus.on('income:added', () => this.updateDashboard());
      EventBus.on('goal:updated', () => this.updateDashboard());
    }
  }

  // === SCREEN MANAGEMENT ===

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenId;
    }
  }

  handleNavigation(screen) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screen);
    });

    // For now, only dashboard is implemented
    if (screen === 'dashboard') {
      this.updateDashboard();
    }

    // TODO: Implement other screens
    console.log('Navigate to:', screen);
  }

  // === PIN HANDLING ===

  handlePinKey(key) {
    if (key === 'delete') {
      this.pinCode = this.pinCode.slice(0, -1);
    } else if (this.pinCode.length < 4) {
      this.pinCode += key;

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    this.updatePinDots();

    // Auto-submit when 4 digits entered
    if (this.pinCode.length === 4) {
      setTimeout(() => this.submitPin(), 150);
    }
  }

  updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('filled', index < this.pinCode.length);
      dot.classList.remove('error');
    });
  }

  updatePinUI() {
    const title = document.getElementById('pin-title');
    const hint = document.getElementById('pin-setup-hint');

    if (this.isSettingPin) {
      if (this.confirmPin) {
        title.textContent = 'Potwierdź PIN';
        hint.classList.add('hidden');
      } else {
        title.textContent = 'Utwórz PIN';
        hint.classList.remove('hidden');
      }
    } else {
      title.textContent = 'Wprowadź PIN';
      hint.classList.add('hidden');
    }
  }

  submitPin() {
    if (this.isSettingPin) {
      this.handlePinSetup();
    } else {
      this.handlePinVerify();
    }
  }

  handlePinSetup() {
    if (!this.confirmPin) {
      // First entry - store and ask for confirmation
      this.confirmPin = this.pinCode;
      this.pinCode = '';
      this.updatePinDots();
      this.updatePinUI();
    } else {
      // Confirmation
      if (this.pinCode === this.confirmPin) {
        // PINs match - save
        PinManager.setPin(this.pinCode);
        PinManager.startSession();
        this.showScreen('dashboard-screen');
        this.updateDashboard();
      } else {
        // PINs don't match
        this.showPinError();
        this.confirmPin = '';
        this.updatePinUI();
      }
    }
  }

  handlePinVerify() {
    if (PinManager.verify(this.pinCode)) {
      // Correct PIN
      PinManager.startSession();
      this.showScreen('dashboard-screen');
      this.updateDashboard();
    } else {
      // Wrong PIN
      this.showPinError();
    }
  }

  showPinError() {
    const container = document.getElementById('pin-container');
    const dots = document.querySelectorAll('.pin-dot');

    // Add error class to dots
    dots.forEach(dot => dot.classList.add('error'));

    // Shake animation
    container.classList.add('shake');

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }

    // Reset after animation
    setTimeout(() => {
      container.classList.remove('shake');
      this.pinCode = '';
      this.updatePinDots();
    }, 400);
  }

  // === DASHBOARD ===

  updateDashboard() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get monthly stats
    const stats = dataManager.getMonthlyStats(year, month);

    // Update savings
    this.updateSavingsCard(stats);

    // Update income/expense stats
    this.updateStatsCards(stats);

    // Update categories
    this.updateCategoryList(stats);

    // Update alerts
    this.updateAlerts();

    // Update streak widget
    this.updateStreakWidget();
  }

  updateSavingsCard(stats) {
    const target = stats.savingsTarget || 2000;
    const current = stats.savings;
    const percent = Math.min(100, Math.max(0, (current / target) * 100));
    const remaining = Math.max(0, target - current);

    document.getElementById('savings-amount').textContent =
      this.formatCurrency(current);
    document.getElementById('savings-target').textContent =
      this.formatCurrency(target);
    document.getElementById('savings-progress').style.width = `${percent}%`;
    document.getElementById('savings-remaining').textContent =
      `Pozostało: ${this.formatCurrency(remaining)}`;
    document.getElementById('savings-percent').textContent =
      `${Math.round(percent)}%`;
  }

  updateStatsCards(stats) {
    document.getElementById('income-amount').textContent =
      `+${this.formatCurrency(stats.totalIncome)}`;
    document.getElementById('expense-amount').textContent =
      `-${this.formatCurrency(stats.totalExpenses)}`;
  }

  updateCategoryList(stats) {
    const container = document.getElementById('category-list');
    if (!container) return;

    // Get categories with spending
    const categories = this.defaultCategories
      .map(cat => ({
        ...cat,
        spent: stats.byCategory[cat.id] || 0,
        percent: cat.budget > 0
          ? Math.round((stats.byCategory[cat.id] || 0) / cat.budget * 100)
          : 0
      }))
      .filter(cat => cat.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // If no spending, show placeholder
    if (categories.length === 0) {
      container.innerHTML = `
        <div class="category-item" style="justify-content: center; color: var(--text-muted);">
          Brak wydatków w tym miesiącu
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => {
      const levelClass = cat.percent >= 100 ? 'high' :
                        cat.percent >= 80 ? 'medium' : 'low';

      return `
        <div class="category-item">
          <div class="category-icon">${cat.icon}</div>
          <div class="category-info">
            <div class="category-name">${cat.name}</div>
            <div class="category-progress">
              <div class="category-progress-fill ${levelClass}"
                   style="width: ${Math.min(100, cat.percent)}%"></div>
            </div>
          </div>
          <div class="category-amount">${this.formatCurrency(cat.spent)}</div>
        </div>
      `;
    }).join('');
  }

  updateAlerts() {
    const alertBanner = document.getElementById('budget-alert');
    const alertMessage = document.getElementById('alert-message');

    const alerts = dataManager.getBudgetAlerts();

    if (alerts.length > 0) {
      const alert = alerts[0]; // Show first/most important alert
      alertBanner.classList.remove('hidden', 'warning', 'danger', 'success');
      alertBanner.classList.add(alert.type);
      alertMessage.textContent = `${alert.categoryName}: ${alert.message}`;
    } else {
      alertBanner.classList.add('hidden');
    }
  }

  updateStreakWidget() {
    if (typeof EngagementManager === 'undefined') {
      document.getElementById('streak-widget')?.classList.add('hidden');
      return;
    }

    const streakData = EngagementManager.getLoginStreak();
    const multiplier = EngagementManager.getMultiplier();

    document.getElementById('streak-days').textContent =
      `${streakData.currentStreak} dni`;
    document.getElementById('streak-multiplier').textContent =
      `${multiplier}x`;
    document.getElementById('freeze-count').textContent =
      streakData.freezeTokens || 0;

    // Progress to next milestone (every 7 days)
    const nextMilestone = Math.ceil(streakData.currentStreak / 7) * 7;
    const progress = (streakData.currentStreak % 7) / 7 * 100;
    document.getElementById('streak-progress').style.width = `${progress}%`;
  }

  updateMonthDisplay() {
    const now = new Date();
    const monthName = now.toLocaleDateString('pl-PL', {
      month: 'long',
      year: 'numeric'
    });
    document.getElementById('current-month').textContent =
      monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  // === FAB ===

  toggleFab(force) {
    const fab = document.getElementById('fab-button');
    const menu = document.getElementById('fab-menu');

    this.fabOpen = force !== undefined ? force : !this.fabOpen;

    fab.classList.toggle('open', this.fabOpen);
    menu.classList.toggle('open', this.fabOpen);
  }

  // === MODALS (Placeholders) ===

  showAddExpenseModal() {
    // TODO: Implement expense modal
    console.log('Show add expense modal');
    alert('Dodawanie wydatku - do zaimplementowania');
  }

  showAddIncomeModal() {
    // TODO: Implement income modal
    console.log('Show add income modal');
    alert('Dodawanie przychodu - do zaimplementowania');
  }

  // === HELPERS ===

  formatCurrency(amount) {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  setRandomTip() {
    const tipElement = document.getElementById('daily-tip');
    if (tipElement) {
      const randomIndex = Math.floor(Math.random() * this.tips.length);
      tipElement.textContent = this.tips[randomIndex];
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.ui = new UIController();
    window.ui.init();
  } catch (e) {
    console.error('UI init failed:', e);
    // Fallback PIN handler
    setupFallbackPIN();
  }
});

// Fallback PIN handler if main UI fails
function setupFallbackPIN() {
  let pin = '';
  const dots = document.querySelectorAll('.pin-dot');
  const keypad = document.getElementById('pin-keypad');

  if (!keypad) return;

  keypad.addEventListener('click', (e) => {
    const key = e.target.closest('.pin-key');
    if (!key || !key.dataset.key) return;

    if (key.dataset.key === 'delete') {
      pin = pin.slice(0, -1);
    } else if (pin.length < 4) {
      pin += key.dataset.key;
    }

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < pin.length);
    });

    // Auto-submit at 4 digits
    if (pin.length === 4) {
      setTimeout(() => {
        document.getElementById('pin-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
      }, 200);
    }
  });
}
