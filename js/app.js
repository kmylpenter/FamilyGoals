/**
 * FamilyGoals App v2.0 - UI Controller
 * Integruje istniejące managery z frontendem
 */
(function() {
  'use strict';

  // Managers (ładowane z innych plików)
  let dataManager = null;
  let gamificationManager = null;
  let engagementManager = null;
  let aiAdvisor = null;
  // family-unity/family-balance: zarchiwizowane w js/archive/ (audyt 2026-07-24,
  // D-C1 — 1510 linii bez żadnego podpięcia do UI; wrócą razem z wizją UI)

  // Current state
  let currentMonth = new Date();
  // Profil URZĄDZENIA (lokalny, celowo niesynchronizowany): komu przypisywać
  // streak/odznaki/nowe wpisy na TYM telefonie. null = jeszcze nie wybrano
  // (pierwsze uruchomienie pokaże picker).
  let currentPerson = localStorage.getItem('familygoals_device_profile') || null;
  let editingGoalId = null;
  let editingSourceId = null;

  // ============ HELPERS ============
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Use shared utilities from utils.js (D1, D6)
  const { MONTHS, escapeHtml, formatMoney, formatMonth, formatMonthShort, safeJsonParse, renderEmptyState } = window.FGUtils || window;

  function getYearMonth() {
    return { year: currentMonth.getFullYear(), month: currentMonth.getMonth() };
  }

  // ============ DEMO DATA ============
  function initDemoDataIfEmpty() {
    // Przy skonfigurowanym sync dane przyjdą z arkusza rodzinnego — demo
    // zaśmieciłoby wspólny backend przy pierwszym detectChanges
    if (localStorage.getItem('familygoals_sync_config')) return;
    const hasData = localStorage.getItem('familygoals_income_sources') ||
                    localStorage.getItem('familygoals_planned_override');
    if (hasData) return;

    const now = new Date();

    // B-M2: income[] MUSI być lustrem source.payments (jedno źródło prawdy) —
    // wcześniej demo siało do income[] losowe kwoty bez odpowiedników we
    // wpłatach źródeł i dashboard rozjeżdżał się z kartą przychodów od
    // pierwszego uruchomienia
    const wifePayments = [];
    const husbandPayments = [];
    const demoIncome = [];
    const addDemoPayment = (list, sourceId, sourceName, amount, date) => {
      const id = `demo-pay-${sourceId}-${date.getFullYear()}-${date.getMonth()}`;
      list.push({ id, amount, date: date.toISOString(), note: '', type: 'transfer' });
      demoIncome.push({ id: `demo-inc-${id}`, paymentId: id, sourceId, amount, source: sourceName, date: date.toISOString() });
    };
    for (let i = 5; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
      addDemoPayment(wifePayments, 'demo-salary-wife', 'Pensja', 5800 + (i % 3) * 200, d);
      addDemoPayment(husbandPayments, 'demo-salary-husband', 'Pensja', 4500, d);
    }
    // Bieżący miesiąc: żona już otrzymała wypłatę, mąż jeszcze czeka
    addDemoPayment(wifePayments, 'demo-salary-wife', 'Pensja', 6000, new Date(now.getFullYear(), now.getMonth(), 10));

    // Demo income sources
    const demoSources = [
      { id: 'demo-salary-wife', name: 'Pensja', expectedAmount: 6000, owner: 'wife', icon: '💼', isActive: true, payments: wifePayments },
      { id: 'demo-salary-husband', name: 'Pensja', expectedAmount: 4500, owner: 'husband', icon: '💼', isActive: true, payments: husbandPayments },
      { id: 'demo-freelance', name: 'Freelance', expectedAmount: 1500, owner: 'husband', icon: '💻', isActive: true, payments: [] }
    ];

    // Demo goals
    const demoGoals = [
      { id: 'demo-goal-1', name: 'Studia Kasi', icon: '🎓', type: 'oneoff', targetAmount: 50000, currentAmount: 32000, targetDate: '2026-09-01' },
      { id: 'demo-goal-2', name: 'Remont kuchni', icon: '🏠', type: 'oneoff', targetAmount: 25000, currentAmount: 5000, targetDate: '2026-12-01' },
      { id: 'demo-goal-3', name: 'Wakacje', icon: '🏖️', type: 'oneoff', targetAmount: 10000, currentAmount: 4500, targetDate: '2025-08-01' },
      { id: 'demo-goal-4', name: 'Leasing auta', icon: '🚗', type: 'recurring', monthlyContribution: 1200, startDate: '2024-01-01', endDate: '2028-07-01' },
      { id: 'demo-goal-5', name: 'Ubezpieczenie', icon: '🛡️', type: 'recurring', monthlyContribution: 350, startDate: '2025-01-01', endDate: '2025-12-01' }
    ];

    localStorage.setItem('familygoals_income_sources', JSON.stringify(demoSources));
    localStorage.setItem('familygoals_planned_override', JSON.stringify(demoGoals));
    localStorage.setItem('familygoals_income', JSON.stringify(demoIncome));
    // Demo data initialized
  }

  // ============ URL PARAMS (Deep Linking) ============
  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // ?screen=income|goals|achievements|settings
    const screen = params.get('screen');
    if (screen) {
      const screenId = `screen-${screen}`;
      if (document.getElementById(screenId)) {
        setTimeout(() => showScreen(screenId), 100);
      }
    }

    // ?action=income|expense|goal → open modal
    const action = params.get('action');
    if (action === 'income') {
      setTimeout(() => openModal('modal-income'), 200);
    } else if (action === 'goal') {
      setTimeout(() => openModal('modal-goal'), 200);
    }
  }

  // ============ INIT ============
  async function init() {
    try {
      // Init demo data if first run
      initDemoDataIfEmpty();

      // Init DataManager first
      // B-M3: JEDNA instancja dla całej aplikacji (globalny singleton z
      // data-manager.js) — druga instancja miała osobny cache i nie
      // widziała naliczeń RecurringManagera
      // Stempel do DevLoga: która paczka web realnie działa
      console.log('FamilyGoals boot: web', window.FG_WEB_VERSION || 'dev',
        typeof FGUpdater !== 'undefined' ? 'APK ' + (JSON.parse(FGUpdater.getInfo()).versionName || '?') : 'przeglądarka');

      dataManager = window.dataManager || new DataManager();
      await dataManager.init();

      // Connect EventBus for reactivity
      if (typeof connectDataManagerToEventBus !== 'undefined') {
        connectDataManagerToEventBus(dataManager);
      }

      // Process recurring expenses/income
      if (typeof RecurringManager !== 'undefined') {
        RecurringManager.processIfNeeded();
      }

      // Init GamificationManager (requires dataManager)
      if (typeof GamificationManager !== 'undefined') {
        gamificationManager = new GamificationManager(dataManager);
      }

      // Init EngagementManager (requires dataManager and gamificationManager)
      if (typeof EngagementManager !== 'undefined') {
        engagementManager = new EngagementManager(dataManager, gamificationManager);
        // Login/odznaki dopiero gdy wiadomo KTO korzysta z telefonu —
        // bez profilu picker (niżej) zrobi to po wyborze
        if (currentPerson) {
          engagementManager.recordLogin(currentPerson);
          if (gamificationManager) {
            gamificationManager.checkAchievements(currentPerson);
          }
        }
      }

      // Init AIAdvisor
      if (typeof AIAdvisor !== 'undefined') {
        aiAdvisor = new AIAdvisor(dataManager);
      }

      // Synchronizacja rodzinna: wystartuj jeśli skonfigurowana
      if (typeof syncManager !== 'undefined' && syncManager.status().configured) {
        syncManager.start();
        // Ciche sprawdzenie aktualizacji chwilę po starcie (baner na dashboardzie)
        setTimeout(() => checkForUpdatesUI(false), 5000);
      }

      // Setup UI event listeners
      setupEventListeners();

      // Subscribe to data changes for auto-refresh (debounced)
      if (typeof EventBus !== 'undefined') {
        let renderTimeout = null;
        const debouncedRender = () => {
          if (renderTimeout) clearTimeout(renderTimeout);
          renderTimeout = setTimeout(() => renderAll(), 100);
        };
        EventBus.on('data:changed', debouncedRender);
      }

      // Render UI
      renderAll();

      // Handle URL params for deep linking
      handleUrlParams();

      // Pierwsze uruchomienie: wybór, czyj to telefon (atrybucja streak/wpisów).
      // Re-check w callbacku: gdyby user zdążył wybrać zanim timer odpali
      if (!currentPerson) {
        setTimeout(() => { if (!currentPerson) openProfilePicker(); }, 600);
      }

      // Domknięcie pętli aktualizacji: potwierdzenie po udanym hot-swapie
      const justUpdated = localStorage.getItem('familygoals_just_updated');
      if (justUpdated) {
        localStorage.removeItem('familygoals_just_updated');
        setTimeout(() => Toast.success('Zaktualizowano ✓', 'Masz najnowszą wersję aplikacji'), 800);
      }

      // FamilyGoals App initialized with all managers
    } catch (err) {
      console.error('Init error:', err);
    }
  }

  // ============ EVENT LISTENERS ============
  function setupEventListeners() {
    // Month navigation
    $$('.month-arrow').forEach((btn, i) => {
      btn.addEventListener('click', () => changeMonth(i === 0 ? -1 : 1));
    });

    // Forms
    setupIncomeForm();
    setupExpenseForm();
    setupGoalForm();
    setupPaymentForm();
    setupBusinessCostForm();
    setupTodoForm();

    // Tabs
    setupIncomeTabs();
    setupTodoFilter();

    // Settings
    setupSettings();

    // Goal & Income items - delegated events
    document.addEventListener('click', handleItemClick);
  }

  function handleItemClick(e) {
    // Delete button
    if (e.target.classList.contains('delete-btn')) {
      e.stopPropagation();
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      if (type === 'income') deleteIncome(id);
      else if (type === 'goal') deleteGoal(id);
      else if (type === 'source') deleteIncomeSource(id);
      return;
    }

    // Toggle income status (Otrzymane/Oczekiwane)
    if (e.target.dataset.toggleId) {
      e.stopPropagation();
      toggleIncomeReceived(e.target.dataset.toggleId);
      return;
    }

    // Edit item
    const item = e.target.closest('[data-edit-id]');
    if (item) {
      const id = item.dataset.editId;
      const type = item.dataset.editType;
      if (type === 'goal') editGoal(id);
      else if (type === 'source') editIncomeSource(id);
    }
  }

  // ============ MONTH NAVIGATION ============
  function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderAll();
  }

  // ============ RENDER FUNCTIONS ============
  function renderAll() {
    renderDashboard();
    renderIncome();
    renderGoals();
    renderAchievements();
    renderExpenseChart();
    // C-M1: te ekrany też zależą od danych — bez nich zmiany kosztów/zadań
    // nie odświeżały dashboardu i odwrotnie
    renderOptimization();
    renderTodos();
  }

  // E-M1/E-M2: porada dnia (AIAdvisor) + alerty (AlertManager) na dashboardzie
  // — moduły istniały od dawna, ale nic ich nie wołało
  function renderAdviceAndAlerts() {
    const card = $('advice-alerts-card');
    if (!card) return;

    let html = '';
    if (aiAdvisor) {
      const tip = aiAdvisor.getDailyTip();
      html += `
        <div class="advice-card">
          <span class="advice-icon">${tip.icon}</span>
          <span class="advice-text">${escapeHtml(tip.text)}</span>
        </div>`;
    }
    if (typeof AlertManager !== 'undefined') {
      const alerts = AlertManager.getFormattedAlerts().slice(0, 3);
      html += alerts.map((a, i) => `
        <div class="alert-card alert-${a.type}">
          <span class="alert-icon">${a.icon}</span>
          <span class="alert-msg">${escapeHtml(a.message || '')}</span>
          ${a.dismissable ? `<button type="button" class="alert-dismiss" data-alert-idx="${i}" aria-label="Zamknij alert">✕</button>` : ''}
        </div>`).join('');
    }
    card.innerHTML = html;

    card.querySelectorAll('.alert-dismiss').forEach(btn => {
      btn.addEventListener('click', () => {
        const alerts = AlertManager.getFormattedAlerts();
        const alert = alerts[parseInt(btn.dataset.alertIdx, 10)];
        if (alert) {
          AlertManager.dismiss(alert);
          renderDashboard();
        }
      });
    });
  }

  function renderExpenseChart() {
    // Render expense pie chart if available
    if (typeof ExpenseChart !== 'undefined') {
      const { year, month } = getYearMonth();
      const expenses = dataManager.getExpenses ? dataManager.getExpenses(year, month) : [];

      // Generate sample expenses if none exist
      if (!expenses || expenses.length === 0) {
        const sampleExpenses = [
          { category: 'housing', amount: 2500 },
          { category: 'food', amount: 1800 },
          { category: 'transport', amount: 600 },
          { category: 'children', amount: 400 },
          { category: 'health', amount: 200 },
          { category: 'entertainment', amount: 300 }
        ];
        ExpenseChart.render(sampleExpenses);
      } else {
        ExpenseChart.render(expenses);
      }
    }
  }

  function renderDashboard() {
    const { year, month } = getYearMonth();

    // Update month badge
    const badge = $('month-badge');
    if (badge) badge.textContent = formatMonth(currentMonth);

    // Get goals and calculate required savings
    const goals = dataManager.getPlannedExpenses();
    let totalRequired = 0;

    goals.forEach(g => {
      if (g.monthlyContribution) {
        totalRequired += g.monthlyContribution;
      } else if (g.targetAmount && g.targetDate) {
        const required = dataManager.calculateRequiredMonthlySavings(
          g.targetAmount, g.currentAmount || 0, g.targetDate
        );
        totalRequired += required;
      }
    });

    // Get income summary
    const incomeSummary = dataManager.getMonthlyIncomeSummary(year, month);
    const monthStats = dataManager.getMonthlyStats(year, month);
    const savedThisMonth = monthStats.savings > 0 ? monthStats.savings : 0;

    // Update hero section
    const savingsRequired = $('savings-required');
    const savingsDone = $('savings-done');
    const savingsBar = $('savings-bar');

    if (savingsRequired) savingsRequired.textContent = formatMoney(totalRequired);
    if (savingsDone) savingsDone.textContent = formatMoney(savedThisMonth);

    const percent = totalRequired > 0 ? Math.round((savedThisMonth / totalRequired) * 100) : 0;
    if (savingsBar) savingsBar.style.width = Math.min(100, percent) + '%';

    // A-M3: tekst pod paskiem był statycznym HTML — pasek się ruszał,
    // liczby obok nie
    const savingsLeftText = $('savings-left-text');
    const savingsPercentText = $('savings-percent-text');
    if (savingsLeftText) savingsLeftText.textContent = 'Zostało: ' + formatMoney(Math.max(0, totalRequired - savedThisMonth));
    if (savingsPercentText) savingsPercentText.textContent = percent + '%';

    renderAdviceAndAlerts();

    // Update income status - show same data as Income screen
    const incomeCard = document.querySelector('.income-status-card');
    if (incomeCard) {
      // Calculate wife and husband income separately
      let wifeReceived = 0, husbandReceived = 0;
      let wifeExpected = 0, husbandExpected = 0;

      incomeSummary.sources.forEach(src => {
        if (src.owner === 'wife') {
          wifeReceived += src.totalReceived || 0;
          wifeExpected += src.expected || 0;
        } else {
          husbandReceived += src.totalReceived || 0;
          husbandExpected += src.expected || 0;
        }
      });

      const businessSavings = dataManager.calculateBusinessSavings(year, month);
      const totalReceived = incomeSummary.totalReceived + businessSavings;
      const totalExpected = incomeSummary.totalExpected + businessSavings;

      incomeCard.innerHTML = `
        <div class="income-status-row">
          <span>👩 Żona</span>
          <span class="income-value ${wifeReceived > 0 ? 'positive' : ''}">${formatMoney(wifeReceived)} / ${formatMoney(wifeExpected)}</span>
        </div>
        <div class="income-status-row">
          <span>👨 Mąż</span>
          <span class="income-value ${husbandReceived > 0 ? 'positive' : ''}">${formatMoney(husbandReceived)} / ${formatMoney(husbandExpected)}</span>
        </div>
        <div class="income-status-row">
          <span>💼 Korzyści firmowe</span>
          <span class="income-value ${businessSavings > 0 ? 'positive' : ''}">${formatMoney(businessSavings)}</span>
        </div>
        <div class="income-status-row total">
          <span>Razem</span>
          <span class="income-value ${totalReceived >= totalExpected ? 'positive' : ''}">${formatMoney(totalReceived)} / ${formatMoney(totalExpected)}</span>
        </div>
      `;
    }

    // Render chart
    renderChart(totalRequired);
  }

  function renderChart(neededIncome) {
    const container = document.querySelector('#timeline-chart-container');
    if (!container) return;

    // Okno od najwcześniejszych wpłat/źródeł do dziś (decyzja Kamila 2026-07-25)
    const trend = dataManager.getTrendByOwner('auto');
    if (!trend || trend.length === 0) {
      renderEmptyState(container, 'Brak danych o przychodach');
      return;
    }

    // Chart dimensions
    const width = 320;
    // Wyższy wykres (120→190): przy skali do ~39 tys. różnice 6–16 tys.
    // zlewały się w płaską linię
    const height = 190;
    const padding = { top: 15, right: 10, bottom: 25, left: 38 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate max for scaling (separate lines for wife and husband)
    const maxIncome = Math.max(
      1,
      ...trend.map(t => Math.max(t.wifeIncome || 0, t.husbandIncome || 0))
    );

    // Helper to calculate Y position
    const getY = (value) => {
      const percent = maxIncome > 0 ? value / maxIncome : 0;
      return padding.top + chartHeight * (1 - percent);
    };

    // Helper to calculate X position
    const getX = (index) => {
      return padding.left + (index / Math.max(1, trend.length - 1)) * chartWidth;
    };

    // Line paths (separate lines for wife and husband)
    const wifeLine = `M ${trend.map((t, i) => `${getX(i)},${getY(t.wifeIncome || 0)}`).join(' L ')}`;
    const husbandLine = `M ${trend.map((t, i) => `${getX(i)},${getY(t.husbandIncome || 0)}`).join(' L ')}`;

    // Linie TRENDU (regresja liniowa najmniejszych kwadratów) per osoba
    const linReg = (values) => {
      const n = values.length;
      if (n < 2) return null;
      let sx = 0, sy = 0, sxy = 0, sxx = 0;
      values.forEach((y, x) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
      const denom = n * sxx - sx * sx;
      if (!denom) return null;
      const b = (n * sxy - sx * sy) / denom;
      return { a: (sy - b * sx) / n, b };
    };
    const clampVal = (v) => Math.max(0, Math.min(maxIncome, v));
    const trendPath = (reg) => reg
      ? `M ${getX(0)},${getY(clampVal(reg.a))} L ${getX(trend.length - 1)},${getY(clampVal(reg.a + reg.b * (trend.length - 1)))}`
      : '';
    const wifeTrendPath = trendPath(linReg(trend.map(t => t.wifeIncome || 0)));
    const husbandTrendPath = trendPath(linReg(trend.map(t => t.husbandIncome || 0)));

    // Etykiety: adaptacyjne przerzedzenie (max ~7) + rok przy oknie >12 mies.
    const step = Math.max(1, Math.ceil(trend.length / 7));
    const multiYear = trend.length > 12;
    const labels = trend
      .map((t, i) => ({ t, i }))
      // ostatnia etykieta zawsze; krokowa odpada, gdy koliduje z ostatnią
      .filter(({ i }) => i === trend.length - 1 ||
        (i % step === 0 && trend.length - 1 - i >= Math.ceil(step / 2)))
      .map(({ t, i }) => ({
        x: getX(i),
        text: multiYear && (t.month === 0 || i === 0)
          ? `${t.monthName} '${String(t.year).slice(2)}`
          : t.monthName
      }));

    // Build SVG - simple line chart
    container.innerHTML = `
      <div class="line-chart-container">
        <svg viewBox="0 0 ${width} ${height}" class="line-chart">
          <!-- Grid lines -->
          <line x1="${padding.left}" y1="${getY(maxIncome)}" x2="${width - padding.right}" y2="${getY(maxIncome)}"
                stroke="var(--bg-subtle)" stroke-width="1"/>
          <line x1="${padding.left}" y1="${getY(maxIncome/2)}" x2="${width - padding.right}" y2="${getY(maxIncome/2)}"
                stroke="var(--bg-subtle)" stroke-width="1"/>
          <line x1="${padding.left}" y1="${getY(0)}" x2="${width - padding.right}" y2="${getY(0)}"
                stroke="var(--bg-subtle)" stroke-width="1"/>

          <!-- Oś kwot -->
          ${[maxIncome, maxIncome / 2, 0].map(v => `
            <text x="${padding.left - 5}" y="${getY(v) + 3}" text-anchor="end" class="chart-label">${
              v >= 1000 ? Math.round(v / 1000).toLocaleString('pl-PL') + ' tys.' : Math.round(v)
            }</text>
          `).join('')}

          <!-- Linie trendu (przerywane) -->
          ${wifeTrendPath ? `<path d="${wifeTrendPath}" fill="none" stroke="var(--peach)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.65"/>` : ''}
          ${husbandTrendPath ? `<path d="${husbandTrendPath}" fill="none" stroke="var(--mint-dark)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.65"/>` : ''}

          <!-- Wife line -->
          <path d="${wifeLine}" fill="none" stroke="var(--peach)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Husband line -->
          <path d="${husbandLine}" fill="none" stroke="var(--mint)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Data points -->
          ${trend.map((t, i) => `
            <circle cx="${getX(i)}" cy="${getY(t.wifeIncome || 0)}" r="3" fill="var(--peach)" stroke="white" stroke-width="1"/>
            <circle cx="${getX(i)}" cy="${getY(t.husbandIncome || 0)}" r="3" fill="var(--mint)" stroke="white" stroke-width="1"/>
          `).join('')}

          <!-- Month labels -->
          ${labels.map(l => `
            <text x="${l.x}" y="${height - 5}" text-anchor="middle" class="chart-label">${l.text}</text>
          `).join('')}
        </svg>

        <div class="chart-legend-inline">
          <span class="legend-item-inline"><span class="legend-dot" style="background:var(--peach)"></span>👩 Żona</span>
          <span class="legend-item-inline"><span class="legend-dot" style="background:var(--mint)"></span>👨 Mąż</span>
        </div>
      </div>
    `;
  }

  function renderIncome() {
    const { year, month } = getYearMonth();
    const summary = dataManager.getMonthlyIncomeSummary(year, month);

    // Update month selector
    const monthSel = document.querySelector('#screen-income .month-selector span');
    if (monthSel) monthSel.textContent = formatMonth(currentMonth);

    // Update summary card
    const summaryCard = document.querySelector('#screen-income .summary-card');
    if (summaryCard) {
      const percent = summary.totalExpected > 0
        ? Math.round((summary.totalReceived / summary.totalExpected) * 100) : 0;
      summaryCard.innerHTML = `
        <div class="summary-row">
          <span>Otrzymane</span>
          <span class="summary-value">${formatMoney(summary.totalReceived)}</span>
        </div>
        <div class="summary-row">
          <span>Oczekiwane</span>
          <span class="summary-value muted">${formatMoney(summary.totalExpected)}</span>
        </div>
        <div class="income-bar"><div class="income-bar-fill" style="width: ${percent}%"></div></div>
      `;
    }

    // Update sources list
    const list = $('income-sources-list');
    if (list) {
      list.innerHTML = summary.sources.map(src => {
        const icon = src.icon || (src.name?.includes('Pensja') ? '💼' : '💵');
        const person = src.owner === 'wife' ? 'Żona' : src.owner === 'husband' ? 'Mąż' : '';

        return `
          <div class="list-item" data-edit-id="${src.id}" data-edit-type="source">
            <div class="list-icon">${icon}</div>
            <div class="list-content">
              <div class="list-title">${escapeHtml(src.name)}${person ? ' (' + person + ')' : ''}</div>
              <div class="list-subtitle">${src.status === 'complete' ? 'Otrzymane' : 'Oczekiwane'}</div>
            </div>
            <div class="list-amount ${src.totalReceived > 0 ? 'positive' : ''}">${formatMoney(src.totalReceived || src.expected)}</div>
            <button class="list-status ${src.status === 'complete' ? 'done' : 'pending'}" data-toggle-id="${src.id}" title="Kliknij aby zmienić status">${src.status === 'complete' ? '✓' : '⏳'}</button>
            <button class="delete-btn" data-id="${src.id}" data-type="source">✕</button>
          </div>
        `;
      }).join('');

      if (summary.sources.length === 0) {
        renderEmptyState(list, 'Brak źródeł przychodów. Dodaj pierwsze!');
      }
    }

    renderAllSources();
    renderGlobalHistory();
  }

  /**
   * Historia WSZYSTKICH wpłat (oboje, wszystkie źródła), najnowsze na górze,
   * z nagłówkami miesięcy — nazwy wpłat widoczne wprost.
   */
  function renderGlobalHistory() {
    const list = $('global-history-list');
    if (!list) return;
    const entries = [];
    dataManager.getIncomeSources().forEach(src => {
      (src.payments || []).forEach(p => {
        entries.push({
          date: String(p.date || '').slice(0, 10),
          amount: p.amount || 0,
          note: p.note || '',
          type: p.type,
          srcName: src.name,
          icon: src.icon || '💵',
          ownerIcon: src.owner === 'wife' ? '👩' : '👨'
        });
      });
    });
    // Korzyści firmowe = przychód Męża (firma Męża): jednorazowe pod datą
    // realizacji, cykliczne jako naliczenie miesięczne w zakresie do dziś
    const catIcons = { subscriptions: '📱', equipment: '💻', supplies: '📦', other: '📋' };
    const bNow = new Date();
    const nowYM = `${bNow.getFullYear()}-${String(bNow.getMonth() + 1).padStart(2, '0')}`;
    dataManager.getBusinessCosts().forEach(c => {
      const icon = catIcons[c.category] || '💼';
      if (c.isRecurring && c.recurringMonths > 0) {
        const share = Math.round(c.amount / c.recurringMonths);
        const startYM = c.activeFrom || String(c.createdAt || '').slice(0, 7);
        if (!startYM || share <= 0) return;
        const endYM = c.activeTo && c.activeTo < nowYM ? c.activeTo : nowYM;
        let [y, m] = startYM.split('-').map(Number);
        let guard = 0;
        while (guard++ < 60) {
          const ym = `${y}-${String(m).padStart(2, '0')}`;
          if (ym > endYM) break;
          entries.push({ date: `${ym}-01`, amount: share, note: '', srcName: c.name, icon, ownerIcon: '👨', benefit: 'naliczenie' });
          m++; if (m > 12) { m = 1; y++; }
        }
      } else if (c.lastPurchaseDate) {
        entries.push({ date: String(c.lastPurchaseDate).slice(0, 10), amount: c.amount || 0, note: '', srcName: c.name, icon, ownerIcon: '👨', benefit: 'korzyść' });
      }
    });
    if (entries.length === 0) {
      renderEmptyState(list, 'Jeszcze żadnych wpłat');
      return;
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    const shown = entries.slice(0, 80);
    let lastMonth = null;
    list.innerHTML = shown.map(e => {
      const ym = e.date.slice(0, 7);
      let header = '';
      if (ym !== lastMonth) {
        lastMonth = ym;
        const [y, m] = ym.split('-').map(Number);
        header = `<div class="history-month-header">${FGUtils.MONTHS[m - 1]} ${y}</div>`;
      }
      const day = e.date.slice(8, 10);
      const title = e.note && !/^(Przelew|Gotówka|import z arkusza)$/.test(e.note) ? e.note : e.srcName;
      let sub = title === e.srcName
        ? `${day}.${e.date.slice(5, 7)}${e.type === 'cash' ? ' • gotówka' : ''}`
        : `${e.srcName} • ${day}.${e.date.slice(5, 7)}${e.type === 'cash' ? ' • gotówka' : ''}`;
      if (e.benefit === 'naliczenie') sub = '💼 korzyść firmowa • naliczenie mies.';
      else if (e.benefit === 'korzyść') sub = `💼 korzyść firmowa • ${day}.${e.date.slice(5, 7)}`;
      return `${header}
        <div class="list-item">
          <div class="list-icon">${e.icon}</div>
          <div class="list-content">
            <div class="list-title">${e.ownerIcon} ${escapeHtml(title)}</div>
            <div class="list-subtitle">${escapeHtml(sub)}</div>
          </div>
          <div class="list-amount positive">${formatMoney(e.amount)}</div>
        </div>`;
    }).join('') + (entries.length > shown.length
      ? `<div class="muted" style="text-align:center; padding:8px; font-size:12px;">…i ${entries.length - shown.length} starszych</div>` : '');
  }

  /**
   * Katalog WSZYSTKICH źródeł z zakresami — niezależny od wybranego
   * miesiąca (edycja zakresów bez cofania się po miesiącach).
   */
  function renderAllSources() {
    const list = $('all-sources-list');
    if (!list) return;
    const sources = dataManager.getIncomeSources()
      .slice()
      .sort((a, b) => (a.owner || '').localeCompare(b.owner || '') ||
                      String(a.activeFrom || a.forMonth || '').localeCompare(String(b.activeFrom || b.forMonth || '')));
    if (sources.length === 0) {
      renderEmptyState(list, 'Brak źródeł');
      return;
    }
    list.innerHTML = sources.map(src => {
      const ownerIcon = src.owner === 'wife' ? '👩' : '👨';
      let range;
      if (src.incomeType === 'oneoff') {
        range = `jednorazowy • ${src.forMonth || '—'}`;
      } else {
        const od = src.activeFrom || 'zawsze';
        const doo = src.activeTo || 'bezterminowo';
        range = `od ${od} do ${doo} • ${formatMoney(src.expectedAmount || 0)}/mies.`;
      }
      return `
        <div class="list-item" onclick="app.editIncomeSource('${src.id}')" role="button" tabindex="0">
          <div class="list-icon">${src.icon || '💵'}</div>
          <div class="list-content">
            <div class="list-title">${ownerIcon} ${escapeHtml(src.name)}</div>
            <div class="list-subtitle">${escapeHtml(range)}</div>
          </div>
          <div class="list-arrow">→</div>
        </div>
      `;
    }).join('');
  }

  function renderGoals() {
    const goals = dataManager.getPlannedExpenses();
    const oneoff = goals.filter(g => g.type !== 'recurring');
    const recurring = goals.filter(g => g.type === 'recurring');

    // Calculate total monthly
    let totalMonthly = 0;
    goals.forEach(g => {
      totalMonthly += g.monthlyContribution || dataManager.calculateRequiredMonthlySavings(
        g.targetAmount, g.currentAmount || 0, g.targetDate
      );
    });

    // Summary
    const summary = document.querySelector('#screen-goals .summary-card');
    if (summary) {
      summary.innerHTML = `
        <div class="summary-row">
          <span>Miesięczne oszczędności</span>
          <span class="summary-value">${formatMoney(totalMonthly)}</span>
        </div>
        <div class="summary-row">
          <span>Aktywne cele</span>
          <span class="summary-value muted">${goals.length}</span>
        </div>
      `;
    }

    // One-off goals list
    const oneoffList = $('goals-oneoff-list');
    if (oneoffList) {
      oneoffList.innerHTML = oneoff.map(g => {
        const percent = g.targetAmount > 0
          ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
        const monthly = g.monthlyContribution || dataManager.calculateRequiredMonthlySavings(
          g.targetAmount, g.currentAmount || 0, g.targetDate
        );
        const deadline = g.targetDate ? new Date(g.targetDate) : null;

        return `
          <div class="goal-item" data-edit-id="${g.id}" data-edit-type="goal">
            <div class="goal-item-header">
              <span class="goal-item-icon">${escapeHtml(g.icon) || '🎯'}</span>
              <div class="goal-item-info">
                <div class="goal-item-name">${escapeHtml(g.name)}</div>
                <div class="goal-item-date">${deadline ? formatMonth(deadline) : 'Bez terminu'}</div>
              </div>
              <div class="goal-item-monthly">${formatMoney(monthly).replace(' zł', '')}/m</div>
              <button class="delete-btn" data-id="${g.id}" data-type="goal">✕</button>
            </div>
            <div class="goal-bar"><div class="goal-bar-fill mint" style="width: ${percent}%"></div></div>
            <div class="goal-item-footer">
              <span>${formatMoney(g.currentAmount || 0)} / ${formatMoney(g.targetAmount)}</span>
              <span>${percent}%</span>
            </div>
          </div>
        `;
      }).join('');

      if (oneoff.length === 0) {
        renderEmptyState(oneoffList, 'Brak celów. Dodaj pierwszy!');
      }
    }

    // Recurring goals
    const recurringList = $('goals-recurring-list');
    if (recurringList) {
      recurringList.innerHTML = recurring.map(g => {
        // Format date range
        let dateText = '';
        if (g.startDate && g.endDate) {
          dateText = `${formatMonthShort(new Date(g.startDate))} - ${formatMonthShort(new Date(g.endDate))}`;
        } else if (g.startDate) {
          dateText = `Od ${formatMonthShort(new Date(g.startDate))}`;
        } else if (g.targetDate) {
          dateText = `Od ${formatMonth(new Date(g.targetDate))}`;
        } else {
          dateText = 'Stały wydatek';
        }

        // Check if currently active
        const now = new Date();
        const isActive = (!g.startDate || new Date(g.startDate) <= now) &&
                        (!g.endDate || new Date(g.endDate) >= now);

        return `
        <div class="goal-item future ${isActive ? 'active-recurring' : ''}" data-edit-id="${g.id}" data-edit-type="goal">
          <div class="goal-item-header">
            <span class="goal-item-icon">${escapeHtml(g.icon) || '🏦'}</span>
            <div class="goal-item-info">
              <div class="goal-item-name">${escapeHtml(g.name)}</div>
              <div class="goal-item-date">${dateText}</div>
            </div>
            <div class="goal-item-monthly warning">${formatMoney(g.monthlyContribution || g.targetAmount).replace(' zł', '')}/m</div>
            <button class="delete-btn" data-id="${g.id}" data-type="goal">✕</button>
          </div>
          ${isActive ? '' : '<div class="goal-item-warning">⏳ Jeszcze nieaktywny</div>'}
        </div>
      `;
      }).join('');

      if (recurring.length === 0) {
        renderEmptyState(recurringList, 'Brak stałych zobowiązań');
      }
    }
  }

  function renderAchievements() {
    if (!gamificationManager) return;

    const wifeData = gamificationManager.getPlayerStats('wife');
    const husbandData = gamificationManager.getPlayerStats('husband');
    const wifeUnlocked = gamificationManager.unlockedAchievements?.wife?.unlocked || [];
    const husbandUnlocked = gamificationManager.unlockedAchievements?.husband?.unlocked || [];

    // A-M2: "Ostatnio odblokowane" z realnych danych (wcześniej fałszywy
    // zahardkodowany HTML pokazywał odznaki, których nikt nie zdobył)
    const recentList = $('recent-achievements-list');
    if (recentList) {
      const recent = [
        ...gamificationManager.getRecentUnlocks('wife', 3).filter(Boolean).map(a => ({ ...a, ownerIcon: '👩' })),
        ...gamificationManager.getRecentUnlocks('husband', 3).filter(Boolean).map(a => ({ ...a, ownerIcon: '👨' }))
      ];
      if (recent.length === 0) {
        recentList.innerHTML = '<div class="empty-state">Jeszcze żadnych odznak — działajcie! 💪</div>';
      } else {
        recentList.innerHTML = recent.slice(0, 6).map(a => `
          <div class="achievement-item unlocked">
            <div class="achievement-icon">${a.icon || '🏆'}</div>
            <div class="achievement-content">
              <div class="achievement-name">${escapeHtml(a.name || '')} ${a.ownerIcon}</div>
              <div class="achievement-desc">${escapeHtml(a.description || '')}</div>
            </div>
            <div class="achievement-points">+${a.points || 0} pkt</div>
          </div>
        `).join('');
      }
    }

    // Stats cards - clickable to show person's achievements
    const statsCards = $$('#screen-achievements .stat-card');
    if (statsCards.length >= 2) {
      statsCards[0].innerHTML = `
        <div class="stat-icon">👩</div>
        <div class="stat-value">${wifeData?.points || 0} pkt</div>
        <div class="stat-label">Żona • ${wifeData?.unlockedCount || 0}/${wifeData?.totalCount || 105}</div>
      `;
      statsCards[0].onclick = () => showPersonAchievements('wife');

      statsCards[1].innerHTML = `
        <div class="stat-icon">👨</div>
        <div class="stat-value">${husbandData?.points || 0} pkt</div>
        <div class="stat-label">Mąż • ${husbandData?.unlockedCount || 0}/${husbandData?.totalCount || 105}</div>
      `;
      statsCards[1].onclick = () => showPersonAchievements('husband');
    }

    // Streak (fallback wife tylko do WYŚWIETLENIA przed wyborem profilu)
    if (engagementManager) {
      const streakStats = engagementManager.getStreakStats(currentPerson || 'wife');
      const streak = streakStats?.currentStreak || 0;
      const mult = streakStats?.multiplier || 1;
      const streakCard = document.querySelector('.streak-card');
      if (streakCard) {
        streakCard.innerHTML = `
          <div class="streak-info">
            <span class="streak-days">${streak} dni</span>
            <span class="streak-label">z rzędu</span>
          </div>
          <div class="streak-bonus">Mnożnik: ${mult}x</div>
          <div class="income-bar"><div class="income-bar-fill" style="width: ${Math.min(100, (streak / 30) * 100)}%"></div></div>
          <div class="streak-footer">Do 30 dni: jeszcze ${Math.max(0, 30 - streak)}</div>
        `;
      }
    }

    // Categories progress
    const catList = document.querySelector('#screen-achievements .list:last-of-type');
    if (catList) {
      // D-C2: lista kategorii liczona z realnie zdobywalnych — puste
      // kategorie (couple/special/consistency) znikają same
      const allAchievements = GamificationManager.getEarnableAchievements();
      const catCounts = {};

      allAchievements.forEach(a => {
        if (!catCounts[a.category]) {
          catCounts[a.category] = { total: 0, unlocked: 0 };
        }
        catCounts[a.category].total++;
        if (wifeUnlocked.includes(a.id) || husbandUnlocked.includes(a.id)) {
          catCounts[a.category].unlocked++;
        }
      });

      const catNames = FGUtils.ACHIEVEMENT_CATEGORY_NAMES;

      catList.innerHTML = Object.entries(catCounts).map(([cat, data]) => {
        const percent = data.total > 0 ? Math.round((data.unlocked / data.total) * 100) : 0;
        return `
          <div class="category-progress" onclick="app.showAchievementCategory('${cat}')">
            <span>${catNames[cat] || cat}</span>
            <div class="income-bar small"><div class="income-bar-fill" style="width: ${percent}%"></div></div>
            <span>${data.unlocked}/${data.total}</span>
          </div>
        `;
      }).join('');
    }
  }

  // ============ CRUD OPERATIONS ============

  // Income Sources
  function setupIncomeForm() {
    const form = document.querySelector('#modal-income form');
    if (!form) return;

    // Pola od–do chowają się dla typu jednorazowego (globalny handler chipów
    // ustawia .active w tym samym kliknięciu — odczyt po zakończeniu eventu)
    const typeChipsBox = $('income-type-chips');
    if (typeChipsBox) {
      typeChipsBox.addEventListener('click', () => setTimeout(updateIncomeRangeVisibility, 0));
    }

    form.onsubmit = e => {
      e.preventDefault();

      try {
        const amount = parseFloat(form.querySelector('input[type="number"]').value) || 0;
        if (amount <= 0) {
          alert('Wprowadź poprawną kwotę');
          return;
        }

        const sourceChip = form.querySelector('.chips .chip.active');
        const sourceName = sourceChip?.textContent.trim().split(' ').pop() || 'Inne';
        const personChip = form.querySelectorAll('.chips')[1]?.querySelector('.chip.active');
        let owner = personChip?.textContent.includes('Żona') ? 'wife' : 'husband';
        // Twarda zasada: NOWY wpis zawsze za siebie (obrona w głąb —
        // chipy współmałżonka są już zablokowane w applyProfileDefaults)
        if (!editingSourceId && currentPerson) owner = currentPerson;
        const typeChip = document.querySelector('#income-type-chips .chip.active');
        const incomeType = typeChip?.dataset.value || 'recurring';
        const dateInput = form.querySelector('input[type="date"]').value;
        const { year, month } = getYearMonth();
        // If no date selected, default to 1st of currently viewed month
        const date = dateInput || `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const note = form.querySelector('input[type="text"]')?.value || '';
        const forMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
        // Zakres obowiązywania cyklicznych (od–do); puste od = oglądany miesiąc
        const activeFrom = incomeType === 'oneoff' ? null : ($('income-active-from')?.value || forMonth);
        const activeTo = incomeType === 'oneoff' ? null : ($('income-active-to')?.value || null);
        if (activeFrom && activeTo && activeTo < activeFrom) {
          alert('„Do" nie może być wcześniejsze niż „od"');
          return;
        }

        let source;

        if (editingSourceId) {
          // Update existing source
          source = dataManager.getIncomeSources().find(s => s.id === editingSourceId);
          if (source) {
            dataManager.updateIncomeSource(editingSourceId, {
              name: sourceName,
              expectedAmount: amount,
              owner,
              incomeType,
              forMonth: incomeType === 'oneoff' ? forMonth : null,
              activeFrom,
              activeTo,
              icon: sourceName === 'Pensja' ? '💼' : sourceName === 'Freelance' ? '💻' : '💵'
            });
          }
          editingSourceId = null;
        } else {
          // For oneoff, always create new. For recurring, check if exists
          const sources = dataManager.getIncomeSources();
          source = incomeType === 'recurring'
            ? sources.find(s => s.name === sourceName && s.owner === owner && s.incomeType !== 'oneoff')
            : null;

          if (!source) {
            // Create new source
            source = dataManager.addIncomeSource({
              name: sourceName,
              expectedAmount: amount,
              owner,
              incomeType,
              forMonth: incomeType === 'oneoff' ? forMonth : null,
              activeFrom,
              activeTo,
              icon: sourceName === 'Pensja' ? '💼' : sourceName === 'Freelance' ? '💻' : '💵'
            });
          }

          // Record payment
          dataManager.recordPayment(source.id, { amount, date, note });
        }

        // Check achievements
        if (gamificationManager) {
          const newAchievements = gamificationManager.checkAchievements(owner);
          if (newAchievements.length > 0) {
            // New achievements unlocked
            // Show achievement toast
            if (typeof Toast !== 'undefined') {
              newAchievements.forEach(a => {
                Toast.success('🏆 Osiągnięcie!', a.name || 'Nowe osiągnięcie odblokowane!');
              });
            }
          }
        }

        closeAllModals();
        renderAll();

        // Show success toast
        if (typeof Toast !== 'undefined') {
          Toast.success('Zapisano!', `Przychód ${formatMoney(amount)} dodany`);
        }
      } catch (err) {
        console.error('Income form error:', err);
        if (typeof Toast !== 'undefined') {
          Toast.error('Błąd', 'Nie udało się zapisać przychodu');
        } else {
          alert('Wystąpił błąd przy zapisywaniu przychodu');
        }
      }
    };
  }

  // Payment modal state
  let currentPaymentSourceId = null;

  function toggleIncomeReceived(sourceId) {
    openPaymentModal(sourceId);
  }

  /**
   * "Dodaj wpłatę" z plusika na dashboardzie (decyzja Kamila 2026-07-25:
   * wpłata = akcja codzienna; źródła zmienia się rzadko, z ekranu Przychody).
   * 1 własne źródło -> od razu okno wpłaty; kilka -> wybór; 0 -> formularz źródła.
   */
  function openAddPayment() {
    try {
      openAddPaymentInner_();
    } catch (err) {
      // Cichy fail na urządzeniu = niediagnozowalny; głośny = zrzut z DevLoga
      console.error('openAddPayment:', err);
      Toast.error('Błąd "Dodaj wpłatę"', String(err && err.message || err));
    }
  }

  function openAddPaymentInner_() {
    closeAllModals();
    const { year, month } = getYearMonth();
    const own = dataManager.getIncomeSourcesStatus(year, month)
      .filter(s => !currentPerson || s.owner === currentPerson);
    if (own.length === 0) {
      Toast.info('Brak źródeł', 'Najpierw dodaj swoje źródło przychodu');
      openModal('modal-income');
      return;
    }
    if (own.length === 1) {
      openPaymentModal(own[0].id);
      return;
    }
    const modal = createDynamicModal('modal-pick-source', '💸 Do którego źródła?', own.map(s => `
      <button type="button" class="modal-menu-item" onclick="app.pickPaymentSource('${s.id}')">
        <span class="modal-menu-icon">${s.icon || '💵'}</span>
        <span>${escapeHtml(s.name)}${s.remaining > 0 ? ' • brakuje ' + formatMoney(s.remaining) : ' • ✓ komplet'}</span>
      </button>`).join(''));
    modal.classList.add('active');
  }

  function pickPaymentSource(sourceId) {
    closeAllModals();
    openPaymentModal(sourceId);
  }

  function openPaymentModal(sourceId) {
    const { year, month } = getYearMonth();
    const summary = dataManager.getMonthlyIncomeSummary(year, month);
    const source = summary.sources.find(s => s.id === sourceId);

    if (!source) return;

    currentPaymentSourceId = sourceId;

    // Domyślna data: dziś (bieżący miesiąc) albo 15. oglądanego miesiąca
    const dateEl = $('payment-date');
    if (dateEl) {
      const now = new Date();
      dateEl.value = (year === now.getFullYear() && month === now.getMonth())
        ? `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        : `${year}-${String(month + 1).padStart(2, '0')}-15`;
    }

    // Update modal header info
    const sourceInfo = $('payment-source-info');
    if (sourceInfo) {
      sourceInfo.querySelector('.payment-source-name').textContent = source.name;
      sourceInfo.querySelector('.payment-source-expected').textContent =
        `Oczekiwane: ${formatMoney(source.expected)} | Otrzymane: ${formatMoney(source.totalReceived || 0)}`;
    }

    // Render payment history
    renderPaymentHistory(sourceId, year, month);

    // Reset form
    const amountInput = $('payment-amount');
    if (amountInput) amountInput.value = source.expected;

    // Reset type chips
    const typeChips = $('payment-type-chips');
    if (typeChips) {
      typeChips.querySelectorAll('.chip').forEach((c, i) => {
        c.classList.toggle('active', i === 0);
      });
    }

    // Open modal
    const modal = $('modal-payment');
    if (modal) modal.classList.add('active');
  }

  function renderPaymentHistory(sourceId, year, month) {
    const container = $('payment-history');
    if (!container) return;

    const payments = dataManager.getPaymentsByMonth(sourceId, year, month);

    if (payments.length === 0) {
      container.innerHTML = '<div class="payment-history-empty">Brak wpłat w tym miesiącu</div>';
      return;
    }

    container.innerHTML = payments.map(p => {
      const date = new Date(p.date);
      const typeIcon = p.type === 'cash' ? '💵' : '💳';
      return `
        <div class="payment-history-item">
          <div class="payment-info">
            <span class="payment-type">${typeIcon}</span>
            <div>
              <div class="payment-amount">${formatMoney(p.amount)}</div>
              <div class="payment-date">${date.toLocaleDateString('pl-PL')}</div>
            </div>
          </div>
          <button class="payment-delete" data-payment-id="${p.id}" title="Usuń wpłatę">✕</button>
        </div>
      `;
    }).join('');

    // Add delete handlers
    container.querySelectorAll('.payment-delete').forEach(btn => {
      btn.onclick = () => deletePayment(btn.dataset.paymentId);
    });
  }

  function deletePayment(paymentId) {
    if (!currentPaymentSourceId) return;

    if (dataManager.deletePayment(currentPaymentSourceId, paymentId)) {
      const { year, month } = getYearMonth();
      renderPaymentHistory(currentPaymentSourceId, year, month);
      renderAll();

      // Update modal header
      const summary = dataManager.getMonthlyIncomeSummary(year, month);
      const source = summary.sources.find(s => s.id === currentPaymentSourceId);
      if (source) {
        const sourceInfo = $('payment-source-info');
        if (sourceInfo) {
          sourceInfo.querySelector('.payment-source-expected').textContent =
            `Oczekiwane: ${formatMoney(source.expected)} | Otrzymane: ${formatMoney(source.totalReceived || 0)}`;
        }
      }

      if (typeof Toast !== 'undefined') {
        Toast.info('Usunięto', 'Wpłata została usunięta');
      }
    }
  }

  function setupPaymentForm() {
    const form = $('payment-form');
    if (!form) return;

    form.onsubmit = e => {
      e.preventDefault();

      if (!currentPaymentSourceId) return;

      const amount = parseFloat($('payment-amount')?.value) || 0;
      if (amount <= 0) {
        alert('Wprowadź poprawną kwotę');
        return;
      }

      const typeChip = $('payment-type-chips')?.querySelector('.chip.active');
      const type = typeChip?.dataset.type || 'transfer';

      // Data z kalendarza (decyzja Kamila 2026-07-25); fallback: 1. dzień
      // oglądanego miesiąca. Nazwa od usera; fallback: typ wpłaty.
      const { year: payYear, month: payMonth } = getYearMonth();
      const dateInput = $('payment-date')?.value;
      const payDate = dateInput || new Date(payYear, payMonth, 1).toISOString();
      const noteInput = $('payment-note')?.value?.trim();

      dataManager.recordPayment(currentPaymentSourceId, {
        amount,
        type,
        date: payDate,
        note: noteInput || (type === 'cash' ? 'Gotówka' : 'Przelew')
      });
      const noteEl = $('payment-note');
      if (noteEl) noteEl.value = '';

      const { year, month } = getYearMonth();
      renderPaymentHistory(currentPaymentSourceId, year, month);
      renderAll();

      // Update modal header
      const summary = dataManager.getMonthlyIncomeSummary(year, month);
      const source = summary.sources.find(s => s.id === currentPaymentSourceId);
      if (source) {
        const sourceInfo = $('payment-source-info');
        if (sourceInfo) {
          sourceInfo.querySelector('.payment-source-expected').textContent =
            `Oczekiwane: ${formatMoney(source.expected)} | Otrzymane: ${formatMoney(source.totalReceived || 0)}`;
        }
      }

      // Reset amount
      $('payment-amount').value = '';

      if (typeof Toast !== 'undefined') {
        Toast.success('Dodano!', `Wpłata: ${formatMoney(amount)}`);
      }
    };
  }

  function deleteIncomeSource(id) {
    const src = dataManager.getIncomeSources().find(s => s.id === id);
    if (src && !confirmOtherOwner(src.owner, 'usunąć')) return;
    if (!confirm('Usunąć to źródło przychodu?')) return;
    dataManager.deleteIncomeSource(id);
    renderAll();
    if (typeof Toast !== 'undefined') {
      Toast.info('Usunięto', 'Źródło przychodu zostało usunięte');
    }
  }

  function editIncomeSource(id) {
    const source = dataManager.getIncomeSources().find(s => s.id === id);
    if (!source) return;
    if (!confirmOtherOwner(source.owner, 'edytować')) return;

    // Open modal FIRST (closeAllModals resets editingSourceId via resetEditState)
    openModal('modal-income');

    // Set edit state AFTER openModal so resetEditState doesn't clear it
    editingSourceId = id;

    const modal = $('modal-income');
    const form = modal.querySelector('form');

    // Prefill form
    form.querySelector('input[type="number"]').value = source.expectedAmount || '';

    // Set source chip
    const sourceChips = form.querySelectorAll('.chips')[0].querySelectorAll('.chip');
    sourceChips.forEach(c => {
      c.classList.remove('active');
      const chipName = c.textContent.trim().split(' ').pop();
      if (source.name && source.name.includes(chipName)) {
        c.classList.add('active');
      }
    });

    // Set person chip
    const personChips = form.querySelectorAll('.chips')[1]?.querySelectorAll('.chip');
    if (personChips && personChips.length >= 2) {
      personChips.forEach(c => c.classList.remove('active'));
      if (source.owner === 'wife') {
        personChips[0].classList.add('active');
      } else {
        personChips[1].classList.add('active');
      }
    }

    // Set type chip
    const typeChips = document.querySelectorAll('#income-type-chips .chip');
    typeChips.forEach(c => {
      c.classList.remove('active');
      if (c.dataset.value === (source.incomeType || 'recurring')) {
        c.classList.add('active');
      }
    });

    // Zakres od–do (cykliczne)
    const fromInput = $('income-active-from');
    const toInput = $('income-active-to');
    if (fromInput) fromInput.value = source.activeFrom || '';
    if (toInput) toInput.value = source.activeTo || '';
    updateIncomeRangeVisibility();

    // Update modal title
    modal.querySelector('.modal-header h2').textContent = '💵 Edytuj źródło';
  }

  // Goals
  function setupGoalForm() {
    const form = document.querySelector('#modal-goal form');
    if (!form) return;

    // Dynamic calculation of monthly needs
    function updateCalculatedNeeds() {
      const targetEl = $('goal-target');
      const savedEl = $('goal-saved');
      const deadlineEl = $('goal-deadline');
      const calcEl = document.querySelector('#modal-goal .calculated-value');

      if (!calcEl) return;

      const target = parseFloat(targetEl?.value) || 0;
      const saved = parseFloat(savedEl?.value) || 0;
      const deadline = deadlineEl?.value;

      if (target <= 0 || !deadline) {
        calcEl.textContent = '-- zł/mies.';
        return;
      }

      const remaining = target - saved;
      if (remaining <= 0) {
        calcEl.textContent = '0 zł/mies.';
        return;
      }

      const now = new Date();
      // Validate date format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(deadline)) {
        calcEl.textContent = '-- zł/mies.';
        return;
      }
      const targetDate = new Date(deadline + '-01');
      if (isNaN(targetDate.getTime())) {
        calcEl.textContent = '-- zł/mies.';
        return;
      }
      const monthsLeft = Math.max(1,
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth())
      );

      const monthly = Math.ceil(remaining / monthsLeft);
      calcEl.textContent = formatMoney(monthly) + '/mies.';
    }

    // Attach listeners for dynamic calculation
    ['goal-target', 'goal-saved', 'goal-deadline'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', updateCalculatedNeeds);
    });

    // Type switching - show/hide fields based on type
    const typeChips = $('goal-type-chips');
    if (typeChips) {
      typeChips.addEventListener('click', e => {
        if (e.target.classList.contains('chip')) {
          const isRecurring = e.target.dataset.type === 'recurring';
          toggleGoalFormType(isRecurring);
        }
      });
    }

    form.onsubmit = e => {
      e.preventDefault();

      try {
        const name = form.querySelector('input[type="text"]').value;
        if (!name || name.trim() === '') {
          alert('Wprowadź nazwę celu');
          return;
        }

        const typeChip = form.querySelector('#goal-type-chips .chip.active');
        const type = typeChip?.dataset.type || 'oneoff';
        const icon = form.querySelectorAll('.chips')[1]?.querySelector('.chip.active')?.textContent || '🎯';

        let goalData;

        if (type === 'recurring') {
          // Stały wydatek - z zakresem dat
          const monthly = parseFloat($('goal-monthly')?.value) || 0;
          if (monthly <= 0) {
            alert('Wprowadź poprawną kwotę miesięczną');
            return;
          }
          const startDate = $('goal-start-date')?.value;
          const endDate = $('goal-end-date')?.value;

          goalData = {
            name,
            type: 'recurring',
            monthlyContribution: monthly,
            targetAmount: monthly, // dla wyświetlania
            startDate: startDate ? startDate + '-01' : null,
            endDate: endDate ? endDate + '-01' : null,
            icon
          };
        } else {
          // Jednorazowy cel
          const target = parseFloat($('goal-target')?.value) || 0;
          if (target <= 0) {
            alert('Wprowadź poprawną kwotę docelową');
            return;
          }
          const saved = parseFloat($('goal-saved')?.value) || 0;
          const deadline = $('goal-deadline')?.value;

          goalData = {
            name,
            type: 'oneoff',
            targetAmount: target,
            currentAmount: saved,
            targetDate: deadline ? deadline + '-01' : null,
            icon
          };
        }

        if (editingGoalId) {
          dataManager.updatePlannedGoal(editingGoalId, goalData);
          editingGoalId = null;
        } else {
          dataManager.addPlannedGoal(goalData);
        }

        // Check achievements
        if (gamificationManager) {
          gamificationManager.checkAchievements(currentPerson);
        }

        closeAllModals();
        renderAll();

        // Show success toast
        if (typeof Toast !== 'undefined') {
          Toast.success('Zapisano!', `Cel "${goalData.name}" ${editingGoalId ? 'zaktualizowany' : 'utworzony'}`);
        }
      } catch (err) {
        console.error('Goal form error:', err);
        if (typeof Toast !== 'undefined') {
          Toast.error('Błąd', 'Nie udało się zapisać celu');
        } else {
          alert('Wystąpił błąd przy zapisywaniu celu');
        }
      }
    };
  }

  function toggleGoalFormType(isRecurring) {
    // Pola dla jednorazowych (teraz w form-row)
    const amountsRow = $('goal-amounts-row');
    const deadlineGroup = $('goal-deadline-group');

    // Pola dla stałych
    const daterangeGroup = $('goal-daterange-group');
    const monthlyGroup = $('goal-monthly-group');

    if (isRecurring) {
      // Stały wydatek
      if (amountsRow) amountsRow.style.display = 'none';
      if (deadlineGroup) deadlineGroup.style.display = 'none';
      if (daterangeGroup) daterangeGroup.style.display = 'block';
      if (monthlyGroup) monthlyGroup.style.display = 'block';

      // Set default dates
      const now = new Date();
      const startInput = $('goal-start-date');
      const endInput = $('goal-end-date');
      if (startInput && !startInput.value) {
        startInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      if (endInput && !endInput.value) {
        endInput.value = `${now.getFullYear() + 2}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
    } else {
      // Jednorazowy cel
      if (amountsRow) amountsRow.style.display = '';
      if (deadlineGroup) deadlineGroup.style.display = 'block';
      if (daterangeGroup) daterangeGroup.style.display = 'none';
      if (monthlyGroup) monthlyGroup.style.display = 'none';
    }
  }

  function deleteGoal(id) {
    if (!confirm('Usunąć ten cel?')) return;
    dataManager.deletePlannedGoal(id);
    renderAll();
    if (typeof Toast !== 'undefined') {
      Toast.info('Usunięto', 'Cel został usunięty');
    }
  }

  function editGoal(id) {
    const goal = dataManager.getPlannedExpenses().find(g => g.id === id);
    if (!goal) return;

    // Open modal FIRST (closeAllModals resets editingGoalId via resetEditState)
    openModal('modal-goal');

    // Set edit state AFTER openModal so resetEditState doesn't clear it
    editingGoalId = id;

    const modal = $('modal-goal');
    const form = modal.querySelector('form');
    const isRecurring = goal.type === 'recurring';

    // Prefill name
    form.querySelector('input[type="text"]').value = goal.name || '';

    // Set type chip and toggle form
    const typeChips = $('goal-type-chips')?.querySelectorAll('.chip');
    if (typeChips) {
      typeChips.forEach(c => c.classList.remove('active'));
      if (isRecurring) {
        typeChips[1].classList.add('active');
      } else {
        typeChips[0].classList.add('active');
      }
    }
    toggleGoalFormType(isRecurring);

    if (isRecurring) {
      // Stały wydatek
      const monthlyInput = $('goal-monthly');
      if (monthlyInput) monthlyInput.value = goal.monthlyContribution || goal.targetAmount || '';

      const startInput = $('goal-start-date');
      if (startInput && goal.startDate) startInput.value = goal.startDate.slice(0, 7);

      const endInput = $('goal-end-date');
      if (endInput && goal.endDate) endInput.value = goal.endDate.slice(0, 7);
    } else {
      // Jednorazowy cel
      const targetInput = $('goal-target');
      if (targetInput) targetInput.value = goal.targetAmount || '';

      const savedInput = $('goal-saved');
      if (savedInput) savedInput.value = goal.currentAmount || 0;

      const deadlineInput = $('goal-deadline');
      if (deadlineInput && goal.targetDate) deadlineInput.value = goal.targetDate.slice(0, 7);
    }

    // Set icon chip
    const iconChips = form.querySelectorAll('.chips')[1]?.querySelectorAll('.chip');
    if (iconChips && goal.icon) {
      iconChips.forEach(c => {
        c.classList.remove('active');
        if (c.textContent.trim() === goal.icon) {
          c.classList.add('active');
        }
      });
    }

    // Update modal title
    modal.querySelector('.modal-header h2').textContent = '🎯 Edytuj cel';
  }

  // Expenses
  function setupExpenseForm() {
    const form = document.querySelector('#modal-expense form');
    if (!form) return;

    form.onsubmit = e => {
      e.preventDefault();

      try {
        const amount = parseFloat(form.querySelector('input[type="number"]').value) || 0;
        if (amount <= 0) {
          alert('Wprowadź poprawną kwotę');
          return;
        }

        const catChip = form.querySelector('.chips .chip.active');
        const categoryId = catChip?.dataset.categoryId || 'other';
        const desc = form.querySelector('input[type="text"]').value;
        const date = form.querySelector('input[type="date"]').value;

        dataManager.addExpense({
          amount,
          categoryId,
          description: desc,
          date
        });

        if (gamificationManager) {
          const newAchievements = gamificationManager.checkAchievements(currentPerson);
          if (newAchievements.length > 0) {
            // New achievements unlocked
          }
        }

        closeAllModals();
        renderAll();
      } catch (err) {
        console.error('Expense form error:', err);
        alert('Wystąpił błąd przy zapisywaniu wydatku');
      }
    };
  }

  // ============ SETTINGS ============
  function setupSettings() {
    const items = $$('#screen-settings .list-item');
    if (items.length >= 5) {
      items[0].onclick = changePin;
      items[1].onclick = openCategoriesModal;
      items[2].onclick = exportData;
      items[3].onclick = importData;
      items[4].onclick = clearData;
    }
    const syncBtn = $('btn-sync');
    if (syncBtn) syncBtn.onclick = openSyncModal;
    setupSyncForm();
    const updatesBtn = $('btn-updates');
    if (updatesBtn) updatesBtn.onclick = () => checkForUpdatesUI(true);
    const profileBtn = $('btn-profile');
    if (profileBtn) profileBtn.onclick = openProfilePicker;
    setupProfilePicker();
    refreshProfileUI();
  }

  // ============ PROFIL URZĄDZENIA ============

  const PERSON_LABEL = { wife: '👩 Żona', husband: '👨 Mąż' };

  /** Widoczny numer wersji: APK (mostek) + paczka web — koniec zgadywania,
      co jest zainstalowane na urządzeniu. */
  function refreshVersionLine() {
    const el = $('app-version-line');
    if (!el) return;
    let apk = 'przeglądarka';
    let web = window.FG_WEB_VERSION || 'dev';
    if (typeof window.FGUpdater !== 'undefined') {
      try {
        const info = JSON.parse(window.FGUpdater.getInfo());
        apk = 'v' + (info.versionName || '?');
        if (info.webBundleVersion) web = info.webBundleVersion;
      } catch (e) { /* zostają wartości domyślne */ }
    }
    const webShort = String(web).replace('T', ' ').replace(/:\d\dZ?$/, '').replace('Z', '');
    el.textContent = `FamilyGoals ${apk} • web ${webShort}`;
  }

  function refreshProfileUI() {
    refreshVersionLine();
    const status = $('profile-item-status');
    if (status) status.textContent = currentPerson ? PERSON_LABEL[currentPerson] : 'nie wybrano';
    // DevLog = narzędzie deweloperskie: widoczny wyłącznie na profilu Męża.
    // Jedna implementacja w inline-skrypcie DevLoga (działa też gdy init padnie)
    if (typeof devlogSyncVisibility === 'function') devlogSyncVisibility();
  }

  function openProfilePicker() {
    // openModal to funkcja inline z index.html — w harnessie testowym jej nie ma
    if (typeof openModal === 'undefined') return;
    openModal('modal-profile');
  }

  function setupProfilePicker() {
    $$('#modal-profile .profile-choice').forEach(btn => {
      btn.onclick = () => setDeviceProfile(btn.dataset.person);
    });
  }

  function setDeviceProfile(person) {
    if (person !== 'wife' && person !== 'husband') return;
    const first = !currentPerson;
    currentPerson = person;
    localStorage.setItem('familygoals_device_profile', person);
    closeAllModals();
    refreshProfileUI();
    // Atrybucja od razu: login/streak/odznaki dla właściwej osoby
    if (engagementManager) engagementManager.recordLogin(person);
    if (gamificationManager) gamificationManager.checkAchievements(person);
    renderAll();
    Toast.success('Profil ustawiony', `Ten telefon: ${PERSON_LABEL[person]}`);
    if (first && typeof syncManager !== 'undefined') syncManager.syncNow?.();
  }

  /** Pola od–do tylko dla typu cyklicznego. */
  function updateIncomeRangeVisibility() {
    const group = $('income-range-group');
    if (!group) return;
    const type = document.querySelector('#income-type-chips .chip.active')?.dataset.value || 'recurring';
    group.style.display = type === 'oneoff' ? 'none' : '';
  }

  /** Domyślny właściciel nowego wpisu = osoba tego telefonu (wołane z openModal). */
  function applyProfileDefaults() {
    updateIncomeRangeVisibility();
    if (!currentPerson || editingSourceId) return;
    // Chipy osoby = DRUGA grupa .chips w formularzu przychodu (jak w submit
    // handlerze — pozycyjnie, brak id w HTML).
    // Zasada Kamila (2026-07-24): każdy DODAJE wyłącznie za siebie —
    // chip współmałżonka zablokowany (wydatki dostaną to samo po powrocie
    // z archiwum). Edycja cudzych: osobna ścieżka za confirmem.
    const form = document.querySelector('#modal-income form');
    const chips = form?.querySelectorAll('.chips')[1]?.querySelectorAll('.chip');
    if (!chips) return;
    chips.forEach(c => {
      const mine = (c.textContent.includes('Żona') ? 'wife' : 'husband') === currentPerson;
      c.classList.toggle('active', mine);
      c.disabled = !mine;
      c.classList.toggle('chip-locked', !mine);
    });
  }

  /** Miękka ochrona: zmiana/kasowanie pozycji WSPÓŁMAŁŻONKA wymaga potwierdzenia. */
  function confirmOtherOwner(owner, action) {
    if (!currentPerson || !owner || owner === 'both' || owner === currentPerson) return true;
    const label = owner === 'wife' ? 'Żony' : 'Męża';
    return confirm(`To pozycja ${label}. Na pewno ${action}?`);
  }

  // ============ AKTUALIZACJE (OTA) ============

  async function checkForUpdatesUI(interactive) {
    if (typeof updateManager === 'undefined') return;
    // Cichy auto-check bez skonfigurowanego sync = gwarantowany błąd w logu;
    // interaktywnie mówimy userowi, czego brakuje
    if (typeof syncManager === 'undefined' || !syncManager.status().configured) {
      if (interactive) Toast.info('Aktualizacje', 'Najpierw skonfiguruj Synchronizację rodzinną');
      return;
    }
    const banner = $('update-banner');
    const itemStatus = $('update-item-status');
    try {
      const r = await updateManager.check();
      if (r.reason === 'no_bridge') {
        if (itemStatus) itemStatus.textContent = 'dostępne w aplikacji na telefonie';
        if (interactive) Toast.info('Aktualizacje', 'Działają w zainstalowanej aplikacji');
        return;
      }
      if (!r.available) {
        if (banner) banner.innerHTML = '';
        if (itemStatus) itemStatus.textContent = `masz najnowszą wersję (${r.local.versionName || r.local.web})`;
        if (interactive) Toast.success('Aktualizacje', 'Masz najnowszą wersję');
        return;
      }
      const label = r.apkUpdate
        ? `Nowa wersja aplikacji ${r.remote.apkVersionName || ''}`.trim()
        : 'Nowa wersja dostępna';
      if (itemStatus) itemStatus.textContent = 'dostępna aktualizacja!';
      if (banner) {
        banner.innerHTML = `
          <div class="update-banner">
            <span>🔄 ${escapeHtml(label)}!</span>
            <button type="button" class="btn-primary btn-update" id="btn-do-update">Aktualizuj</button>
          </div>`;
        const btn = $('btn-do-update');
        if (btn) btn.onclick = doUpdate;
      }
      // Klik z Ustawień: nie odsyłamy usera do banera na Starcie —
      // proponujemy aktualizację OD RAZU (luka UX zgłoszona przez Kamila)
      if (interactive && confirm(`${label}. Zaktualizować teraz?`)) {
        await doUpdate();
      }
    } catch (err) {
      // Offline/timeout przy cichym auto-checku to normalność, nie błąd
      if (interactive) console.error('checkForUpdates:', err && err.message || err);
      else console.warn('checkForUpdates (cichy):', err && err.message || err);
      if (interactive) Toast.error('Aktualizacje', 'Nie udało się sprawdzić: ' + (err.message || err));
    }
  }

  async function doUpdate() {
    const btn = $('btn-do-update');
    if (btn) { btn.disabled = true; btn.textContent = 'Pobieranie…'; }
    Toast.info('Aktualizacja', 'Pobieranie nowej wersji…');
    try {
      const r = await updateManager.check();
      if (r.apkUpdate) {
        // Nowe opakowanie: pobierz APK i odpal systemowy instalator
        await updateManager.applyApkUpdate();
        Toast.info('Instalator', 'Potwierdź instalację w oknie systemowym');
      } else if (r.webUpdate) {
        // Nowe pliki aplikacji: hot-swap + przeładowanie (bez instalatora).
        // Flaga -> po restarcie pokazujemy "Zaktualizowano ✓" (domknięcie UX)
        localStorage.setItem('familygoals_just_updated', String(r.remote.webVersion || ''));
        await updateManager.applyWebUpdate();
      }
    } catch (err) {
      console.error('doUpdate error:', err);
      localStorage.removeItem('familygoals_just_updated');
      Toast.error('Aktualizacja nieudana', String(err.message || err));
      if (btn) { btn.disabled = false; btn.textContent = 'Aktualizuj'; }
    }
  }

  // ============ SYNCHRONIZACJA RODZINNA ============

  function syncConfig_() {
    return safeJsonParse(localStorage.getItem('familygoals_sync_config'), null);
  }

  function refreshSyncStatusUI() {
    const cfg = syncConfig_();
    const itemStatus = $('sync-item-status');
    const line = $('sync-status-line');
    const disconnectBtn = $('sync-disconnect');
    if (itemStatus) itemStatus.textContent = cfg ? 'aktywna ✓' : 'nieskonfigurowana';
    if (disconnectBtn) disconnectBtn.style.display = cfg ? '' : 'none';
    if (line && typeof syncManager !== 'undefined') {
      const s = syncManager.status();
      line.textContent = cfg
        ? `Kolejka: ${s.queueLength} • Ostatni sync: ${s.lastSync ? s.lastSync.slice(11, 19) : '—'}${s.lastError ? ' • Błąd: ' + s.lastError : ''}`
        : 'Podaj URL backendu i wspólny token rodziny (te same na obu telefonach).';
    }
  }

  function openSyncModal() {
    const cfg = syncConfig_();
    if (cfg) {
      const urlInput = $('sync-url');
      const tokenInput = $('sync-token');
      if (urlInput) urlInput.value = cfg.url || '';
      if (tokenInput) tokenInput.value = cfg.token || '';
    }
    refreshSyncStatusUI();
    openModal('modal-sync');
  }

  /** Rekordy demo nie mogą zaśmiecić rodzinnego arkusza przy pierwszym połączeniu. */
  function wipeDemoData() {
    const demoKeys = ['familygoals_income_sources', 'familygoals_income', 'familygoals_planned_override'];
    let removed = 0;
    demoKeys.forEach(key => {
      const arr = safeJsonParse(localStorage.getItem(key), []);
      if (!Array.isArray(arr)) return;
      const kept = arr.filter(r => !(r && typeof r.id === 'string' && r.id.startsWith('demo-')));
      if (kept.length !== arr.length) {
        removed += arr.length - kept.length;
        localStorage.setItem(key, JSON.stringify(kept));
        dataManager._invalidateCache(key);
      }
    });
    return removed;
  }

  function setupSyncForm() {
    const form = $('sync-form');
    if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      if (typeof syncManager === 'undefined') return;
      const url = $('sync-url')?.value?.trim();
      const token = $('sync-token')?.value?.trim();
      if (!url || !token || token.length < 8) {
        alert('Podaj URL backendu i token (min. 8 znaków)');
        return;
      }
      const line = $('sync-status-line');
      if (line) line.textContent = 'Łączenie…';
      try {
        const removed = wipeDemoData();
        await syncManager.configure(url, token);
        syncManager.start();
        refreshSyncStatusUI();
        renderAll();
        Toast.success('Połączono!', removed
          ? `Sync aktywny (usunięto ${removed} rekordów demo)`
          : 'Synchronizacja rodzinna aktywna');
      } catch (err) {
        console.error('sync configure error:', err);
        if (line) line.textContent = 'Błąd: ' + (err && err.message || err);
        Toast.error('Nie połączono', String(err && err.message || err));
      }
    };
    const disconnectBtn = $('sync-disconnect');
    if (disconnectBtn) {
      disconnectBtn.onclick = () => {
        if (!confirm('Rozłączyć synchronizację? Dane zostają na urządzeniu.')) return;
        if (typeof syncManager !== 'undefined') syncManager.stop();
        localStorage.removeItem('familygoals_sync_config');
        refreshSyncStatusUI();
        Toast.info('Rozłączono', 'Synchronizacja wyłączona');
      };
    }
  }

  // ============ CATEGORIES ============
  function openCategoriesModal() {
    renderCategories();
    openModal('modal-categories');
  }

  function renderCategories() {
    const list = $('categories-list');
    if (!list) return;

    const defaultCategories = [
      { id: 'housing', name: 'Mieszkanie', icon: '🏠' },
      { id: 'food', name: 'Jedzenie', icon: '🍕' },
      { id: 'transport', name: 'Transport', icon: '🚗' },
      { id: 'children', name: 'Dzieci', icon: '👶' },
      { id: 'health', name: 'Zdrowie', icon: '💊' },
      { id: 'entertainment', name: 'Rozrywka', icon: '🎬' }
    ];

    const custom = dataManager.getCustomCategories();
    const all = [...defaultCategories, ...custom];

    list.innerHTML = all.map(cat => `
      <div class="list-item category-item">
        <div class="list-icon">${cat.icon || '📁'}</div>
        <div class="list-content">
          <div class="list-title">${escapeHtml(cat.name)}</div>
        </div>
        ${cat.isCustom || cat.id.startsWith('custom-') ? `<button class="delete-btn" onclick="window.deleteCategory('${cat.id}')">✕</button>` : ''}
      </div>
    `).join('');
  }

  window.addNewCategory = function() {
    const nameInput = $('new-category-name');
    const iconInput = $('new-category-icon');

    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || '📁';

    if (!name) {
      Toast.warning('Błąd', 'Podaj nazwę kategorii');
      return;
    }

    dataManager.addCategory({ name, icon });
    renderCategories();

    nameInput.value = '';
    iconInput.value = '';
    Toast.success('Dodano', `Kategoria "${name}" utworzona`);
  };

  window.deleteCategory = function(id) {
    if (!confirm('Usunąć tę kategorię?')) return;
    dataManager.deleteCategory(id);
    renderCategories();
    Toast.info('Usunięto', 'Kategoria usunięta');
  };

  async function changePin() {
    const newPin = prompt('Nowy PIN (4 cyfry):');
    if (newPin && /^\d{4}$/.test(newPin)) {
      if (typeof PinManager !== 'undefined') {
        // E-m1: await + obsługa błędu — bez tego "PIN zmieniony!"
        // pokazywało się nawet gdy zapis się nie powiódł
        try {
          await PinManager.setPin(newPin);
          PinManager.startSession();
          alert('PIN zmieniony!');
        } catch (err) {
          console.error('changePin error:', err);
          alert('Nie udało się zmienić PIN. Spróbuj ponownie.');
        }
      } else {
        // Fallback (B-m3: przez API DataManagera, nie goły localStorage —
        // goły zapis zostawiał stale cache ustawień)
        dataManager.updateSettings({ pin: newPin });
        alert('PIN zmieniony!');
      }
    } else if (newPin) {
      alert('PIN musi mieć 4 cyfry');
    }
  }

  function exportData() {
    const data = {
      expenses: dataManager.getExpenses(),
      income: dataManager.getIncome(),
      incomeSources: dataManager.getIncomeSources(),
      goals: dataManager.getPlannedExpenses(),
      categories: dataManager.getCustomCategories(),
      businessCosts: dataManager.getBusinessCosts(),
      todos: dataManager.getTodos(),
      settings: dataManager.getSettings(),
      achievements: gamificationManager ? {
        wife: gamificationManager.getPlayerStats('wife'),
        husband: gamificationManager.getPlayerStats('husband')
      } : null,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'familygoals-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const imported = JSON.parse(ev.target.result);

          // Validate structure
          const isValidArray = arr => Array.isArray(arr) && arr.every(item =>
            typeof item === 'object' && item !== null && !Array.isArray(item)
          );

          // Sanitize string fields (XSS protection)
          const sanitize = obj => {
            if (typeof obj !== 'object' || obj === null) return obj;
            const result = Array.isArray(obj) ? [] : {};
            for (const [key, val] of Object.entries(obj)) {
              if (typeof val === 'string') {
                result[key] = val.replace(/[<>]/g, ''); // Basic XSS prevention
              } else if (typeof val === 'object') {
                result[key] = sanitize(val);
              } else {
                result[key] = val;
              }
            }
            return result;
          };

          // Import each type with validation.
          // B-C1: przez dataManager.importBackup (spójny cache), NIE gołe
          // localStorage.setItem — te zostawiały stale cache, a pierwsza
          // edycja po imporcie trwale nadpisywała zaimportowane dane.
          const payload = {};
          if (imported.expenses && isValidArray(imported.expenses)) payload.expenses = sanitize(imported.expenses);
          if (imported.income && isValidArray(imported.income)) payload.income = sanitize(imported.income);
          if (imported.incomeSources && isValidArray(imported.incomeSources)) payload.incomeSources = sanitize(imported.incomeSources);
          if (imported.goals && isValidArray(imported.goals)) payload.goals = sanitize(imported.goals);
          if (imported.categories && isValidArray(imported.categories)) payload.categories = sanitize(imported.categories);
          if (imported.businessCosts && isValidArray(imported.businessCosts)) payload.businessCosts = sanitize(imported.businessCosts);
          if (imported.todos && isValidArray(imported.todos)) payload.todos = sanitize(imported.todos);
          dataManager.importBackup(payload);

          renderAll();
          alert('Dane zaimportowane!');
        } catch(err) {
          alert('Błąd importu: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearData() {
    if (confirm('Usunąć WSZYSTKIE dane?')) {
      if (confirm('Na pewno? Stracisz cele, przychody i osiągnięcia!')) {
        Object.values(DataManager.STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        localStorage.removeItem('familygoals_planned_override');
        localStorage.removeItem('familygoals_config_cache');
        location.reload();
      }
    }
  }

  // ============ ACHIEVEMENTS MODAL ============
  function showAchievementCategory(category) {
    if (!gamificationManager) return;

    // D-C2: pokazujemy tylko realnie zdobywalne osiągnięcia
    const achievements = GamificationManager.getEarnableAchievements().filter(a => a.category === category);
    const wifeUnlocked = gamificationManager.unlockedAchievements?.wife?.unlocked || [];
    const husbandUnlocked = gamificationManager.unlockedAchievements?.husband?.unlocked || [];

    const catNames = FGUtils.ACHIEVEMENT_CATEGORY_NAMES;

    // Create modal if not exists
    let modal = $('modal-achievements');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-achievements';
      modal.className = 'modal';
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('active'); };
      modal.innerHTML = `
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2></h2>
            <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">✕</button>
          </div>
          <div class="achievement-list"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector('.modal-header h2').textContent = catNames[category] || category;
    modal.querySelector('.achievement-list').innerHTML = achievements.map(a => {
      const wifeHas = wifeUnlocked.includes(a.id);
      const husbandHas = husbandUnlocked.includes(a.id);
      const unlocked = wifeHas || husbandHas;

      return `
        <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${a.icon}</div>
          <div class="achievement-content">
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.description}</div>
            <div class="achievement-who">${wifeHas ? '👩' : ''}${husbandHas ? '👨' : ''}</div>
          </div>
          <div class="achievement-points">${a.points} pkt</div>
        </div>
      `;
    }).join('');

    modal.classList.add('active');
  }

  function showPersonAchievements(person) {
    if (!gamificationManager) return;

    const allAchievements = GamificationManager.ACHIEVEMENTS;
    const unlocked = gamificationManager.unlockedAchievements?.[person]?.unlocked || [];
    const personName = person === 'wife' ? '👩 Żona' : '👨 Mąż';

    // Get all unlocked achievements for this person
    const achievements = unlocked
      .map(id => allAchievements[id])
      .filter(a => a)
      .sort((a, b) => b.points - a.points);

    // Create modal if not exists
    let modal = $('modal-achievements');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-achievements';
      modal.className = 'modal';
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('active'); };
      modal.innerHTML = `
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2></h2>
            <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">✕</button>
          </div>
          <div class="achievement-list"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector('.modal-header h2').textContent = `${personName} - Osiągnięcia`;

    if (achievements.length === 0) {
      modal.querySelector('.achievement-list').innerHTML = `
        <div class="empty-state">
          <p>Brak odblokowanych osiągnięć</p>
        </div>
      `;
    } else {
      modal.querySelector('.achievement-list').innerHTML = achievements.map(a => `
        <div class="achievement-item unlocked">
          <div class="achievement-icon">${a.icon}</div>
          <div class="achievement-content">
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.description}</div>
          </div>
          <div class="achievement-points">${a.points} pkt</div>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  }

  // ============ INCOME TABS ============
  let currentIncomeTab = 'income';

  function setupIncomeTabs() {
    const tabsContainer = $('income-tabs');
    if (!tabsContainer) return;

    tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      const tabName = tab.dataset.tab;
      switchIncomeTab(tabName);
    });
  }

  function switchIncomeTab(tabName) {
    currentIncomeTab = tabName;

    // Update tab buttons
    $$('#income-tabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
      t.setAttribute('aria-selected', t.dataset.tab === tabName);
    });

    // Show/hide content
    const incomeContent = $('income-content');
    const optimizationContent = $('optimization-content');

    if (tabName === 'income') {
      incomeContent.style.display = '';
      optimizationContent.style.display = 'none';
      // Update FAB and add button
      $('income-fab').onclick = () => openModal('modal-income');
      $('income-add-btn').onclick = () => openModal('modal-income');
    } else {
      incomeContent.style.display = 'none';
      optimizationContent.style.display = '';
      // Update FAB and add button for optimization
      $('income-fab').onclick = () => openModal('modal-business-cost');
      $('income-add-btn').onclick = () => openModal('modal-business-cost');
      renderOptimization();
    }
  }

  // ============ OPTIMIZATION (Business Costs) ============
  let editingCostId = null;

  function renderOptimization() {
    const savings = dataManager.calculateBusinessSavings();
    const total = dataManager.getTotalBusinessCosts();
    const costs = dataManager.getBusinessCosts();
    const upcoming = dataManager.getUpcomingBusinessCosts();

    // Update summary
    $('business-savings').textContent = formatMoney(savings) + '/mies.';
    $('business-total').textContent = formatMoney(total);

    // Render upcoming purchases
    const upcomingList = $('upcoming-purchases');
    if (upcoming.length === 0) {
      renderEmptyState(upcomingList, 'Brak nadchodzących zakupów');
    } else {
      upcomingList.innerHTML = upcoming.map(c => renderCostItem(c, true)).join('');
    }

    // Render all costs
    const costsList = $('business-costs-list');
    if (costs.length === 0) {
      renderEmptyState(costsList, 'Dodaj pierwszy koszt firmowy');
    } else {
      costsList.innerHTML = costs.map(c => renderCostItem(c, false)).join('');
    }
  }

  function renderCostItem(cost, showDue) {
    const categoryIcons = {
      subscriptions: '📱',
      equipment: '💻',
      supplies: '📦',
      other: '📋'
    };
    const icon = categoryIcons[cost.category] || '📋';
    let recurring = cost.isRecurring ? `🔄 co ${cost.recurringMonths} mies.` : '1️⃣ jednorazowy';
    // Zakres tylko na liście głównej — w "Nadchodzące zakupy" (showDue) brak
    // miejsca (przyciski Kupione/za-X-dni ściskają meta do 1 kolumny)
    if (!showDue && cost.isRecurring && (cost.activeFrom || cost.activeTo)) {
      recurring += ` • od ${cost.activeFrom || 'zawsze'} do ${cost.activeTo || 'bezterminowo'}`;
    }

    let dueHtml = '';
    if (showDue && cost.nextDueDate) {
      const dueDate = new Date(cost.nextDueDate);
      const now = new Date();
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const dueClass = diffDays <= 7 ? 'soon' : '';
      dueHtml = `<span class="cost-due ${dueClass}">${diffDays <= 0 ? 'Teraz!' : `za ${diffDays} dni`}</span>`;
    }

    return `
      <div class="cost-item" data-cost-id="${cost.id}">
        <div class="cost-icon">${icon}</div>
        <div class="cost-content">
          <div class="cost-name">${escapeHtml(cost.name)}</div>
          <div class="cost-meta">${recurring}${cost.note ? ' • ' + escapeHtml(cost.note) : ''}</div>
        </div>
        <div class="cost-amount">${formatMoney(cost.amount)}</div>
        ${dueHtml}
        <div class="cost-actions">
          ${showDue ? `<button class="cost-buy-btn" data-buy-id="${cost.id}">✓ Kupione</button>` : ''}
          <button class="delete-btn" data-id="${cost.id}" data-type="cost">✕</button>
        </div>
      </div>
    `;
  }

  function setupBusinessCostForm() {
    const form = $('business-cost-form');
    if (!form) return;

    // Type chips toggle recurring options
    const typeChips = $('cost-type-chips');
    typeChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      typeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const isRecurring = chip.dataset.value === 'recurring';
      $('cost-recurring-options').style.display = isRecurring ? '' : 'none';
      // Data realizacji dotyczy tylko jednorazowych (korzyść z konkretnego dnia)
      const dateGroup = $('cost-date-group');
      if (dateGroup) dateGroup.style.display = isRecurring ? 'none' : '';
      const dateEl = $('cost-date');
      if (dateEl && !isRecurring && !dateEl.value) {
        const n = new Date();
        dateEl.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      }
    });

    // All chip groups
    ['cost-category-chips', 'cost-months-chips'].forEach(id => {
      const container = $(id);
      if (!container) return;
      container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = $('cost-name').value.trim();
      const amount = parseFloat($('cost-amount').value) || 0;
      const category = $('cost-category-chips').querySelector('.chip.active')?.dataset.value || 'other';
      const isRecurring = $('cost-type-chips').querySelector('.chip.active')?.dataset.value === 'recurring';
      const recurringMonths = isRecurring ? parseInt($('cost-months-chips').querySelector('.chip.active')?.dataset.value) || 1 : null;
      // Zakres od–do cyklicznych (np. leasing); puste = bezterminowo
      const activeFrom = isRecurring ? ($('cost-active-from')?.value || null) : null;
      const activeTo = isRecurring ? ($('cost-active-to')?.value || null) : null;
      if (activeFrom && activeTo && activeTo < activeFrom) {
        alert('„Do" nie może być wcześniejsze niż „od"');
        return;
      }
      const note = $('cost-note').value.trim();

      if (!name || amount <= 0) return;

      const costData = { name, amount, category, isRecurring, recurringMonths, activeFrom, activeTo, note };
      // Jednorazowa Z DATĄ = korzyść zrealizowana — liczy się w miesiącu daty
      // (np. zatankowanie auta z pieniędzy firmy); bez daty = planowany zakup
      const costDate = $('cost-date')?.value;
      if (!isRecurring && costDate) {
        costData.lastPurchaseDate = new Date(costDate + 'T12:00:00').toISOString();
      } else if (!isRecurring) {
        costData.lastPurchaseDate = null;
      }

      if (editingCostId) {
        dataManager.updateBusinessCost(editingCostId, costData);
        editingCostId = null;
      } else {
        dataManager.addBusinessCost(costData);
      }

      closeAllModals();
      renderAll();
      Toast.success('Zapisano!', 'Koszt firmowy został zapisany');
    });

    // Handle cost item clicks (edit and buy)
    document.addEventListener('click', (e) => {
      // Buy button
      if (e.target.dataset.buyId) {
        e.stopPropagation();
        dataManager.markBusinessCostPurchased(e.target.dataset.buyId);
        renderAll();
        Toast.success('Oznaczono!', 'Koszt oznaczony jako kupiony');
        return;
      }

      // Delete cost
      if (e.target.dataset.type === 'cost') {
        e.stopPropagation();
        dataManager.deleteBusinessCost(e.target.dataset.id);
        renderAll();
        return;
      }

      // Edit cost
      const costItem = e.target.closest('.cost-item');
      if (costItem && !e.target.closest('button')) {
        editBusinessCost(costItem.dataset.costId);
      }
    });
  }

  function editBusinessCost(id) {
    const cost = dataManager.getBusinessCosts().find(c => c.id === id);
    if (!cost) return;

    // Open modal FIRST (closeAllModals resets editingCostId via resetEditState)
    openModal('modal-business-cost');

    // Set edit state AFTER openModal so resetEditState doesn't clear it
    editingCostId = id;

    // Fill form
    $('cost-name').value = cost.name;
    $('cost-amount').value = cost.amount;
    $('cost-note').value = cost.note || '';

    // Set category chip
    $('cost-category-chips').querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === cost.category);
    });

    // Set type chip
    $('cost-type-chips').querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === (cost.isRecurring ? 'recurring' : 'oneoff'));
    });

    // Show/hide recurring options
    $('cost-recurring-options').style.display = cost.isRecurring ? '' : 'none';

    // Data realizacji (jednorazowe): prefill + widoczność
    const dateGroup = $('cost-date-group');
    if (dateGroup) dateGroup.style.display = cost.isRecurring ? 'none' : '';
    const dateEl = $('cost-date');
    if (dateEl) dateEl.value = cost.lastPurchaseDate ? String(cost.lastPurchaseDate).slice(0, 10) : '';

    if (cost.isRecurring && cost.recurringMonths) {
      $('cost-months-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.value) === cost.recurringMonths);
      });
    }

    // Zakres od–do (cykliczne); form.reset() w closeAllModals czyści przy "dodaj"
    const fromEl = $('cost-active-from');
    if (fromEl) fromEl.value = cost.activeFrom || '';
    const toEl = $('cost-active-to');
    if (toEl) toEl.value = cost.activeTo || '';

    // Update modal title
    $('modal-business-cost').querySelector('.modal-header h2').textContent = '💼 Edytuj koszt';
  }

  // ============ TODOS ============
  let editingTodoId = null;
  let currentTodoFilter = 'all';

  function setupTodoFilter() {
    const filterContainer = $('todo-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      currentTodoFilter = chip.dataset.filter;
      renderTodos();
    });
  }

  function renderTodos() {
    const pending = dataManager.getPendingTodos(currentTodoFilter);
    const completed = dataManager.getCompletedTodos(currentTodoFilter);
    const stats = dataManager.getTodoStats(currentTodoFilter);

    // Update stats
    $('todo-stats').innerHTML = `
      <span class="stat pending">${stats.pending} do zrobienia</span>
      <span class="stat completed">${stats.completed} ukończonych</span>
    `;

    // Render pending
    const pendingList = $('todos-pending');
    if (pending.length === 0) {
      renderEmptyState(pendingList, 'Brak zadań do zrobienia');
    } else {
      pendingList.innerHTML = pending.map(t => renderTodoItem(t)).join('');
    }

    // Render completed
    const completedList = $('todos-completed');
    if (completed.length === 0) {
      renderEmptyState(completedList, 'Brak ukończonych zadań');
    } else {
      completedList.innerHTML = completed.map(t => renderTodoItem(t)).join('');
    }
  }

  function renderTodoItem(todo) {
    const ownerIcons = { wife: '👩', husband: '👨', both: '👫' };
    const ownerIcon = ownerIcons[todo.owner] || '👫';

    const priorityLabels = { high: 'Wysoki', normal: 'Normalny', low: 'Niski' };

    let recurringText = '';
    if (todo.isRecurring && todo.recurringDays) {
      const days = todo.recurringDays;
      if (days === 1) recurringText = 'codziennie';
      else if (days === 7) recurringText = 'co tydzień';
      else if (days === 14) recurringText = 'co 2 tyg.';
      else if (days === 30) recurringText = 'co miesiąc';
      else recurringText = `co ${days} dni`;
    }

    return `
      <div class="todo-item ${todo.isCompleted ? 'completed' : ''}" data-todo-id="${todo.id}">
        <button class="todo-checkbox ${todo.isCompleted ? 'checked' : ''}"
                data-complete-id="${todo.id}" aria-label="Oznacz jako ${todo.isCompleted ? 'nieukończone' : 'ukończone'}">
          ${todo.isCompleted ? '✓' : ''}
        </button>
        <div class="todo-content">
          <div class="todo-title">${escapeHtml(todo.title)}</div>
          <div class="todo-meta">
            <span class="todo-owner">${ownerIcon}</span>
            ${recurringText ? `<span class="todo-recurring">🔄 ${recurringText}</span>` : ''}
            <span class="todo-priority ${todo.priority}">${priorityLabels[todo.priority]}</span>
          </div>
        </div>
        <button class="todo-delete" data-id="${todo.id}" data-type="todo" aria-label="Usuń">✕</button>
      </div>
    `;
  }

  function setupTodoForm() {
    const form = $('todo-form');
    if (!form) return;

    // Type chips toggle recurring options
    const typeChips = $('todo-type-chips');
    typeChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      typeChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const isRecurring = chip.dataset.value === 'recurring';
      $('todo-recurring-options').style.display = isRecurring ? '' : 'none';
    });

    // All chip groups
    ['todo-owner-chips', 'todo-days-chips', 'todo-priority-chips'].forEach(id => {
      const container = $(id);
      if (!container) return;
      container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = $('todo-title').value.trim();
      const owner = $('todo-owner-chips').querySelector('.chip.active')?.dataset.value || 'both';
      const isRecurring = $('todo-type-chips').querySelector('.chip.active')?.dataset.value === 'recurring';
      const recurringDays = isRecurring ? parseInt($('todo-days-chips').querySelector('.chip.active')?.dataset.value) || 1 : null;
      const priority = $('todo-priority-chips').querySelector('.chip.active')?.dataset.value || 'normal';

      if (!title) return;

      const todoData = { title, owner, isRecurring, recurringDays, priority };

      if (editingTodoId) {
        dataManager.updateTodo(editingTodoId, todoData);
        editingTodoId = null;
      } else {
        dataManager.addTodo(todoData);
      }

      // Reset form
      form.reset();
      $('todo-recurring-options').style.display = 'none';
      $('todo-type-chips').querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
      $('todo-owner-chips').querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === 'both'));
      $('todo-priority-chips').querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === 'normal'));

      closeAllModals();
      renderTodos();
      Toast.success('Zapisano!', 'Zadanie zostało dodane');
    });

    // Handle todo clicks
    document.addEventListener('click', (e) => {
      // Complete/uncomplete
      if (e.target.dataset.completeId) {
        e.stopPropagation();
        const id = e.target.dataset.completeId;
        const todo = dataManager.getTodos().find(t => t.id === id);
        if (todo) {
          if (todo.isCompleted) {
            dataManager.uncompleteTodo(id);
          } else {
            dataManager.completeTodo(id);
          }
          renderTodos();
        }
        return;
      }

      // Delete todo
      if (e.target.dataset.type === 'todo') {
        e.stopPropagation();
        const todo = dataManager.getTodos().find(t => t.id === e.target.dataset.id);
        if (todo && !confirmOtherOwner(todo.owner, 'usunąć to zadanie')) return;
        dataManager.deleteTodo(e.target.dataset.id);
        renderTodos();
        return;
      }

      // Edit todo (click on item, not buttons)
      const todoItem = e.target.closest('.todo-item');
      if (todoItem && !e.target.closest('button')) {
        editTodo(todoItem.dataset.todoId);
      }
    });
  }

  function editTodo(id) {
    const todo = dataManager.getTodos().find(t => t.id === id);
    if (!todo) return;

    // Open modal FIRST (closeAllModals resets editingTodoId via resetEditState)
    openModal('modal-todo');

    // Set edit state AFTER openModal so resetEditState doesn't clear it
    editingTodoId = id;

    // Fill form
    $('todo-title').value = todo.title;

    // Set owner chip
    $('todo-owner-chips').querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === todo.owner);
    });

    // Set type chip
    $('todo-type-chips').querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === (todo.isRecurring ? 'recurring' : 'oneoff'));
    });

    // Show/hide recurring options
    $('todo-recurring-options').style.display = todo.isRecurring ? '' : 'none';

    if (todo.isRecurring && todo.recurringDays) {
      $('todo-days-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.value) === todo.recurringDays);
      });
    }

    // Set priority chip
    $('todo-priority-chips').querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === todo.priority);
    });

    // Update modal title
    $('modal-todo').querySelector('.modal-header h2').textContent = '📋 Edytuj zadanie';
  }

  // ============ RESET EDIT STATE ============
  function resetEditState() {
    editingGoalId = null;
    editingSourceId = null;
    editingCostId = null;
    editingTodoId = null;
  }

  // ============ EXPOSE API ============
  window.app = {
    changeMonth,
    deleteGoal,
    deleteIncomeSource,
    editGoal,
    editIncomeSource,
    showAchievementCategory,
    changePin,
    exportData,
    importData,
    clearData,
    renderAll,
    resetEditState,
    renderOptimization,
    renderTodos,
    switchIncomeTab,
    openAddPayment,
    pickPaymentSource,
    applyProfileDefaults
  };

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
