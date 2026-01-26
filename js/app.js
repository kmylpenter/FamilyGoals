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
  let familyUnity = null;
  let familyBalance = null;

  // Current state
  let currentMonth = new Date();
  let currentPerson = 'wife'; // 'wife' lub 'husband'
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
    const hasData = localStorage.getItem('familygoals_income_sources') ||
                    localStorage.getItem('familygoals_planned_override');
    if (hasData) return;

    // Demo income sources
    const demoSources = [
      { id: 'demo-salary-wife', name: 'Pensja', expectedAmount: 6000, owner: 'wife', icon: '💼', isActive: true, payments: [
        { id: 'p1', amount: 6000, date: new Date().toISOString(), note: 'Grudzień' }
      ]},
      { id: 'demo-salary-husband', name: 'Pensja', expectedAmount: 4500, owner: 'husband', icon: '💼', isActive: true, payments: [] },
      { id: 'demo-freelance', name: 'Freelance', expectedAmount: 1500, owner: 'husband', icon: '💻', isActive: true, payments: [] }
    ];

    // Demo goals
    const now = new Date();
    const demoGoals = [
      { id: 'demo-goal-1', name: 'Studia Kasi', icon: '🎓', type: 'oneoff', targetAmount: 50000, currentAmount: 32000, targetDate: '2026-09-01' },
      { id: 'demo-goal-2', name: 'Remont kuchni', icon: '🏠', type: 'oneoff', targetAmount: 25000, currentAmount: 5000, targetDate: '2026-12-01' },
      { id: 'demo-goal-3', name: 'Wakacje', icon: '🏖️', type: 'oneoff', targetAmount: 10000, currentAmount: 4500, targetDate: '2025-08-01' },
      { id: 'demo-goal-4', name: 'Leasing auta', icon: '🚗', type: 'recurring', monthlyContribution: 1200, startDate: '2024-01-01', endDate: '2028-07-01' },
      { id: 'demo-goal-5', name: 'Ubezpieczenie', icon: '🛡️', type: 'recurring', monthlyContribution: 350, startDate: '2025-01-01', endDate: '2025-12-01' }
    ];

    // Demo income records (for chart)
    const demoIncome = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
      const baseIncome = 8000 + Math.floor(Math.random() * 3000);
      demoIncome.push({
        id: `demo-inc-${i}`,
        amount: baseIncome,
        source: 'Pensja',
        date: d.toISOString()
      });
    }

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
      dataManager = new DataManager();
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
        engagementManager.recordLogin(currentPerson);
      }

      // Init AIAdvisor
      if (typeof AIAdvisor !== 'undefined') {
        aiAdvisor = new AIAdvisor(dataManager);
      }

      // Init FamilyUnityManager
      if (typeof FamilyUnityManager !== 'undefined') {
        familyUnity = new FamilyUnityManager(dataManager);
      }

      // Init FamilyBalanceManager
      if (typeof FamilyBalanceManager !== 'undefined') {
        familyBalance = new FamilyBalanceManager(dataManager);
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

    // Update goals list on dashboard
    const goalsListEl = $('goals-list');
    if (goalsListEl) {
      goalsListEl.innerHTML = goals.slice(0, 3).map(g => {
        const monthly = g.monthlyContribution || dataManager.calculateRequiredMonthlySavings(
          g.targetAmount, g.currentAmount || 0, g.targetDate
        );
        const isFuture = g.type === 'recurring';

        return `
          <div class="goal-card ${isFuture ? 'future' : ''}" onclick="showScreen('screen-goals')">
            <div class="goal-header">
              <span class="goal-name">${escapeHtml(g.icon) || '🎯'} ${escapeHtml(g.name)}</span>
              <span class="goal-amount monthly ${isFuture ? 'warning' : ''}">${formatMoney(monthly).replace(' zł', '')}/m</span>
            </div>
            <div class="goal-detail">
              <span class="goal-type">${g.type === 'recurring' ? 'Stały' : 'Jednorazowy'}</span>
              <span>${formatMoney(g.currentAmount || 0)} / ${formatMoney(g.targetAmount)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

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

      incomeCard.innerHTML = `
        <div class="income-status-row">
          <span>👩 Żona</span>
          <span class="income-value ${wifeReceived > 0 ? 'positive' : ''}">${formatMoney(wifeReceived)} / ${formatMoney(wifeExpected)}</span>
        </div>
        <div class="income-status-row">
          <span>👨 Mąż</span>
          <span class="income-value ${husbandReceived > 0 ? 'positive' : ''}">${formatMoney(husbandReceived)} / ${formatMoney(husbandExpected)}</span>
        </div>
        <div class="income-status-row total">
          <span>Razem</span>
          <span class="income-value ${incomeSummary.totalReceived >= incomeSummary.totalExpected ? 'positive' : ''}">${formatMoney(incomeSummary.totalReceived)} / ${formatMoney(incomeSummary.totalExpected)}</span>
        </div>
      `;
    }

    // Render chart
    renderChart(totalRequired);
  }

  function renderChart(neededIncome) {
    const container = document.querySelector('#timeline-chart-container');
    if (!container) return;

    const trend = dataManager.getTrendByOwner(12);
    if (!trend || trend.length === 0) {
      renderEmptyState(container, 'Brak danych o przychodach');
      return;
    }

    // Chart dimensions
    const width = 320;
    const height = 120;
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
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

    // Month labels (show every 2nd or 3rd for space)
    const step = trend.length > 6 ? 2 : 1;
    const labels = trend.filter((t, i) => i % step === 0 || i === trend.length - 1).map((t, idx) => {
      const origIdx = trend.indexOf(t);
      return { x: getX(origIdx), text: t.monthName };
    });

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

    // Streak
    if (engagementManager) {
      const streakStats = engagementManager.getStreakStats(currentPerson);
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
      const allAchievements = GamificationManager.ACHIEVEMENTS;
      const catCounts = {};

      Object.values(allAchievements).forEach(a => {
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
        const owner = personChip?.textContent.includes('Żona') ? 'wife' : 'husband';
        const typeChip = document.querySelector('#income-type-chips .chip.active');
        const incomeType = typeChip?.dataset.value || 'recurring';
        const date = form.querySelector('input[type="date"]').value;
        const note = form.querySelector('input[type="text"]')?.value || '';
        const { year, month } = getYearMonth();
        const forMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

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

  function openPaymentModal(sourceId) {
    const { year, month } = getYearMonth();
    const summary = dataManager.getMonthlyIncomeSummary(year, month);
    const source = summary.sources.find(s => s.id === sourceId);

    if (!source) return;

    currentPaymentSourceId = sourceId;

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

      dataManager.recordPayment(currentPaymentSourceId, {
        amount,
        type,
        date: new Date().toISOString(),
        note: `${type === 'cash' ? 'Gotówka' : 'Przelew'}: ${formatMoney(amount)}`
      });

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

    // Update modal title
    modal.querySelector('.modal-header h2').textContent = '💵 Edytuj źródło';

    openModal('modal-income');
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

    openModal('modal-goal');
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
          <div class="list-title">${cat.name}</div>
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

  function changePin() {
    const newPin = prompt('Nowy PIN (4 cyfry):');
    if (newPin && /^\d{4}$/.test(newPin)) {
      if (typeof PinManager !== 'undefined') {
        PinManager.setPin(newPin);
        PinManager.startSession();
        alert('PIN zmieniony!');
      } else {
        // Fallback
        const settings = safeJsonParse(localStorage.getItem('familygoals_settings'), {});
        settings.pin = newPin;
        localStorage.setItem('familygoals_settings', JSON.stringify(settings));
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

          // Import each type with validation
          if (imported.expenses && isValidArray(imported.expenses)) {
            localStorage.setItem(DataManager.STORAGE_KEYS.expenses, JSON.stringify(sanitize(imported.expenses)));
          }
          if (imported.income && isValidArray(imported.income)) {
            localStorage.setItem(DataManager.STORAGE_KEYS.income, JSON.stringify(sanitize(imported.income)));
          }
          if (imported.incomeSources && isValidArray(imported.incomeSources)) {
            localStorage.setItem(DataManager.STORAGE_KEYS.incomeSources, JSON.stringify(sanitize(imported.incomeSources)));
          }
          if (imported.goals && isValidArray(imported.goals)) {
            localStorage.setItem('familygoals_planned_override', JSON.stringify(sanitize(imported.goals)));
          }

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

    const allAchievements = GamificationManager.ACHIEVEMENTS;
    const achievements = Object.values(allAchievements).filter(a => a.category === category);
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
    const recurring = cost.isRecurring ? `🔄 co ${cost.recurringMonths} mies.` : '1️⃣ jednorazowy';

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
          <div class="cost-name">${cost.name}</div>
          <div class="cost-meta">${recurring}${cost.note ? ' • ' + cost.note : ''}</div>
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
      const note = $('cost-note').value.trim();

      if (!name || amount <= 0) return;

      const costData = { name, amount, category, isRecurring, recurringMonths, note };

      if (editingCostId) {
        dataManager.updateBusinessCost(editingCostId, costData);
        editingCostId = null;
      } else {
        dataManager.addBusinessCost(costData);
      }

      closeAllModals();
      renderOptimization();
      Toast.success('Zapisano!', 'Koszt firmowy został zapisany');
    });

    // Handle cost item clicks (edit and buy)
    document.addEventListener('click', (e) => {
      // Buy button
      if (e.target.dataset.buyId) {
        e.stopPropagation();
        dataManager.markBusinessCostPurchased(e.target.dataset.buyId);
        renderOptimization();
        Toast.success('Oznaczono!', 'Koszt oznaczony jako kupiony');
        return;
      }

      // Delete cost
      if (e.target.dataset.type === 'cost') {
        e.stopPropagation();
        dataManager.deleteBusinessCost(e.target.dataset.id);
        renderOptimization();
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

    if (cost.isRecurring && cost.recurringMonths) {
      $('cost-months-chips').querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.value) === cost.recurringMonths);
      });
    }

    // Update modal title
    $('modal-business-cost').querySelector('.modal-header h2').textContent = '💼 Edytuj koszt';

    openModal('modal-business-cost');
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

    openModal('modal-todo');
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
    switchIncomeTab
  };

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
