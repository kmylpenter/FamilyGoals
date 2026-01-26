/**
 * Family Balance - Łączenie pieniędzy z wartościami rodzinnymi
 *
 * Słabości do zaadresowania:
 * - Mąż: więcej pracuje, więcej zarabia → pokazać wartość CZASU
 * - Żona: docenia czas razem → pokazać że oszczędzanie = WIĘCEJ czasu razem
 * - Oboje: bez pieniędzy nie osiągną celów → połączyć cele z "dlaczego"
 */
class FamilyBalanceManager {
  static STORAGE_KEY = 'familygoals_balance';

  // === CELE Z "DLACZEGO" ===
  // Każdy cel finansowy ma znaczenie rodzinne
  static GOAL_MEANINGS = {
    vacation: {
      icon: '🏖️',
      meaning: 'Wspólne wspomnienia',
      motivation: {
        husband: 'Czas z rodziną bez myślenia o pracy',
        wife: 'Wakacje, o których marzymy razem'
      },
      timeValue: '2 tygodnie razem bez stresu'
    },
    education: {
      icon: '🎓',
      meaning: 'Przyszłość dziecka',
      motivation: {
        husband: 'Twoja praca dziś = jego możliwości jutro',
        wife: 'Inwestycja w marzenia naszego dziecka'
      },
      timeValue: 'Spokój o przyszłość'
    },
    emergency: {
      icon: '🛡️',
      meaning: 'Bezpieczeństwo rodziny',
      motivation: {
        husband: 'Możesz zwolnić tempo bez strachu',
        wife: 'Spokój, że damy radę w każdej sytuacji'
      },
      timeValue: '6 miesięcy bez stresu finansowego'
    },
    home: {
      icon: '🏠',
      meaning: 'Nasze gniazdko',
      motivation: {
        husband: 'Dom, do którego wracasz z radością',
        wife: 'Przestrzeń dla naszej rodziny'
      },
      timeValue: 'Miejsce na wspólne chwile'
    },
    retirement: {
      icon: '🌅',
      meaning: 'Czas tylko dla nas',
      motivation: {
        husband: 'Wcześniejsza emerytura = więcej lat razem',
        wife: 'Kiedyś tylko my dwoje i zero pośpiechu'
      },
      timeValue: 'Lata wspólnych podróży i spokoju'
    },
    car: {
      icon: '🚗',
      meaning: 'Swoboda rodzinna',
      motivation: {
        husband: 'Weekendowe wypady bez planowania',
        wife: 'Łatwiejsze życie z dzieckiem'
      },
      timeValue: 'Więcej spontanicznych przygód'
    },
    hobby: {
      icon: '🎨',
      meaning: 'Czas dla siebie',
      motivation: {
        husband: 'Zasługujesz na swój czas',
        wife: 'Twoje pasje są ważne'
      },
      timeValue: 'Balans i szczęście'
    }
  };

  // === NAGRODY ZA BALANS (nie tylko pieniądze!) ===
  static BALANCE_ACHIEVEMENTS = {
    // DLA MĘŻA - nagrody za CZAS z rodziną
    husband_present: {
      id: 'husband_present',
      name: 'Obecny tata',
      description: 'Spędź weekend bez pracy',
      icon: '👨‍👧',
      points: 50,
      for: 'husband',
      type: 'time'
    },
    husband_date: {
      id: 'husband_date',
      name: 'Randka z żoną',
      description: 'Zaplanuj wieczór we dwoje',
      icon: '💑',
      points: 40,
      for: 'husband',
      type: 'time'
    },
    husband_unplug: {
      id: 'husband_unplug',
      name: 'Offline',
      description: 'Dzień bez sprawdzania maili z pracy',
      icon: '📵',
      points: 30,
      for: 'husband',
      type: 'time'
    },
    husband_play: {
      id: 'husband_play',
      name: 'Czas zabawy',
      description: 'Godzina zabawy z dzieckiem',
      icon: '🎮',
      points: 20,
      for: 'husband',
      type: 'time'
    },
    husband_early: {
      id: 'husband_early',
      name: 'Wczesny powrót',
      description: 'Wróć z pracy przed 17:00',
      icon: '🏠',
      points: 25,
      for: 'husband',
      type: 'time'
    },
    husband_cook: {
      id: 'husband_cook',
      name: 'Szef kuchni',
      description: 'Ugotuj obiad dla rodziny',
      icon: '👨‍🍳',
      points: 35,
      for: 'husband',
      type: 'home'
    },
    husband_bedtime: {
      id: 'husband_bedtime',
      name: 'Bajka na dobranoc',
      description: 'Ułóż dziecko spać',
      icon: '📖',
      points: 25,
      for: 'husband',
      type: 'time'
    },

    // DLA ŻONY - nagrody za FINANSE (inwestycja w przyszły czas razem)
    wife_tracker: {
      id: 'wife_tracker',
      name: 'Strażniczka budżetu',
      description: 'Zapisz wszystkie wydatki dnia',
      icon: '📝',
      points: 20,
      for: 'wife',
      type: 'finance'
    },
    wife_saver: {
      id: 'wife_saver',
      name: 'Oszczędna mama',
      description: 'Znajdź tańszą alternatywę',
      icon: '🐷',
      points: 30,
      for: 'wife',
      type: 'finance'
    },
    wife_planner: {
      id: 'wife_planner',
      name: 'Planistka',
      description: 'Zaplanuj wydatki na tydzień',
      icon: '📋',
      points: 25,
      for: 'wife',
      type: 'finance'
    },
    wife_goal: {
      id: 'wife_goal',
      name: 'Marzycielka',
      description: 'Dodaj wpłatę na wspólny cel',
      icon: '🌟',
      points: 40,
      for: 'wife',
      type: 'finance'
    },
    wife_no_impulse: {
      id: 'wife_no_impulse',
      name: 'Silna wola',
      description: 'Odmów sobie impulsowego zakupu',
      icon: '💪',
      points: 35,
      for: 'wife',
      type: 'finance'
    },
    wife_review: {
      id: 'wife_review',
      name: 'Przegląd tygodnia',
      description: 'Przejrzyj wydatki tygodnia',
      icon: '📊',
      points: 25,
      for: 'wife',
      type: 'finance'
    },
    wife_dream_talk: {
      id: 'wife_dream_talk',
      name: 'Rozmowa o marzeniach',
      description: 'Porozmawiaj z mężem o celach',
      icon: '💭',
      points: 30,
      for: 'wife',
      type: 'together'
    },

    // WSPÓLNE - za działanie RAZEM
    together_review: {
      id: 'together_review',
      name: 'Narada finansowa',
      description: 'Przejrzyjcie finanse razem',
      icon: '☕',
      points: 50,
      for: 'both',
      type: 'together'
    },
    together_goal_set: {
      id: 'together_goal_set',
      name: 'Wspólne marzenie',
      description: 'Ustalcie nowy cel razem',
      icon: '🎯',
      points: 60,
      for: 'both',
      type: 'together'
    },
    together_celebrate: {
      id: 'together_celebrate',
      name: 'Świętowanie',
      description: 'Świętujcie osiągnięty cel',
      icon: '🎉',
      points: 100,
      for: 'both',
      type: 'together'
    },
    together_dream_date: {
      id: 'together_dream_date',
      name: 'Randka marzeń',
      description: 'Wieczór na planowanie przyszłości',
      icon: '✨',
      points: 75,
      for: 'both',
      type: 'together'
    }
  };

  // === PERSONALIZOWANE PORADY ===
  static PERSONALIZED_ADVICE = {
    husband: {
      workaholic: [
        {
          trigger: 'weekend_work',
          message: '💼→👨‍👩‍👧 Pieniądze zarobisz, ale weekend z rodziną nie wróci.',
          action: 'Odłóż telefon służbowy do poniedziałku'
        },
        {
          trigger: 'late_home',
          message: '🏠 Twoje dziecko rośnie. Każdy wieczór się liczy.',
          action: 'Wyjdź dziś o 17:00'
        },
        {
          trigger: 'goal_achieved',
          message: '🎉 Twoja praca się opłaciła! Teraz ŚWIĘTUJ z rodziną.',
          action: 'Zorganizuj rodzinną kolację'
        }
      ],
      motivation: [
        'Oszczędzasz na wakacje = 2 tygodnie BEZ maili z pracy',
        'Fundusz awaryjny = możesz powiedzieć "nie" nadgodzinom',
        'Cel edukacyjny = więcej czasu z dzieckiem zamiast stresu o kasę'
      ],
      reframe: {
        saving: 'Każda zaoszczędzona złotówka = mniej godzin w pracy w przyszłości',
        goal: 'Ten cel = czas z rodziną bez poczucia winy'
      }
    },
    wife: {
      time_lover: [
        {
          trigger: 'expense_added',
          message: '📝 Świetnie! Każdy zapisany wydatek = lepsze planowanie wspólnego czasu.',
          action: 'Kontynuuj śledzenie'
        },
        {
          trigger: 'impulse_resist',
          message: '💪 Te 50 zł to pół dnia wakacji razem!',
          action: 'Wrzuć na cel wakacyjny'
        },
        {
          trigger: 'goal_contribution',
          message: '🌟 Krok bliżej do wspólnych marzeń!',
          action: 'Pokaż mężowi postęp'
        }
      ],
      motivation: [
        'Śledzenie wydatków = kontrola, nie ograniczenie',
        'Oszczędzanie teraz = więcej czasu RAZEM później',
        'Cel finansowy = konkretnа data wspólnych wakacji'
      ],
      reframe: {
        budget: 'Budżet to nie ograniczenie - to plan na marzenia',
        saving: 'Każda złotówka oszczędzona = minuta wspólnego czasu w przyszłości'
      }
    }
  };

  constructor(dataManager) {
    this.dm = dataManager;
    this.data = this._loadData();
  }

  _loadData() {
    const stored = localStorage.getItem(FamilyBalanceManager.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('[FamilyBalanceManager] JSON parse error:', e);
      }
    }
    return {
      husband: {
        timeActivities: [],
        balanceScore: 50, // 0-100, 50 = środek
        lastPresent: null
      },
      wife: {
        financeActivities: [],
        balanceScore: 50,
        lastTracking: null
      },
      together: {
        reviews: [],
        celebrations: [],
        lastTogether: null
      },
      goals: {} // goalId -> meaning mapping
    };
  }

  _save() {
    localStorage.setItem(FamilyBalanceManager.STORAGE_KEY, JSON.stringify(this.data));
  }

  // ==========================================
  // CELE Z ZNACZENIEM
  // ==========================================

  /**
   * Przypisz znaczenie do celu
   */
  assignMeaningToGoal(goalId, meaningType) {
    const meaning = FamilyBalanceManager.GOAL_MEANINGS[meaningType];
    if (!meaning) return null;

    this.data.goals[goalId] = {
      type: meaningType,
      ...meaning,
      assignedAt: new Date().toISOString()
    };

    this._save();
    return this.data.goals[goalId];
  }

  /**
   * Pobierz cel z jego "dlaczego"
   */
  getGoalWithMeaning(goalId) {
    const goal = this.dm.getPlannedExpenses().find(g => g.id === goalId);
    if (!goal) return null;

    const meaning = this.data.goals[goalId];
    const timeToGoal = this.dm.calculateTimeToGoal(goalId);

    return {
      ...goal,
      meaning: meaning || null,
      // Przekształć kwotę na "czas razem"
      timeValue: meaning?.timeValue || null,
      // Motywacja dla każdego
      motivationForHusband: meaning?.motivation?.husband || null,
      motivationForWife: meaning?.motivation?.wife || null,
      // Progress w kontekście znaczenia
      progressMessage: this._getProgressMessage(goal, meaning, timeToGoal)
    };
  }

  _getProgressMessage(goal, meaning, timeToGoal) {
    if (!meaning) return null;

    const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);

    if (percent >= 100) {
      return `🎉 Osiągnięte! ${meaning.timeValue} czeka na Was!`;
    }
    if (percent >= 75) {
      return `🌟 Już blisko! ${meaning.timeValue} coraz bliżej!`;
    }
    if (percent >= 50) {
      return `💪 Połowa drogi do: ${meaning.timeValue}`;
    }
    if (percent >= 25) {
      return `🌱 Dobry start! Cel: ${meaning.timeValue}`;
    }
    return `🎯 Zaczynacie drogę do: ${meaning.timeValue}`;
  }

  // ==========================================
  // ŚLEDZENIE BALANSU
  // ==========================================

  /**
   * Zarejestruj aktywność "czasową" męża
   */
  recordHusbandTimeActivity(activityId, note = '') {
    const achievement = FamilyBalanceManager.BALANCE_ACHIEVEMENTS[activityId];
    if (!achievement || achievement.for !== 'husband') return null;

    const activity = {
      id: activityId,
      date: new Date().toISOString(),
      note,
      points: achievement.points
    };

    this.data.husband.timeActivities.push(activity);
    this.data.husband.lastPresent = activity.date;

    // Popraw balance score
    this.data.husband.balanceScore = Math.min(100,
      this.data.husband.balanceScore + 5
    );

    this._save();

    return {
      activity,
      achievement,
      message: this._getHusbandEncouragement(),
      newBalance: this.data.husband.balanceScore
    };
  }

  /**
   * Zarejestruj aktywność finansową żony
   */
  recordWifeFinanceActivity(activityId, note = '') {
    const achievement = FamilyBalanceManager.BALANCE_ACHIEVEMENTS[activityId];
    if (!achievement || achievement.for !== 'wife') return null;

    const activity = {
      id: activityId,
      date: new Date().toISOString(),
      note,
      points: achievement.points
    };

    this.data.wife.financeActivities.push(activity);
    this.data.wife.lastTracking = activity.date;

    // Popraw balance score
    this.data.wife.balanceScore = Math.min(100,
      this.data.wife.balanceScore + 5
    );

    this._save();

    return {
      activity,
      achievement,
      message: this._getWifeEncouragement(),
      newBalance: this.data.wife.balanceScore
    };
  }

  /**
   * Zarejestruj aktywność wspólną
   */
  recordTogetherActivity(activityId, note = '') {
    const achievement = FamilyBalanceManager.BALANCE_ACHIEVEMENTS[activityId];
    if (!achievement || achievement.for !== 'both') return null;

    const activity = {
      id: activityId,
      date: new Date().toISOString(),
      note,
      points: achievement.points
    };

    if (activityId.includes('review')) {
      this.data.together.reviews.push(activity);
    } else if (activityId.includes('celebrate')) {
      this.data.together.celebrations.push(activity);
    }

    this.data.together.lastTogether = activity.date;

    // Wspólna aktywność poprawia balans OBOJGA
    this.data.husband.balanceScore = Math.min(100,
      this.data.husband.balanceScore + 10
    );
    this.data.wife.balanceScore = Math.min(100,
      this.data.wife.balanceScore + 10
    );

    this._save();

    return {
      activity,
      achievement,
      message: '💕 Wspólny czas to najlepsza inwestycja!',
      pointsEach: achievement.points
    };
  }

  // ==========================================
  // PERSONALIZOWANE PORADY
  // ==========================================

  /**
   * Pobierz poradę dla męża
   */
  getAdviceForHusband() {
    const advice = FamilyBalanceManager.PERSONALIZED_ADVICE.husband;
    const daysSincePresent = this._daysSince(this.data.husband.lastPresent);

    // Jeśli dawno nie było czasu z rodziną
    if (daysSincePresent > 7) {
      return {
        type: 'reminder',
        icon: '⏰',
        title: 'Tydzień bez "czasu taty"',
        message: 'Twoja praca jest ważna, ale dziecko rośnie szybko.',
        action: 'Zaplanuj coś wspólnego na weekend',
        motivation: advice.reframe.saving
      };
    }

    // Losowa motywacja
    const motivations = advice.motivation;
    return {
      type: 'motivation',
      icon: '💪',
      title: 'Pamiętaj',
      message: motivations[Math.floor(Math.random() * motivations.length)],
      action: null
    };
  }

  /**
   * Pobierz poradę dla żony
   */
  getAdviceForWife() {
    const advice = FamilyBalanceManager.PERSONALIZED_ADVICE.wife;
    const daysSinceTracking = this._daysSince(this.data.wife.lastTracking);

    // Jeśli dawno nie było śledzenia
    if (daysSinceTracking > 3) {
      return {
        type: 'reminder',
        icon: '📝',
        title: 'Wróć do śledzenia',
        message: 'Każdy zapisany wydatek = lepsze planowanie wspólnego czasu.',
        action: 'Dodaj wydatki z ostatnich dni',
        motivation: advice.reframe.budget
      };
    }

    // Losowa motywacja
    const motivations = advice.motivation;
    return {
      type: 'motivation',
      icon: '🌟',
      title: 'Pamiętaj',
      message: motivations[Math.floor(Math.random() * motivations.length)],
      action: null
    };
  }

  _getHusbandEncouragement() {
    const messages = [
      '👨‍👩‍👧 Twoja obecność jest bezcenna!',
      '❤️ Żona i dziecko to docenią.',
      '🏠 Dom to nie tylko pieniądze.',
      '⏰ Czas z rodziną > nadgodziny.',
      '🌟 Super tata w akcji!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  _getWifeEncouragement() {
    const messages = [
      '💪 Świetna robota, strażniczko budżetu!',
      '🎯 Krok bliżej do wspólnych marzeń!',
      '📊 Kontrola = spokój dla rodziny.',
      '🐷 Każda złotówka się liczy!',
      '🌟 Inwestujesz w wasz wspólny czas!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // ==========================================
  // DASHBOARD BALANSU
  // ==========================================

  /**
   * Pobierz status balansu rodziny
   */
  getBalanceStatus() {
    const husbandTimeThisWeek = this._getActivitiesThisWeek('husband');
    const wifeFinanceThisWeek = this._getActivitiesThisWeek('wife');
    const togetherThisMonth = this.data.together.reviews.filter(r =>
      this._isThisMonth(r.date)
    ).length;

    return {
      husband: {
        balanceScore: this.data.husband.balanceScore,
        status: this._getBalanceLabel(this.data.husband.balanceScore),
        timeActivitiesThisWeek: husbandTimeThisWeek,
        suggestion: husbandTimeThisWeek < 3
          ? 'Znajdź czas dla rodziny w tym tygodniu'
          : 'Świetny balans! Tak trzymaj!',
        lastPresent: this.data.husband.lastPresent
      },
      wife: {
        balanceScore: this.data.wife.balanceScore,
        status: this._getBalanceLabel(this.data.wife.balanceScore),
        financeActivitiesThisWeek: wifeFinanceThisWeek,
        suggestion: wifeFinanceThisWeek < 3
          ? 'Śledź wydatki - to inwestycja w wasz czas!'
          : 'Super praca! Budżet pod kontrolą!',
        lastTracking: this.data.wife.lastTracking
      },
      together: {
        reviewsThisMonth: togetherThisMonth,
        suggestion: togetherThisMonth < 2
          ? 'Zaplanujcie wspólny przegląd finansów'
          : 'Świetna współpraca!',
        lastTogether: this.data.together.lastTogether
      },
      overallHealth: Math.round(
        (this.data.husband.balanceScore + this.data.wife.balanceScore) / 2
      )
    };
  }

  _getBalanceLabel(score) {
    if (score >= 80) return { label: 'Świetny balans', icon: '🌟', color: 'green' };
    if (score >= 60) return { label: 'Dobry balans', icon: '👍', color: 'blue' };
    if (score >= 40) return { label: 'Do poprawy', icon: '⚠️', color: 'yellow' };
    return { label: 'Potrzebna uwaga', icon: '🔴', color: 'red' };
  }

  _getActivitiesThisWeek(owner) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activities = owner === 'husband'
      ? this.data.husband.timeActivities
      : this.data.wife.financeActivities;

    return activities.filter(a => new Date(a.date) > weekAgo).length;
  }

  _isThisMonth(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() &&
           date.getFullYear() === now.getFullYear();
  }

  _daysSince(dateStr) {
    // Use shared utility if available
    if (window.FGUtils?.daysSince) {
      return FGUtils.daysSince(dateStr);
    }
    if (!dateStr) return 999;
    const then = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - then) / 86400000);
  }

  // ==========================================
  // KONWERSJA PIENIĘDZY NA CZAS
  // ==========================================

  /**
   * Przelicz oszczędności na "czas razem"
   */
  convertSavingsToTime(amount) {
    // Przykładowe przeliczniki
    const conversions = [
      { threshold: 100, time: '1 wspólna kawa', icon: '☕' },
      { threshold: 300, time: '1 kolacja we dwoje', icon: '🍽️' },
      { threshold: 500, time: '1 dzień wycieczki', icon: '🚗' },
      { threshold: 1500, time: '1 weekend wyjazdowy', icon: '🏕️' },
      { threshold: 5000, time: '1 tydzień wakacji', icon: '🏖️' },
      { threshold: 10000, time: '2 tygodnie wakacji', icon: '✈️' },
      { threshold: 50000, time: '1 rok mniej pracy', icon: '🌅' }
    ];

    // Znajdź najwyższy pasujący
    let result = null;
    for (const conv of conversions) {
      if (amount >= conv.threshold) {
        result = conv;
      }
    }

    return result || { time: 'Każda złotówka się liczy!', icon: '💰' };
  }

  /**
   * Pokaż cel w kontekście czasu
   */
  getGoalAsTime(goalId) {
    const goal = this.dm.getPlannedExpenses().find(g => g.id === goalId);
    if (!goal) return null;

    const conversion = this.convertSavingsToTime(goal.targetAmount);
    const currentConversion = this.convertSavingsToTime(goal.currentAmount);

    return {
      goal: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      // W kontekście czasu
      targetAsTime: conversion,
      currentAsTime: currentConversion,
      message: `Oszczędzacie na: ${conversion.time}`,
      progress: `Już macie na: ${currentConversion.time}`
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FamilyBalanceManager;
}
