/**
 * Family Unity System - Łączenie zamiast dzielenia
 *
 * Filozofia:
 * - Rodzina to DRUŻYNA, nie przeciwnicy
 * - Różne wkłady są równie wartościowe
 * - Pieniądze ≠ jedyna miara sukcesu
 * - Wspólne cele > indywidualne punkty
 */
class FamilyUnityManager {
  static STORAGE_KEY = 'familygoals_unity';

  // === ROLE RODZINNE ===
  // Każdy może mieć wiele ról, role się uzupełniają
  static ROLES = {
    // === WKŁAD FINANSOWY ===
    breadwinner: {
      id: 'breadwinner',
      name: 'Główny żywiciel',
      description: 'Główne źródło przychodów rodziny',
      icon: '💼',
      type: 'financial'
    },
    side_hustler: {
      id: 'side_hustler',
      name: 'Dodatkowy dochód',
      description: 'Przynosi dodatkowe pieniądze',
      icon: '💰',
      type: 'financial'
    },

    // === WKŁAD DOMOWY ===
    home_ceo: {
      id: 'home_ceo',
      name: 'Szef/Szefowa domu',
      description: 'Zarządza domem i codziennymi sprawami',
      icon: '🏠',
      type: 'home'
    },
    budget_guardian: {
      id: 'budget_guardian',
      name: 'Strażnik budżetu',
      description: 'Pilnuje wydatków i oszczędności',
      icon: '🛡️',
      type: 'home'
    },
    smart_shopper: {
      id: 'smart_shopper',
      name: 'Sprytny kupujący',
      description: 'Znajduje okazje i oszczędza na zakupach',
      icon: '🛒',
      type: 'home'
    },

    // === WKŁAD RODZICIELSKI ===
    primary_caregiver: {
      id: 'primary_caregiver',
      name: 'Główny opiekun',
      description: 'Główna opieka nad dziećmi',
      icon: '👶',
      type: 'parenting'
    },
    homework_helper: {
      id: 'homework_helper',
      name: 'Pomocnik w lekcjach',
      description: 'Pomaga dzieciom z nauką',
      icon: '📚',
      type: 'parenting'
    },
    activity_planner: {
      id: 'activity_planner',
      name: 'Animator rodzinny',
      description: 'Planuje aktywności i wyjścia',
      icon: '🎪',
      type: 'parenting'
    },

    // === WKŁAD ORGANIZACYJNY ===
    planner: {
      id: 'planner',
      name: 'Strateg rodzinny',
      description: 'Planuje przyszłość i cele',
      icon: '📋',
      type: 'planning'
    },
    tracker: {
      id: 'tracker',
      name: 'Dokumentalista',
      description: 'Regularnie śledzi wydatki',
      icon: '📊',
      type: 'planning'
    },
    motivator: {
      id: 'motivator',
      name: 'Motywator',
      description: 'Podnosi na duchu i wspiera',
      icon: '🌟',
      type: 'emotional'
    }
  };

  // === WARTOŚCI WKŁADU ===
  // Każdy typ wkładu jest równie ważny
  static CONTRIBUTION_TYPES = {
    financial: {
      name: 'Wkład finansowy',
      description: 'Zarabianie pieniędzy',
      icon: '💵',
      examples: ['Pensja', 'Freelance', 'Premie']
    },
    tracking: {
      name: 'Śledzenie wydatków',
      description: 'Kontrola budżetu',
      icon: '📝',
      examples: ['Dodawanie wydatków', 'Sprawdzanie budżetu']
    },
    planning: {
      name: 'Planowanie',
      description: 'Ustalanie celów i strategii',
      icon: '🎯',
      examples: ['Cele finansowe', 'Budżety kategorii']
    },
    saving: {
      name: 'Oszczędzanie',
      description: 'Znajdowanie oszczędności',
      icon: '🐷',
      examples: ['Promocje', 'Tańsze alternatywy', 'Rezygnacja ze zbędnego']
    },
    home: {
      name: 'Praca domowa',
      description: 'Zarządzanie domem',
      icon: '🏠',
      examples: ['Gotowanie', 'Sprzątanie', 'Organizacja']
    },
    childcare: {
      name: 'Opieka nad dziećmi',
      description: 'Czas z dziećmi',
      icon: '👨‍👩‍👧‍👦',
      examples: ['Odrabianie lekcji', 'Zabawy', 'Opieka']
    }
  };

  // === WSPÓLNE CELE RODZINNE (TEAM GOALS) ===
  static TEAM_GOALS = {
    weekly_together: {
      id: 'weekly_together',
      name: 'Tydzień razem',
      description: 'Oboje logujcie się codziennie przez tydzień',
      icon: '🤝',
      reward: 100, // Punkty dla KAŻDEGO
      type: 'streak'
    },
    budget_success: {
      id: 'budget_success',
      name: 'Budżet w ryzach',
      description: 'Żadna kategoria nie przekroczyła budżetu',
      icon: '✅',
      reward: 150,
      type: 'monthly'
    },
    savings_goal: {
      id: 'savings_goal',
      name: 'Wspólny cel oszczędności',
      description: 'Osiągnijcie miesięczny cel oszczędności',
      icon: '💰',
      reward: 200,
      type: 'monthly'
    },
    financial_review: {
      id: 'financial_review',
      name: 'Narada finansowa',
      description: 'Przejrzyjcie razem finanse w weekend',
      icon: '☕',
      reward: 50,
      type: 'weekly'
    },
    dream_progress: {
      id: 'dream_progress',
      name: 'Krok do marzenia',
      description: 'Wpłaćcie na wspólny cel finansowy',
      icon: '🌟',
      reward: 75,
      type: 'action'
    }
  };

  // === NAGRODY RODZINNE (wspólne) ===
  static FAMILY_REWARDS = {
    pizza_night: {
      id: 'pizza_night',
      name: 'Wieczór z pizzą',
      description: 'Zamówiona pizza dla całej rodziny',
      cost: 150,
      icon: '🍕',
      type: 'family'
    },
    movie_together: {
      id: 'movie_together',
      name: 'Kino rodzinne',
      description: 'Film w kinie lub specjalny wieczór filmowy w domu',
      cost: 200,
      icon: '🎬',
      type: 'family'
    },
    day_trip: {
      id: 'day_trip',
      name: 'Wycieczka jednodniowa',
      description: 'Rodzinny wypad na jeden dzień',
      cost: 400,
      icon: '🚗',
      type: 'family'
    },
    restaurant: {
      id: 'restaurant',
      name: 'Kolacja w restauracji',
      description: 'Rodzinna kolacja poza domem',
      cost: 300,
      icon: '🍽️',
      type: 'family'
    },
    game_night: {
      id: 'game_night',
      name: 'Wieczór gier',
      description: 'Nowa gra planszowa + wieczór razem',
      cost: 100,
      icon: '🎲',
      type: 'family'
    },
    weekend_getaway: {
      id: 'weekend_getaway',
      name: 'Weekendowy wypad',
      description: 'Rodzinny weekend poza domem',
      cost: 800,
      icon: '🏕️',
      type: 'family'
    },
    dream_fund: {
      id: 'dream_fund',
      name: 'Doładuj marzenie',
      description: 'Dodatkowe 500 zł na wspólny cel',
      cost: 500,
      icon: '✨',
      type: 'financial'
    },

    // === NAGRODY INDYWIDUALNE (dla każdego z osobna) ===
    me_time: {
      id: 'me_time',
      name: 'Czas dla siebie',
      description: '3 godziny tylko dla siebie',
      cost: 150,
      icon: '🧘',
      type: 'personal'
    },
    sleep_in: {
      id: 'sleep_in',
      name: 'Długie spanie',
      description: 'Partner zajmuje się wszystkim rano',
      cost: 100,
      icon: '😴',
      type: 'personal'
    },
    hobby_budget: {
      id: 'hobby_budget',
      name: 'Budżet na hobby',
      description: '100 zł na swoje hobby',
      cost: 200,
      icon: '🎨',
      type: 'personal'
    },
    friend_time: {
      id: 'friend_time',
      name: 'Wyjście z przyjaciółmi',
      description: 'Wieczór ze znajomymi bez poczucia winy',
      cost: 150,
      icon: '👯',
      type: 'personal'
    }
  };

  constructor(dataManager) {
    this.dm = dataManager;
    this.data = this._loadData();
  }

  _loadData() {
    const stored = localStorage.getItem(FamilyUnityManager.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('[FamilyUnityManager] JSON parse error:', e);
      }
    }
    return {
      // WSPÓLNE dane rodziny
      family: {
        teamLevel: 1,
        teamXP: 0,
        sharedPoints: 0,
        goalsCompleted: [],
        rewardsEarned: [],
        milestones: [],
        weeklyReviewsDone: 0,
        monthsUnderBudget: 0,
        lastReviewDate: null
      },
      // Indywidualne role (ale nie punkty - te są wspólne!)
      wife: {
        roles: [],
        contributions: [],
        personalRewards: []
      },
      husband: {
        roles: [],
        contributions: [],
        personalRewards: []
      }
    };
  }

  _save() {
    localStorage.setItem(FamilyUnityManager.STORAGE_KEY, JSON.stringify(this.data));
  }

  // ==========================================
  // SYSTEM POZIOMÓW RODZINY
  // ==========================================

  static FAMILY_LEVELS = {
    1: { name: 'Początkująca rodzina', xpNeeded: 0, icon: '🌱', bonus: 1.0 },
    2: { name: 'Rozwijająca się', xpNeeded: 500, icon: '🌿', bonus: 1.1 },
    3: { name: 'Zorganizowana', xpNeeded: 1500, icon: '🌳', bonus: 1.2 },
    4: { name: 'Oszczędna', xpNeeded: 3500, icon: '💚', bonus: 1.3 },
    5: { name: 'Finansowo świadoma', xpNeeded: 7000, icon: '⭐', bonus: 1.5 },
    6: { name: 'Budżetowa elita', xpNeeded: 12000, icon: '🌟', bonus: 1.7 },
    7: { name: 'Mistrzowie finansów', xpNeeded: 20000, icon: '💎', bonus: 2.0 },
    8: { name: 'Finansowa forteca', xpNeeded: 35000, icon: '🏰', bonus: 2.5 },
    9: { name: 'Legenda rodzinna', xpNeeded: 50000, icon: '👑', bonus: 3.0 },
    10: { name: 'Dynastia', xpNeeded: 100000, icon: '🎖️', bonus: 5.0 }
  };

  /**
   * Dodaj XP dla całej rodziny
   */
  addFamilyXP(amount, reason) {
    const bonus = this._getCurrentBonus();
    const xpGained = Math.round(amount * bonus);

    this.data.family.teamXP += xpGained;
    this._checkLevelUp();
    this._save();

    return {
      xpGained,
      bonus,
      newTotal: this.data.family.teamXP,
      level: this.data.family.teamLevel
    };
  }

  _checkLevelUp() {
    const levels = FamilyUnityManager.FAMILY_LEVELS;
    for (let lvl = 10; lvl >= 1; lvl--) {
      if (this.data.family.teamXP >= levels[lvl].xpNeeded) {
        if (this.data.family.teamLevel < lvl) {
          this.data.family.teamLevel = lvl;
          return { leveledUp: true, newLevel: lvl };
        }
        break;
      }
    }
    return { leveledUp: false };
  }

  _getCurrentBonus() {
    return FamilyUnityManager.FAMILY_LEVELS[this.data.family.teamLevel].bonus;
  }

  getFamilyStatus() {
    const level = this.data.family.teamLevel;
    const levelData = FamilyUnityManager.FAMILY_LEVELS[level];
    const nextLevel = FamilyUnityManager.FAMILY_LEVELS[level + 1];

    return {
      level,
      name: levelData.name,
      icon: levelData.icon,
      bonus: levelData.bonus,
      currentXP: this.data.family.teamXP,
      xpForCurrentLevel: levelData.xpNeeded,
      xpForNextLevel: nextLevel?.xpNeeded || null,
      xpProgress: nextLevel
        ? Math.round(((this.data.family.teamXP - levelData.xpNeeded) /
            (nextLevel.xpNeeded - levelData.xpNeeded)) * 100)
        : 100,
      sharedPoints: this.data.family.sharedPoints
    };
  }

  // ==========================================
  // WSPÓLNE PUNKTY (zamiast indywidualnych)
  // ==========================================

  /**
   * Dodaj wspólne punkty
   * Oboje korzystają z tej samej puli!
   */
  addSharedPoints(amount, reason = '') {
    const bonus = this._getCurrentBonus();
    const points = Math.round(amount * bonus);

    this.data.family.sharedPoints += points;
    this.addFamilyXP(Math.round(amount / 2), reason);
    this._save();

    return {
      pointsAdded: points,
      total: this.data.family.sharedPoints,
      reason
    };
  }

  /**
   * Wydaj wspólne punkty (na nagrodę)
   */
  spendSharedPoints(amount) {
    if (this.data.family.sharedPoints < amount) {
      return { success: false, error: 'Za mało wspólnych punktów' };
    }

    this.data.family.sharedPoints -= amount;
    this._save();

    return {
      success: true,
      spent: amount,
      remaining: this.data.family.sharedPoints
    };
  }

  // ==========================================
  // REJESTRACJA WKŁADU
  // ==========================================

  /**
   * Zarejestruj wkład (nie tylko finansowy!)
   */
  recordContribution(owner, type, description = '') {
    const contribution = {
      type,
      description,
      date: new Date().toISOString()
    };

    this.data[owner].contributions.push(contribution);

    // XP i punkty za wkład
    const xpMap = {
      financial: 10,
      tracking: 5,
      planning: 8,
      saving: 7,
      home: 6,
      childcare: 8
    };

    const xp = xpMap[type] || 5;
    this.addFamilyXP(xp, `${owner}: ${type}`);
    this.addSharedPoints(xp);

    this._save();

    return contribution;
  }

  /**
   * Pobierz wkłady obu partnerów
   */
  getContributionsSummary() {
    const wifeContribs = this._countContributions('wife');
    const husbandContribs = this._countContributions('husband');

    // Nie porównujemy kto więcej - pokazujemy co każdy wnosi
    return {
      wife: {
        name: 'Żona',
        contributions: wifeContribs,
        topContribution: this._getTopContribution(wifeContribs)
      },
      husband: {
        name: 'Mąż',
        contributions: husbandContribs,
        topContribution: this._getTopContribution(husbandContribs)
      },
      // Wspólny komunikat zamiast porównania
      message: this._getUnityMessage(wifeContribs, husbandContribs)
    };
  }

  _countContributions(owner) {
    const contribs = this.data[owner].contributions;
    const counts = {};

    Object.keys(FamilyUnityManager.CONTRIBUTION_TYPES).forEach(type => {
      counts[type] = contribs.filter(c => c.type === type).length;
    });

    return counts;
  }

  _getTopContribution(counts) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0) return null;
    return FamilyUnityManager.CONTRIBUTION_TYPES[sorted[0][0]];
  }

  _getUnityMessage(wife, husband) {
    const messages = [
      '💪 Świetna robota zespołowa!',
      '🤝 Uzupełniacie się doskonale!',
      '❤️ Razem jesteście silniejsi!',
      '🌟 Każdy wkład jest ważny!'
    ];

    // Sprawdź czy jest równowaga
    const wifeTotal = Object.values(wife).reduce((a, b) => a + b, 0);
    const husbandTotal = Object.values(husband).reduce((a, b) => a + b, 0);

    if (wifeTotal > 0 && husbandTotal > 0) {
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (wifeTotal === 0 && husbandTotal === 0) {
      return '👋 Zacznijcie razem śledzić finanse!';
    }

    return '🤗 Zachęć partnera do wspólnego śledzenia!';
  }

  // ==========================================
  // CELE ZESPOŁOWE
  // ==========================================

  /**
   * Sprawdź i oznacz ukończone cele zespołowe
   */
  checkTeamGoals() {
    const completed = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Weekly: Narada finansowa (weekend)
    if ([0, 6].includes(now.getDay())) {
      const goal = FamilyUnityManager.TEAM_GOALS.financial_review;
      if (this.data.family.lastReviewDate !== today) {
        // Oznacz jako potencjalnie do wykonania
        // (Wymaga potwierdzenia od użytkowników)
      }
    }

    // Monthly: Budżet success
    // (Sprawdzane na koniec miesiąca)

    return completed;
  }

  /**
   * Potwierdź wspólną aktywność
   */
  confirmTeamActivity(goalId) {
    const goal = FamilyUnityManager.TEAM_GOALS[goalId];
    if (!goal) return { success: false };

    const key = `${goalId}_${new Date().toISOString().split('T')[0]}`;
    if (this.data.family.goalsCompleted.includes(key)) {
      return { success: false, error: 'Już wykonane dziś' };
    }

    this.data.family.goalsCompleted.push(key);
    const result = this.addSharedPoints(goal.reward, goal.name);
    this._save();

    return {
      success: true,
      goal,
      pointsEarned: result.pointsAdded
    };
  }

  // ==========================================
  // NAGRODY
  // ==========================================

  /**
   * Kup nagrodę rodzinną (ze wspólnych punktów)
   */
  purchaseFamilyReward(rewardId) {
    const reward = FamilyUnityManager.FAMILY_REWARDS[rewardId];
    if (!reward) return { success: false, error: 'Nieznana nagroda' };

    const spendResult = this.spendSharedPoints(reward.cost);
    if (!spendResult.success) return spendResult;

    this.data.family.rewardsEarned.push({
      rewardId,
      purchasedAt: new Date().toISOString(),
      redeemed: false
    });

    this._save();

    return {
      success: true,
      reward,
      remainingPoints: spendResult.remaining
    };
  }

  /**
   * Pobierz dostępne nagrody
   */
  getAvailableRewards() {
    const points = this.data.family.sharedPoints;

    const familyRewards = Object.values(FamilyUnityManager.FAMILY_REWARDS)
      .filter(r => r.type === 'family')
      .map(r => ({
        ...r,
        canAfford: points >= r.cost
      }));

    const personalRewards = Object.values(FamilyUnityManager.FAMILY_REWARDS)
      .filter(r => r.type === 'personal')
      .map(r => ({
        ...r,
        canAfford: points >= r.cost
      }));

    return {
      sharedPoints: points,
      family: familyRewards.sort((a, b) => a.cost - b.cost),
      personal: personalRewards.sort((a, b) => a.cost - b.cost)
    };
  }

  // ==========================================
  // PRZYZNAWANIE RÓL
  // ==========================================

  /**
   * Przyznaj rolę (auto lub ręcznie)
   */
  assignRole(owner, roleId) {
    const role = FamilyUnityManager.ROLES[roleId];
    if (!role) return false;

    if (!this.data[owner].roles.includes(roleId)) {
      this.data[owner].roles.push(roleId);
      this._save();
    }

    return true;
  }

  /**
   * Auto-przyznaj role na podstawie aktywności
   */
  autoAssignRoles() {
    // Główny żywiciel
    const wifeSources = this.dm.getIncomeSources().filter(s => s.owner === 'wife');
    const husbandSources = this.dm.getIncomeSources().filter(s => s.owner === 'husband');

    const wifeIncome = wifeSources.reduce((s, src) => s + (src.expectedAmount || 0), 0);
    const husbandIncome = husbandSources.reduce((s, src) => s + (src.expectedAmount || 0), 0);

    if (wifeIncome > husbandIncome * 1.5) {
      this.assignRole('wife', 'breadwinner');
    } else if (husbandIncome > wifeIncome * 1.5) {
      this.assignRole('husband', 'breadwinner');
    }

    // Strażnik budżetu (kto dodaje więcej wydatków)
    const wifeExpenses = this.data.wife.contributions.filter(c => c.type === 'tracking').length;
    const husbandExpenses = this.data.husband.contributions.filter(c => c.type === 'tracking').length;

    if (wifeExpenses > husbandExpenses * 2) {
      this.assignRole('wife', 'budget_guardian');
      this.assignRole('wife', 'tracker');
    } else if (husbandExpenses > wifeExpenses * 2) {
      this.assignRole('husband', 'budget_guardian');
      this.assignRole('husband', 'tracker');
    }

    this._save();
  }

  /**
   * Pobierz role użytkownika
   */
  getRoles(owner) {
    return this.data[owner].roles.map(id => FamilyUnityManager.ROLES[id]);
  }

  // ==========================================
  // DASHBOARD - Widok jednoczący
  // ==========================================

  /**
   * Pobierz dane do dashboardu "Nasza Rodzina"
   */
  getFamilyDashboard() {
    const status = this.getFamilyStatus();
    const contributions = this.getContributionsSummary();
    const rewards = this.getAvailableRewards();

    return {
      // Główna sekcja - RAZEM
      header: {
        title: 'Nasza Rodzina',
        level: status,
        sharedPoints: this.data.family.sharedPoints,
        message: contributions.message
      },

      // Wkłady (bez porównywania!)
      team: {
        wife: {
          roles: this.getRoles('wife'),
          topStrength: contributions.wife.topContribution
        },
        husband: {
          roles: this.getRoles('husband'),
          topStrength: contributions.husband.topContribution
        }
      },

      // Nagrody
      rewards: {
        familyRewardsCount: rewards.family.filter(r => r.canAfford).length,
        nextFamilyReward: rewards.family.find(r => !r.canAfford),
        pointsToNext: rewards.family.find(r => !r.canAfford)
          ? rewards.family.find(r => !r.canAfford).cost - this.data.family.sharedPoints
          : 0
      },

      // Cele zespołowe
      goals: this._getActiveTeamGoals()
    };
  }

  _getActiveTeamGoals() {
    const today = new Date().toISOString().split('T')[0];

    return Object.values(FamilyUnityManager.TEAM_GOALS).map(goal => ({
      ...goal,
      completed: this.data.family.goalsCompleted.includes(`${goal.id}_${today}`)
    }));
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FamilyUnityManager;
}
