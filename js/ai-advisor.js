/**
 * AI Advisor - Szczere porady finansowe na przyszły miesiąc
 * Bez owijania w bawełnę. Cel = kluczowy.
 */
class AIAdvisor {
  constructor(dataManager) {
    this.dm = dataManager;
  }

  /**
   * Generuj porady na przyszły miesiąc
   * @returns {Object} Pełny raport z poradami
   */
  generateAdvice() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Zbierz dane
    const currentStats = this.dm.getMonthlyStats(currentYear, currentMonth);
    const trend = this.dm.getTrend(6);
    const goals = this.dm.getPlannedExpenses();
    const alerts = this.dm.getAllAlerts();
    const incomeSummary = this.dm.getMonthlyIncomeSummary(currentYear, currentMonth);

    // Analiza
    const analysis = this._analyzeData(currentStats, trend, goals, incomeSummary);

    // Generuj porady
    const advice = this._generateAdvice(analysis);

    return {
      generatedAt: new Date().toISOString(),
      nextMonth: this._getNextMonthName(),
      summary: this._generateSummary(analysis),
      keyMessage: this._getKeyMessage(analysis),
      advice,
      priorities: this._getPriorities(analysis),
      warnings: this._getWarnings(analysis),
      opportunities: this._getOpportunities(analysis),
      projections: this._getProjections(analysis)
    };
  }

  _analyzeData(stats, trend, goals, income) {
    const avgSavings = trend.reduce((s, t) => s + t.savings, 0) / trend.length;
    const avgExpenses = trend.reduce((s, t) => s + t.totalExpenses, 0) / trend.length;
    const savingsTarget = stats.savingsTarget || 0;

    // Trendy
    const savingsTrend = this._calculateTrend(trend.map(t => t.savings));
    const expensesTrend = this._calculateTrend(trend.map(t => t.totalExpenses));

    // Cele w niebezpieczeństwie
    const goalsAtRisk = goals.filter(g => {
      const progress = this.dm.calculateTimeToGoal(g.id);
      return progress && !progress.complete && !progress.onTrack;
    });

    // Kategorie problemowe
    const categories = this.dm.getCategories();
    const overBudget = categories.filter(c => {
      if (!c.budget) return false;
      const spent = stats.byCategory[c.id] || 0;
      return spent > c.budget;
    });

    // Stopa oszczędności
    const savingsRate = stats.totalIncome > 0
      ? (stats.savings / stats.totalIncome) * 100
      : 0;

    return {
      currentSavings: stats.savings,
      avgSavings,
      savingsTarget,
      savingsRate,
      savingsTrend,
      expensesTrend,
      avgExpenses,
      totalExpenses: stats.totalExpenses,
      totalIncome: stats.totalIncome,
      goalsAtRisk,
      overBudget,
      goals,
      incomeComplete: income.percentReceived,
      isProfitable: stats.savings > 0,
      isOnTarget: stats.savings >= savingsTarget,
      deficit: savingsTarget - stats.savings
    };
  }

  _calculateTrend(values) {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3);
    const older = values.slice(0, 3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

    if (change > 15) return 'rising';
    if (change < -15) return 'falling';
    return 'stable';
  }

  _generateSummary(a) {
    if (a.savingsRate >= 30) {
      return `Świetnie! Oszczędzasz ${Math.round(a.savingsRate)}% przychodów. To powyżej normy.`;
    }
    if (a.savingsRate >= 20) {
      return `Dobrze. ${Math.round(a.savingsRate)}% przychodów na oszczędności to solidny wynik.`;
    }
    if (a.savingsRate >= 10) {
      return `OK, ale mogłoby być lepiej. ${Math.round(a.savingsRate)}% to minimum.`;
    }
    if (a.savingsRate > 0) {
      return `Słabo. Tylko ${Math.round(a.savingsRate)}% na oszczędności. Musisz ciąć wydatki.`;
    }
    return `Alarm! Wydajesz więcej niż zarabiasz. Natychmiast zatrzymaj zbędne wydatki.`;
  }

  _getKeyMessage(a) {
    // Główny problem - bez owijania
    if (!a.isProfitable) {
      return {
        type: 'critical',
        icon: '🚨',
        title: 'STOP! Wydajesz więcej niż zarabiasz.',
        message: `Brakuje ${this.dm.formatCurrency(Math.abs(a.currentSavings))}. ` +
                 `Musisz natychmiast znaleźć te pieniądze lub ciąć wydatki.`
      };
    }

    if (a.goalsAtRisk.length > 0) {
      const goal = a.goalsAtRisk[0];
      return {
        type: 'warning',
        icon: '⚠️',
        title: `Cel "${goal.name}" jest zagrożony.`,
        message: `Przy obecnym tempie nie zdążysz. Musisz zwiększyć wpłaty lub przesunąć deadline.`
      };
    }

    if (a.overBudget.length > 0) {
      return {
        type: 'warning',
        icon: '💸',
        title: `${a.overBudget.length} kategorii przekroczyło budżet.`,
        message: `Największy problem: ${a.overBudget[0].name}. Następny miesiąc - zero tolerancji.`
      };
    }

    if (!a.isOnTarget && a.savingsTarget > 0) {
      return {
        type: 'info',
        icon: '📊',
        title: `Brakuje ${this.dm.formatCurrency(a.deficit)} do celu.`,
        message: `Przeanalizuj, co możesz ograniczyć. Każda złotówka się liczy.`
      };
    }

    return {
      type: 'success',
      icon: '✅',
      title: 'Jesteś na dobrej drodze.',
      message: `Utrzymaj tempo. Może uda się oszczędzić jeszcze więcej?`
    };
  }

  _generateAdvice(a) {
    const advice = [];

    // 1. Krytyczne - deficyt
    if (!a.isProfitable) {
      advice.push({
        priority: 1,
        type: 'critical',
        icon: '🔴',
        title: 'Zatrzymaj krwawienie',
        actions: [
          'Przeglądnij KAŻDY wydatek z ostatniego miesiąca',
          'Znajdź 3 rzeczy, które możesz odciąć natychmiast',
          'Rozważ dodatkowe źródło dochodu',
          'Nie kupuj NICZEGO co nie jest niezbędne'
        ]
      });
    }

    // 2. Cele zagrożone
    if (a.goalsAtRisk.length > 0) {
      a.goalsAtRisk.forEach(goal => {
        const timeInfo = this.dm.calculateTimeToGoal(goal.id);
        advice.push({
          priority: 2,
          type: 'warning',
          icon: '🎯',
          title: `Ratuj cel: ${goal.name}`,
          actions: [
            `Potrzebujesz ${this.dm.formatCurrency(timeInfo.monthly)}/mies. - czy to realne?`,
            'Jeśli nie - przesuń deadline TERAZ, nie odkładaj',
            'Rozważ jednorazową wpłatę z oszczędności',
            'Albo zmniejsz kwotę celu - lepszy mniejszy sukces niż wielka porażka'
          ]
        });
      });
    }

    // 3. Przekroczone budżety
    if (a.overBudget.length > 0) {
      const categories = a.overBudget.map(c => c.name).join(', ');
      advice.push({
        priority: 2,
        type: 'warning',
        icon: '💰',
        title: 'Opanuj wydatki w kategoriach',
        subtitle: categories,
        actions: [
          'Ustal TWARDY limit dzienny dla tych kategorii',
          'Sprawdzaj stan budżetu CO TYDZIEŃ, nie na koniec miesiąca',
          'Jeśli budżet za mały - zwiększ go, ale świadomie',
          'Jeśli wydatki za duże - znajdź tańsze alternatywy'
        ]
      });
    }

    // 4. Trend wydatków rosnący
    if (a.expensesTrend === 'rising') {
      advice.push({
        priority: 3,
        type: 'info',
        icon: '📈',
        title: 'Wydatki rosną z miesiąca na miesiąc',
        actions: [
          'To normalne? Inflacja? Czy tracisz kontrolę?',
          'Porównaj kategorie - która rośnie najszybciej?',
          'Ustal czy to trend stały czy jednorazowe wydatki'
        ]
      });
    }

    // 5. Trend oszczędności spadający
    if (a.savingsTrend === 'falling') {
      advice.push({
        priority: 3,
        type: 'info',
        icon: '📉',
        title: 'Oszczędzasz coraz mniej',
        actions: [
          'Coś się zmieniło? Nowe wydatki? Spadek dochodów?',
          'Wróć do podstaw - ile MUSISZ wydawać?',
          'Ustaw automatyczny przelew na konto oszczędności'
        ]
      });
    }

    // 6. Porady sezonowe
    const seasonalAdvice = this._getSeasonalAdvice();
    if (seasonalAdvice) {
      advice.push(seasonalAdvice);
    }

    // 7. Porada pozytywna (jeśli wszystko OK)
    if (advice.length === 0) {
      advice.push({
        priority: 5,
        type: 'success',
        icon: '🌟',
        title: 'Świetna robota!',
        actions: [
          'Rozważ zwiększenie celu oszczędności',
          'Może czas na nowy cel finansowy?',
          'Pomyśl o inwestowaniu nadwyżek'
        ]
      });
    }

    return advice.sort((a, b) => a.priority - b.priority);
  }

  _getSeasonalAdvice() {
    const month = new Date().getMonth();

    const seasonal = {
      0: { // Styczeń
        icon: '🎆',
        title: 'Nowy rok - nowe budżety',
        actions: [
          'Przejrzyj i zaktualizuj wszystkie cele',
          'Wyprzedaże? Kup tylko to, co PLANOWAŁEŚ',
          'Rozlicz się z grudniowych wydatków świątecznych'
        ]
      },
      5: { // Czerwiec
        icon: '☀️',
        title: 'Wakacje się zbliżają',
        actions: [
          'Zaplanuj budżet wakacyjny TERAZ',
          'Nie czekaj z rezerwacjami - drożeją',
          'Szukaj promocji na early booking'
        ]
      },
      8: { // Wrzesień
        icon: '🎒',
        title: 'Powrót do szkoły = wydatki',
        actions: [
          'Lista zakupów szkolnych - kupuj z listą!',
          'Porównaj ceny w różnych sklepach',
          'Używane podręczniki = oszczędność'
        ]
      },
      10: { // Listopad
        icon: '🛒',
        title: 'Black Friday = pułapka',
        actions: [
          'Zrób listę PRZED promocjami',
          'Jeśli nie planowałeś kupować - nie kupuj',
          '"50% zniżki" na coś niepotrzebnego = 100% straty'
        ]
      },
      11: { // Grudzień
        icon: '🎄',
        title: 'Święta - największy test budżetu',
        actions: [
          'Ustal LIMIT na prezenty i się go trzymaj',
          'Prezenty DIY są OK',
          'Jedzenie - planuj menu, nie kupuj "na zapas"'
        ]
      }
    };

    return seasonal[month] ? {
      priority: 4,
      type: 'seasonal',
      ...seasonal[month]
    } : null;
  }

  _getPriorities(a) {
    const priorities = [];

    if (!a.isProfitable) {
      priorities.push({
        rank: 1,
        text: 'Osiągnij dodatni bilans',
        urgent: true
      });
    }

    if (a.goalsAtRisk.length > 0) {
      priorities.push({
        rank: 2,
        text: `Uratuj cel: ${a.goalsAtRisk[0].name}`,
        urgent: true
      });
    }

    if (!a.isOnTarget && a.savingsTarget > 0) {
      priorities.push({
        rank: 3,
        text: `Osiągnij cel ${this.dm.formatCurrency(a.savingsTarget)}/mies.`,
        urgent: false
      });
    }

    if (a.overBudget.length > 0) {
      priorities.push({
        rank: 4,
        text: 'Opanuj przekroczone kategorie',
        urgent: false
      });
    }

    // Zawsze dodaj cel domyślny
    if (priorities.length === 0) {
      priorities.push({
        rank: 5,
        text: 'Utrzymaj obecne tempo',
        urgent: false
      });
    }

    return priorities.slice(0, 3);
  }

  _getWarnings(a) {
    const warnings = [];

    if (a.incomeComplete < 100) {
      warnings.push({
        icon: '💵',
        text: `Otrzymano ${a.incomeComplete}% oczekiwanych przychodów`
      });
    }

    if (a.savingsRate < 10 && a.isProfitable) {
      warnings.push({
        icon: '📊',
        text: 'Stopa oszczędności poniżej 10% - ryzykowne'
      });
    }

    if (a.goals.length === 0) {
      warnings.push({
        icon: '🎯',
        text: 'Brak celów finansowych - po co oszczędzasz?'
      });
    }

    return warnings;
  }

  _getOpportunities(a) {
    const opportunities = [];

    if (a.savingsRate > 20) {
      opportunities.push({
        icon: '📈',
        text: 'Nadwyżki mogłyby pracować - rozważ inwestycje'
      });
    }

    if (a.avgSavings > a.savingsTarget) {
      opportunities.push({
        icon: '🎯',
        text: 'Regularnie bijesz cel - może podnieść poprzeczkę?'
      });
    }

    return opportunities;
  }

  _getProjections(a) {
    const monthsAhead = 6;
    const projections = [];

    // Projekcja oszczędności
    let projected = 0;
    for (let i = 1; i <= monthsAhead; i++) {
      projected += a.avgSavings;
      projections.push({
        month: i,
        label: `Za ${i} mies.`,
        projected: Math.round(projected),
        formatted: this.dm.formatCurrency(projected)
      });
    }

    return {
      basedOn: 'Średnia z ostatnich 6 miesięcy',
      avgMonthlySavings: a.avgSavings,
      data: projections
    };
  }

  _getNextMonthName() {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }

  /**
   * Generuj krótką poradę dnia
   */
  getDailyTip() {
    const tips = [
      { icon: '💡', text: 'Przed zakupem poczekaj 24h. Nadal chcesz? Kup.' },
      { icon: '🛒', text: 'Lista zakupów = mniejszy rachunek.' },
      { icon: '☕', text: 'Kawa z domu = 100 zł/mies. więcej.' },
      { icon: '📱', text: 'Sprawdź subskrypcje. Używasz wszystkich?' },
      { icon: '🍽️', text: 'Gotuj w niedzielę na cały tydzień.' },
      { icon: '💳', text: 'Płać gotówką - łatwiej kontrolować.' },
      { icon: '🎯', text: 'Mały cel > brak celu.' },
      { icon: '📊', text: 'Sprawdzaj wydatki co tydzień, nie co miesiąc.' },
      { icon: '🏷️', text: 'Promocja na coś niepotrzebnego = strata.' },
      { icon: '💰', text: 'Najpierw zapłać sobie - przelewem na oszczędności.' },
      { icon: '🚗', text: 'Czy ta podróż jest konieczna? Transport to koszt.' },
      { icon: '📦', text: 'Używane = tańsze i ekologiczne.' },
      { icon: '🔌', text: 'Wyłącz standby. Rocznie to kilkaset złotych.' },
      { icon: '🍕', text: 'Jedzenie na mieście: 3x droższe niż w domu.' },
      { icon: '📅', text: 'Budżet miesięczny podziel na tygodnie.' }
    ];

    const dayIndex = new Date().getDate() % tips.length;
    return tips[dayIndex];
  }

  /**
   * Ocena miesiąca (brutalna szczerość)
   */
  getMonthRating() {
    const now = new Date();
    const stats = this.dm.getMonthlyStats(now.getFullYear(), now.getMonth());
    const target = stats.savingsTarget || 0;

    if (stats.savings < 0) {
      return {
        grade: 'F',
        emoji: '💀',
        title: 'Katastrofa',
        message: 'Wydałeś więcej niż zarobiłeś. To nie jest zrównoważone.'
      };
    }

    if (target > 0) {
      const percent = (stats.savings / target) * 100;

      if (percent >= 150) return {
        grade: 'A+',
        emoji: '🏆',
        title: 'Mistrzostwo!',
        message: 'Znacznie powyżej celu. Tak trzymać!'
      };
      if (percent >= 100) return {
        grade: 'A',
        emoji: '⭐',
        title: 'Cel osiągnięty',
        message: 'Świetna robota. Cel zrealizowany.'
      };
      if (percent >= 80) return {
        grade: 'B',
        emoji: '👍',
        title: 'Blisko celu',
        message: 'Prawie! Trochę brakowało.'
      };
      if (percent >= 50) return {
        grade: 'C',
        emoji: '😐',
        title: 'Średnio',
        message: 'Pół sukcesu. Musi być lepiej.'
      };
      if (percent >= 25) return {
        grade: 'D',
        emoji: '😟',
        title: 'Słabo',
        message: 'Dużo poniżej celu. Co poszło nie tak?'
      };
      return {
        grade: 'F',
        emoji: '😰',
        title: 'Porażka',
        message: 'Cel prawie nietknięty. Trzeba działać.'
      };
    }

    // Bez celu - ocena na podstawie stopy oszczędności
    const rate = stats.totalIncome > 0 ? (stats.savings / stats.totalIncome) * 100 : 0;

    if (rate >= 30) return { grade: 'A', emoji: '⭐', title: 'Świetnie', message: '30%+ oszczędności' };
    if (rate >= 20) return { grade: 'B', emoji: '👍', title: 'Dobrze', message: '20%+ oszczędności' };
    if (rate >= 10) return { grade: 'C', emoji: '😐', title: 'OK', message: 'Minimum zrealizowane' };
    if (rate > 0) return { grade: 'D', emoji: '😟', title: 'Mało', message: 'Poniżej 10%' };
    return { grade: 'F', emoji: '💀', title: 'Zero', message: 'Brak oszczędności' };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAdvisor;
}
