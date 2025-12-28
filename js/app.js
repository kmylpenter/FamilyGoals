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

  const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
                  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  function formatMoney(n) {
    return (n || 0).toLocaleString('pl-PL') + ' zł';
  }

  function formatMonth(date) {
    return MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  function getYearMonth() {
    return { year: currentMonth.getFullYear(), month: currentMonth.getMonth() };
  }

  // ============ INIT ============
  async function init() {
    try {
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

      // Subscribe to data changes for auto-refresh
      if (typeof EventBus !== 'undefined') {
        EventBus.on('data:changed', () => renderAll());
      }

      // Render UI
      renderAll();

      console.log('FamilyGoals App initialized with all managers');
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
    renderAlerts();
    renderDailyTip();
    renderIncome();
    renderGoals();
    renderAchievements();
  }

  function renderAlerts() {
    const container = $('alerts-container');
    if (!container) return;

    // Get alerts from AlertManager if available
    if (typeof AlertManager !== 'undefined') {
      const alerts = AlertManager.getFormattedAlerts();

      if (alerts.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = alerts.slice(0, 3).map(alert => `
        <div class="alert-item ${alert.type}" data-alert-id="${alert.categoryId || alert.goalId || ''}">
          <span class="alert-icon">${alert.icon}</span>
          <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-message">${alert.message}</div>
          </div>
          ${alert.dismissable ? `<button class="alert-dismiss" onclick="app.dismissAlert(this.parentElement)">✕</button>` : ''}
        </div>
      `).join('');
    }
  }

  function dismissAlert(alertEl) {
    if (typeof AlertManager !== 'undefined') {
      const alertId = alertEl.dataset.alertId;
      // Find and dismiss the alert
      const alerts = AlertManager.getFormattedAlerts();
      const alert = alerts.find(a => (a.categoryId || a.goalId || '') === alertId);
      if (alert) {
        AlertManager.dismiss(alert);
      }
    }
    alertEl.remove();
  }

  function renderDailyTip() {
    const container = $('daily-tip');
    if (!container) return;

    // Get daily tip from AIAdvisor if available
    if (aiAdvisor && typeof aiAdvisor.getDailyTip === 'function') {
      const tip = aiAdvisor.getDailyTip();
      if (tip) {
        container.style.display = 'block';
        container.innerHTML = `
          <div class="tip-header">
            <span class="tip-icon">💡</span>
            <span class="tip-label">Porada dnia</span>
          </div>
          <div class="tip-content">${tip.text || tip}</div>
        `;
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
              <span class="goal-name">${g.icon || '🎯'} ${g.name}</span>
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

    // Update income status
    const incomeCard = document.querySelector('.income-status-card');
    if (incomeCard) {
      const diff = incomeSummary.totalReceived - totalRequired;
      incomeCard.innerHTML = `
        <div class="income-status-row">
          <span>Wymagane</span>
          <span class="income-value">${formatMoney(totalRequired)}</span>
        </div>
        <div class="income-status-row">
          <span>Przychody</span>
          <span class="income-value positive">${formatMoney(incomeSummary.totalReceived)}</span>
        </div>
        <div class="income-status-row total">
          <span>${diff >= 0 ? 'Nadwyżka' : 'Brakuje'}</span>
          <span class="income-value ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${formatMoney(diff)}</span>
        </div>
      `;
    }

    // Render chart
    renderChart(totalRequired);
  }

  function renderChart(neededIncome) {
    const chart = document.querySelector('.timeline-chart');
    if (!chart) return;

    const trend = dataManager.getTrend(6);
    const maxIncome = Math.max(neededIncome, ...trend.map(t => t.totalIncome));

    chart.innerHTML = trend.map((t, i, arr) => {
      const incomePercent = maxIncome > 0 ? (t.totalIncome / maxIncome) * 100 : 0;
      const neededPercent = maxIncome > 0 ? (neededIncome / maxIncome) * 100 : 0;
      const isCurrent = i === arr.length - 1;

      return `
        <div class="timeline-bar">
          <div class="timeline-bar-needed" style="height: ${neededPercent}%"></div>
          <div class="timeline-bar-fill ${isCurrent ? 'current' : ''}" style="height: ${incomePercent}%"></div>
          <span class="timeline-bar-label">${t.monthName}</span>
        </div>
      `;
    }).join('');
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
    const list = document.querySelector('#screen-income .list');
    if (list) {
      list.innerHTML = summary.sources.map(src => {
        const icon = src.icon || (src.name?.includes('Pensja') ? '💼' : '💵');
        const person = src.owner === 'wife' ? 'Żona' : src.owner === 'husband' ? 'Mąż' : '';

        return `
          <div class="list-item" data-edit-id="${src.id}" data-edit-type="source">
            <div class="list-icon">${icon}</div>
            <div class="list-content">
              <div class="list-title">${src.name}${person ? ' (' + person + ')' : ''}</div>
              <div class="list-subtitle">${src.status === 'complete' ? 'Otrzymane' : 'Oczekiwane'}</div>
            </div>
            <div class="list-amount ${src.totalReceived > 0 ? 'positive' : ''}">${formatMoney(src.totalReceived || src.expected)}</div>
            <div class="list-status ${src.status === 'complete' ? 'done' : 'pending'}">${src.status === 'complete' ? '✓' : '⏳'}</div>
            <button class="delete-btn" data-id="${src.id}" data-type="source">✕</button>
          </div>
        `;
      }).join('');

      if (summary.sources.length === 0) {
        list.innerHTML = '<div class="empty-state">Brak źródeł przychodów. Dodaj pierwsze!</div>';
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
    const oneoffList = document.querySelector('#screen-goals .list');
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
              <span class="goal-item-icon">${g.icon || '🎯'}</span>
              <div class="goal-item-info">
                <div class="goal-item-name">${g.name}</div>
                <div class="goal-item-date">${deadline ? formatMonth(deadline) : 'Bez terminu'}</div>
              </div>
              <div class="goal-item-monthly">${formatMoney(monthly).replace(' zł', '')}/m</div>
            </div>
            <div class="goal-bar"><div class="goal-bar-fill mint" style="width: ${percent}%"></div></div>
            <div class="goal-item-footer">
              <span>${formatMoney(g.currentAmount || 0)} / ${formatMoney(g.targetAmount)}</span>
              <span>${percent}%</span>
            </div>
            <button class="delete-btn" data-id="${g.id}" data-type="goal">✕</button>
          </div>
        `;
      }).join('');

      if (oneoff.length === 0) {
        oneoffList.innerHTML = '<div class="empty-state">Brak celów. Dodaj pierwszy!</div>';
      }
    }

    // Recurring goals
    const recurringList = document.querySelectorAll('#screen-goals .list')[1];
    if (recurringList && recurring.length > 0) {
      recurringList.innerHTML = recurring.map(g => `
        <div class="goal-item future" data-edit-id="${g.id}" data-edit-type="goal">
          <div class="goal-item-header">
            <span class="goal-item-icon">${g.icon || '🏦'}</span>
            <div class="goal-item-info">
              <div class="goal-item-name">${g.name}</div>
              <div class="goal-item-date">Od ${g.targetDate ? formatMonth(new Date(g.targetDate)) : 'nieokreślone'}</div>
            </div>
            <div class="goal-item-monthly warning">+${formatMoney(g.monthlyContribution || g.targetAmount).replace(' zł', '')}/m</div>
          </div>
          <div class="goal-item-warning">⚠️ Podnieście zarobki o ${formatMoney(g.monthlyContribution || g.targetAmount)} do tego czasu!</div>
          <button class="delete-btn" data-id="${g.id}" data-type="goal">✕</button>
        </div>
      `).join('');
    }
  }

  function renderAchievements() {
    if (!gamificationManager) return;

    const wifeData = gamificationManager.getPlayerStats('wife');
    const husbandData = gamificationManager.getPlayerStats('husband');
    const wifeUnlocked = gamificationManager.unlockedAchievements?.wife?.unlocked || [];
    const husbandUnlocked = gamificationManager.unlockedAchievements?.husband?.unlocked || [];

    // Stats cards
    const statsCards = $$('#screen-achievements .stat-card');
    if (statsCards.length >= 2) {
      statsCards[0].innerHTML = `
        <div class="stat-icon">👩</div>
        <div class="stat-value">${wifeData?.points || 0} pkt</div>
        <div class="stat-label">Żona • ${wifeData?.unlockedCount || 0}/${wifeData?.totalCount || 105}</div>
      `;
      statsCards[1].innerHTML = `
        <div class="stat-icon">👨</div>
        <div class="stat-value">${husbandData?.points || 0} pkt</div>
        <div class="stat-label">Mąż • ${husbandData?.unlockedCount || 0}/${husbandData?.totalCount || 105}</div>
      `;
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

      const catNames = {
        start: '🌟 Pierwsze kroki',
        savings: '💰 Oszczędności',
        spending: '💸 Wydatki',
        goals: '🎯 Cele',
        income: '💵 Przychody',
        couple: '💑 Para',
        coop: '🤝 Współpraca',
        streak: '🔥 Streak',
        level: '📊 Poziomy',
        special: '🎉 Specjalne',
        expert: '🏆 Ekspert'
      };

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

      const amount = parseFloat(form.querySelector('input[type="number"]').value) || 0;
      const sourceChip = form.querySelector('.chips .chip.active');
      const sourceName = sourceChip?.textContent.trim().split(' ').pop() || 'Inne';
      const personChip = form.querySelectorAll('.chips')[1]?.querySelector('.chip.active');
      const owner = personChip?.textContent.includes('Żona') ? 'wife' : 'husband';
      const date = form.querySelector('input[type="date"]').value;
      const note = form.querySelector('input[type="text"]')?.value || '';

      let source;

      if (editingSourceId) {
        // Update existing source
        source = dataManager.getIncomeSources().find(s => s.id === editingSourceId);
        if (source) {
          dataManager.updateIncomeSource(editingSourceId, {
            name: sourceName,
            expectedAmount: amount,
            owner,
            icon: sourceName === 'Pensja' ? '💼' : sourceName === 'Freelance' ? '💻' : '💵'
          });
        }
        editingSourceId = null;
      } else {
        // Check if source exists
        const sources = dataManager.getIncomeSources();
        source = sources.find(s => s.name === sourceName && s.owner === owner);

        if (!source) {
          // Create new source
          source = dataManager.addIncomeSource({
            name: sourceName,
            expectedAmount: amount,
            owner,
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
          console.log('New achievements:', newAchievements);
        }
      }

      closeAllModals();
      renderAll();
    };
  }

  function deleteIncomeSource(id) {
    if (!confirm('Usunąć to źródło przychodu?')) return;
    dataManager.deleteIncomeSource(id);
    renderAll();
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
    if (personChips) {
      personChips.forEach(c => c.classList.remove('active'));
      if (source.owner === 'wife') {
        personChips[0].classList.add('active');
      } else {
        personChips[1].classList.add('active');
      }
    }

    // Update modal title
    modal.querySelector('.modal-header h2').textContent = '💵 Edytuj źródło';

    openModal('modal-income');
  }

  // Goals
  function setupGoalForm() {
    const form = document.querySelector('#modal-goal form');
    if (!form) return;

    form.onsubmit = e => {
      e.preventDefault();

      const name = form.querySelector('input[type="text"]').value;
      const typeChip = form.querySelector('.chips .chip.active');
      const type = typeChip?.textContent.includes('Stały') ? 'recurring' : 'oneoff';
      const target = parseFloat(form.querySelectorAll('input[type="number"]')[0].value) || 0;
      const saved = parseFloat(form.querySelectorAll('input[type="number"]')[1].value) || 0;
      const deadline = form.querySelector('input[type="month"]').value;
      const iconChip = form.querySelectorAll('.chips')[1]?.querySelector('.chip.active');
      const icon = iconChip?.textContent || '🎯';

      const goalData = {
        name,
        type,
        targetAmount: target,
        currentAmount: saved,
        targetDate: deadline + '-01',
        icon,
        monthlyContribution: type === 'recurring' ? target : null
      };

      if (editingGoalId) {
        // Update existing goal
        dataManager.updatePlannedGoal(editingGoalId, goalData);
        editingGoalId = null;
      } else {
        // Add new goal
        dataManager.addPlannedGoal(goalData);
      }

      // Check achievements
      if (gamificationManager) {
        const newAchievements = gamificationManager.checkAchievements(currentPerson);
        if (newAchievements.length > 0) {
          console.log('New achievements:', newAchievements);
        }
      }

      closeAllModals();
      renderAll();
    };
  }

  function deleteGoal(id) {
    if (!confirm('Usunąć ten cel?')) return;
    dataManager.deletePlannedGoal(id);
    renderAll();
  }

  function editGoal(id) {
    const goal = dataManager.getPlannedExpenses().find(g => g.id === id);
    if (!goal) return;

    editingGoalId = id;

    const modal = $('modal-goal');
    const form = modal.querySelector('form');

    // Prefill form
    form.querySelector('input[type="text"]').value = goal.name || '';
    form.querySelectorAll('input[type="number"]')[0].value = goal.targetAmount || '';
    form.querySelectorAll('input[type="number"]')[1].value = goal.currentAmount || 0;

    // Set deadline (month format)
    if (goal.targetDate) {
      form.querySelector('input[type="month"]').value = goal.targetDate.slice(0, 7);
    }

    // Set type chip
    const typeChips = form.querySelectorAll('.chips')[0].querySelectorAll('.chip');
    typeChips.forEach(c => c.classList.remove('active'));
    if (goal.type === 'recurring') {
      typeChips[1].classList.add('active');
    } else {
      typeChips[0].classList.add('active');
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

      const amount = parseFloat(form.querySelector('input[type="number"]').value) || 0;
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
          console.log('New achievements:', newAchievements);
        }
      }

      closeAllModals();
      renderAll();
    };
  }

  // ============ SETTINGS ============
  function setupSettings() {
    const items = $$('#screen-settings .list-item');
    if (items.length >= 5) {
      items[0].onclick = changePin;
      items[1].onclick = () => alert('Kategorie - wkrótce');
      items[2].onclick = exportData;
      items[3].onclick = importData;
      items[4].onclick = clearData;
    }
  }

  function changePin() {
    const newPin = prompt('Nowy PIN (4 cyfry):');
    if (newPin && /^\d{4}$/.test(newPin)) {
      if (typeof PinManager !== 'undefined') {
        PinManager.setPin(newPin);
        PinManager.startSession();
        alert('PIN zmieniony!');
      } else {
        // Fallback
        const settings = JSON.parse(localStorage.getItem('familygoals_settings') || '{}');
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

          // Import each type
          if (imported.expenses) {
            localStorage.setItem(DataManager.STORAGE_KEYS.expenses, JSON.stringify(imported.expenses));
          }
          if (imported.income) {
            localStorage.setItem(DataManager.STORAGE_KEYS.income, JSON.stringify(imported.income));
          }
          if (imported.incomeSources) {
            localStorage.setItem(DataManager.STORAGE_KEYS.incomeSources, JSON.stringify(imported.incomeSources));
          }
          if (imported.goals) {
            localStorage.setItem('familygoals_planned_override', JSON.stringify(imported.goals));
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

    const catNames = {
      start: '🌟 Pierwsze kroki',
      savings: '💰 Oszczędności',
      spending: '💸 Wydatki',
      goals: '🎯 Cele',
      income: '💵 Przychody',
      couple: '💑 Para',
      coop: '🤝 Współpraca',
      streak: '🔥 Streak',
      level: '📊 Poziomy',
      special: '🎉 Specjalne',
      expert: '🏆 Ekspert'
    };

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

  // ============ RESET EDIT STATE ============
  function resetEditState() {
    editingGoalId = null;
    editingSourceId = null;
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
    dismissAlert
  };

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
