/**
 * Engagement Manager - System codziennego zaangażowania
 * Login streak, daily challenges, bonusy, kooperacja
 */
class EngagementManager {
  static STORAGE_KEY = 'familygoals_engagement';

  // === KONFIGURACJA STREAK ===
  static STREAK_CONFIG = {
    // Bazowe punkty za dzień
    baseDaily: 5,

    // Mnożniki za długość streak
    multipliers: {
      3: 1.2,    // 3+ dni = 20% więcej
      7: 1.5,    // 7+ dni = 50% więcej
      14: 2.0,   // 14+ dni = 2x
      30: 2.5,   // 30+ dni = 2.5x
      60: 3.0,   // 60+ dni = 3x
      90: 4.0,   // 90+ dni = 4x
      180: 5.0,  // 180+ dni = 5x
      365: 10.0  // 365 dni = 10x!
    },

    // Kamienie milowe z nagrodami
    milestones: {
      7: { bonus: 50, reward: 'week_warrior', name: '🔥 Tydzień w ogniu!' },
      14: { bonus: 100, reward: 'two_weeks', name: '💪 Dwa tygodnie!' },
      30: { bonus: 200, reward: 'month_master', name: '🌟 Miesiąc mistrza!' },
      60: { bonus: 400, reward: 'two_months', name: '💎 Dwa miesiące!' },
      90: { bonus: 600, reward: 'quarter_hero', name: '🏆 Kwartał heroiczny!' },
      180: { bonus: 1000, reward: 'half_year', name: '👑 Pół roku!' },
      365: { bonus: 2500, reward: 'year_legend', name: '🎖️ LEGENDA ROKU!' }
    },

    // Koszt zamrożenia streak (w punktach)
    freezeCost: {
      1: 50,     // 1 dzień = 50 pkt
      2: 100,    // 2 dni = 100 pkt
      3: 200     // 3 dni = 200 pkt (max)
    },

    // Grace period (godziny po północy)
    gracePeriodHours: 4
  };

  // === DAILY CHALLENGES ===
  static DAILY_CHALLENGES = [
    // ŁATWE (codzienne)
    {
      id: 'log_expense',
      name: 'Zapisz wydatek',
      description: 'Dodaj co najmniej 1 wydatek dziś',
      points: 10,
      difficulty: 'easy',
      check: (dm) => dm.getExpenses().some(e =>
        new Date(e.date).toDateString() === new Date().toDateString()
      )
    },
    {
      id: 'check_budget',
      name: 'Sprawdź budżet',
      description: 'Przejrzyj stan budżetu',
      points: 5,
      difficulty: 'easy',
      check: () => true // Automatyczne przy wejściu na dashboard
    },
    {
      id: 'review_goals',
      name: 'Przejrzyj cele',
      description: 'Sprawdź postęp swoich celów',
      points: 5,
      difficulty: 'easy',
      check: () => true
    },

    // ŚREDNIE (kilka razy w tygodniu)
    {
      id: 'under_daily_limit',
      name: 'Oszczędny dzień',
      description: 'Wydaj dziś mniej niż 100 zł',
      points: 20,
      difficulty: 'medium',
      check: (dm) => {
        const today = new Date().toDateString();
        const todayExpenses = dm.getExpenses()
          .filter(e => new Date(e.date).toDateString() === today);
        return todayExpenses.reduce((s, e) => s + e.amount, 0) < 100;
      }
    },
    {
      id: 'no_spending',
      name: 'Dzień bez wydatków',
      description: 'Nie wydaj dziś ani złotówki',
      points: 30,
      difficulty: 'medium',
      check: (dm) => {
        const today = new Date().toDateString();
        return !dm.getExpenses().some(e =>
          new Date(e.date).toDateString() === today
        );
      }
    },
    {
      id: 'detailed_expense',
      name: 'Dokładny zapis',
      description: 'Dodaj wydatek z opisem i kategorią',
      points: 15,
      difficulty: 'medium',
      check: (dm) => {
        const today = new Date().toDateString();
        return dm.getExpenses().some(e =>
          new Date(e.date).toDateString() === today &&
          e.description && e.description.length > 3
        );
      }
    },

    // TRUDNE (tygodniowe/specjalne)
    {
      id: 'perfect_week',
      name: 'Perfekcyjny tydzień',
      description: 'Nie przekrocz żadnego budżetu przez tydzień',
      points: 100,
      difficulty: 'hard',
      weekly: true
    },
    {
      id: 'savings_boost',
      name: 'Boost oszczędności',
      description: 'Wpłać na cel finansowy',
      points: 50,
      difficulty: 'hard',
      check: (dm) => {
        // Sprawdź czy dzisiaj była wpłata na cel
        const today = new Date().toISOString().split('T')[0];
        const goals = dm.getPlannedExpenses();
        return goals.some(goal =>
          goal.payments && goal.payments.some(p =>
            p.date && p.date.startsWith(today)
          )
        );
      }
    },

    // KOOPERACYJNE (wymagają obojga)
    {
      id: 'couple_sync',
      name: 'Synchronizacja',
      description: 'Oboje dodajcie wydatek tego samego dnia',
      points: 40,
      difficulty: 'coop',
      cooperative: true
    },
    {
      id: 'budget_review',
      name: 'Narada budżetowa',
      description: 'Oboje przejrzyjcie budżet w weekend',
      points: 60,
      difficulty: 'coop',
      cooperative: true,
      weekendOnly: true
    },
    {
      id: 'shared_goal_contribution',
      name: 'Wspólny wkład',
      description: 'Oboje wpłaćcie na wspólny cel',
      points: 80,
      difficulty: 'coop',
      cooperative: true
    }
  ];

  // === TYGODNIOWE WYZWANIA ===
  static WEEKLY_CHALLENGES = [
    {
      id: 'weekly_under_budget',
      name: 'Tydzień w budżecie',
      description: 'Nie przekrocz żadnego budżetu',
      points: 150,
      check: () => true // Sprawdzane na koniec tygodnia
    },
    {
      id: 'weekly_7_days',
      name: '7 dni śledzenia',
      description: 'Loguj się 7 dni z rzędu',
      points: 100
    },
    {
      id: 'weekly_savings',
      name: 'Tygodniowe oszczędności',
      description: 'Zaoszczędź co najmniej 25% tygodniowego przychodu',
      points: 200
    },
    {
      id: 'weekly_couple',
      name: 'Tydzień współpracy',
      description: 'Oboje logujcie się codziennie przez tydzień',
      points: 300,
      cooperative: true
    }
  ];

  constructor(dataManager, gamificationManager) {
    this.dm = dataManager;
    this.gm = gamificationManager;
    this.data = this._loadData();
  }

  _loadData() {
    const stored = localStorage.getItem(EngagementManager.STORAGE_KEY);
    const defaultData = {
      wife: this._createUserData(),
      husband: this._createUserData(),
      couple: {
        sharedStreak: 0,
        lastBothLogin: null,
        coopChallengesCompleted: []
      }
    };
    if (!stored) return defaultData;
    try {
      return { ...defaultData, ...JSON.parse(stored) };
    } catch (e) {
      console.error('[EngagementManager] JSON parse error:', e);
      return defaultData;
    }
  }

  _createUserData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
      totalLogins: 0,
      freezesAvailable: 1,
      freezesUsed: [],
      dailyChallenges: [],
      weeklyChallenges: [],
      streakMilestones: [],
      bonusPointsEarned: 0
    };
  }

  static MAX_HISTORY_ITEMS = 100; // Limit array growth

  _save() {
    // Cleanup unbounded arrays before saving
    ['wife', 'husband'].forEach(owner => {
      const user = this.data[owner];
      if (user) {
        if (user.freezesUsed && user.freezesUsed.length > EngagementManager.MAX_HISTORY_ITEMS) {
          user.freezesUsed = user.freezesUsed.slice(-EngagementManager.MAX_HISTORY_ITEMS);
        }
        if (user.dailyChallenges && user.dailyChallenges.length > EngagementManager.MAX_HISTORY_ITEMS) {
          user.dailyChallenges = user.dailyChallenges.slice(-EngagementManager.MAX_HISTORY_ITEMS);
        }
        if (user.weeklyChallenges && user.weeklyChallenges.length > EngagementManager.MAX_HISTORY_ITEMS) {
          user.weeklyChallenges = user.weeklyChallenges.slice(-EngagementManager.MAX_HISTORY_ITEMS);
        }
      }
    });
    localStorage.setItem(EngagementManager.STORAGE_KEY, JSON.stringify(this.data));
  }

  // ==========================================
  // LOGIN STREAK
  // ==========================================

  /**
   * Rejestruj login użytkownika
   * Zwraca obiekt z informacjami o streak i bonusach
   */
  recordLogin(owner = 'wife') {
    const user = this.data[owner];
    const now = new Date();
    const today = this._getDateString(now);
    const yesterday = this._getDateString(new Date(now - 86400000));

    const result = {
      streakContinued: false,
      streakBroken: false,
      newStreak: 0,
      bonusPoints: 0,
      multiplier: 1,
      milestone: null,
      dailyChallenges: [],
      message: ''
    };

    // Już zalogowany dziś
    if (user.lastLoginDate === today) {
      result.message = 'Już jesteś zalogowany dziś!';
      result.newStreak = user.currentStreak;
      return result;
    }

    // Sprawdź czy kontynuacja streak
    const wasYesterday = user.lastLoginDate === yesterday;
    const wasToday = user.lastLoginDate === today;
    const gracePeriod = this._isInGracePeriod(user.lastLoginDate);

    if (wasYesterday || gracePeriod) {
      // Kontynuacja streak!
      user.currentStreak++;
      result.streakContinued = true;
      result.message = `🔥 Streak: ${user.currentStreak} dni!`;
    } else if (user.lastLoginDate && !wasToday) {
      // Streak przerwany - sprawdź freeze
      const daysMissed = this._daysBetween(user.lastLoginDate, today);

      if (daysMissed <= 3 && user.freezesAvailable > 0) {
        // Można użyć freeze
        result.canUseFreeze = true;
        result.daysMissed = daysMissed;
        result.freezeCost = EngagementManager.STREAK_CONFIG.freezeCost[daysMissed];
        result.oldStreak = user.currentStreak;
        result.message = `⚠️ Przegapiłeś ${daysMissed} dni! Użyj Freeze żeby zachować streak (${result.freezeCost} pkt)`;
      } else {
        // Streak przerwany
        result.streakBroken = true;
        result.oldStreak = user.currentStreak;
        user.currentStreak = 1;
        result.message = `💔 Streak przerwany (było: ${result.oldStreak} dni). Zaczyasz od nowa!`;
      }
    } else {
      // Pierwszy login lub reset
      user.currentStreak = 1;
      result.message = '👋 Witaj! Zaczynasz nowy streak!';
    }

    // Oblicz bonus punktowy
    result.multiplier = this._getMultiplier(user.currentStreak);
    result.bonusPoints = Math.round(
      EngagementManager.STREAK_CONFIG.baseDaily * result.multiplier
    );

    // Sprawdź kamień milowy
    const milestone = EngagementManager.STREAK_CONFIG.milestones[user.currentStreak];
    if (milestone && !user.streakMilestones.includes(user.currentStreak)) {
      result.milestone = milestone;
      result.bonusPoints += milestone.bonus;
      user.streakMilestones.push(user.currentStreak);
      result.message = milestone.name;
    }

    // Aktualizuj dane
    user.lastLoginDate = today;
    user.totalLogins++;
    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
    user.bonusPointsEarned += result.bonusPoints;
    result.newStreak = user.currentStreak;

    // Sprawdź streak parowy
    this._checkCoupleStreak(owner);

    // Pobierz dzisiejsze wyzwania
    result.dailyChallenges = this._getDailyChallenges();

    this._save();

    // Dodaj punkty do gamifikacji
    if (this.gm && result.bonusPoints > 0) {
      this.gm.unlockedAchievements[owner].points += result.bonusPoints;
      this.gm._save();
    }

    return result;
  }

  /**
   * Użyj freeze żeby zachować streak
   */
  useFreeze(owner = 'wife') {
    const user = this.data[owner];
    const now = new Date();
    const today = this._getDateString(now);
    const daysMissed = this._daysBetween(user.lastLoginDate, today);

    if (daysMissed > 3 || user.freezesAvailable <= 0) {
      return { success: false, error: 'Nie można użyć freeze' };
    }

    const cost = EngagementManager.STREAK_CONFIG.freezeCost[daysMissed];

    // Sprawdź czy GamificationManager jest dostępny
    if (!this.gm || !this.gm.unlockedAchievements || !this.gm.unlockedAchievements[owner]) {
      return { success: false, error: 'System punktów niedostępny' };
    }

    // Sprawdź czy stać
    if (this.gm.unlockedAchievements[owner].points < cost) {
      return { success: false, error: `Za mało punktów (potrzeba: ${cost})` };
    }

    // Użyj freeze
    this.gm.unlockedAchievements[owner].points -= cost;
    user.freezesAvailable--;
    user.freezesUsed.push({
      date: today,
      daysFrozen: daysMissed,
      cost
    });

    // Przywróć streak (bez inkrementacji)
    user.lastLoginDate = today;

    this._save();
    this.gm._save();

    return {
      success: true,
      streakSaved: user.currentStreak,
      pointsSpent: cost,
      freezesLeft: user.freezesAvailable
    };
  }

  /**
   * Kup dodatkowy freeze
   */
  buyFreeze(owner = 'wife') {
    const cost = 200; // Stała cena
    const user = this.data[owner];

    // Sprawdź czy GamificationManager jest dostępny
    if (!this.gm || !this.gm.unlockedAchievements || !this.gm.unlockedAchievements[owner]) {
      return { success: false, error: 'System punktów niedostępny' };
    }

    if (this.gm.unlockedAchievements[owner].points < cost) {
      return { success: false, error: 'Za mało punktów' };
    }

    if (user.freezesAvailable >= 3) {
      return { success: false, error: 'Max 3 freeze na raz' };
    }

    this.gm.unlockedAchievements[owner].points -= cost;
    user.freezesAvailable++;

    this._save();
    this.gm._save();

    return {
      success: true,
      freezesAvailable: user.freezesAvailable,
      pointsSpent: cost
    };
  }

  // ==========================================
  // DAILY CHALLENGES
  // ==========================================

  /**
   * Pobierz dzisiejsze wyzwania (3 losowe + 1 kooperacyjne)
   */
  _getDailyChallenges() {
    const today = this._getDateString(new Date());
    const seed = this._hashString(today);

    // Losuj 2 łatwe, 1 średnie
    const easy = this._shuffleWithSeed(
      EngagementManager.DAILY_CHALLENGES.filter(c => c.difficulty === 'easy'),
      seed
    ).slice(0, 2);

    const medium = this._shuffleWithSeed(
      EngagementManager.DAILY_CHALLENGES.filter(c => c.difficulty === 'medium'),
      seed + 1
    ).slice(0, 1);

    // Dodaj 1 kooperacyjne w weekend
    const isWeekend = [0, 6].includes(new Date().getDay());
    const coop = isWeekend
      ? this._shuffleWithSeed(
          EngagementManager.DAILY_CHALLENGES.filter(c => c.cooperative),
          seed + 2
        ).slice(0, 1)
      : [];

    return [...easy, ...medium, ...coop];
  }

  /**
   * Sprawdź i oznacz ukończone wyzwania
   */
  checkDailyChallenges(owner = 'wife') {
    const challenges = this._getDailyChallenges();
    const completed = [];

    challenges.forEach(challenge => {
      if (challenge.check && challenge.check(this.dm)) {
        const key = `${this._getDateString(new Date())}_${challenge.id}`;

        if (!this.data[owner].dailyChallenges.includes(key)) {
          this.data[owner].dailyChallenges.push(key);
          completed.push(challenge);

          // Dodaj punkty
          if (this.gm) {
            this.gm.unlockedAchievements[owner].points += challenge.points;
          }
        }
      }
    });

    if (completed.length > 0) {
      this._save();
      if (this.gm) this.gm._save();
    }

    return completed;
  }

  /**
   * Pobierz status wyzwań
   */
  getDailyChallengesStatus(owner = 'wife') {
    const challenges = this._getDailyChallenges();
    const today = this._getDateString(new Date());

    return challenges.map(c => ({
      ...c,
      completed: this.data[owner].dailyChallenges.includes(`${today}_${c.id}`)
    }));
  }

  // ==========================================
  // COUPLE / KOOPERACJA
  // ==========================================

  _checkCoupleStreak(currentOwner) {
    const today = this._getDateString(new Date());
    const other = currentOwner === 'wife' ? 'husband' : 'wife';

    // Czy oboje zalogowani dziś?
    if (this.data.wife.lastLoginDate === today &&
        this.data.husband.lastLoginDate === today) {

      if (this.data.couple.lastBothLogin !== today) {
        this.data.couple.sharedStreak++;
        this.data.couple.lastBothLogin = today;

        // Bonus za wspólny streak (D-M4: guard jak w recordLogin — gm może
        // być null, streak liczy się dalej, tylko punkty pomijamy)
        const bonus = Math.round(10 * this._getMultiplier(this.data.couple.sharedStreak));
        if (this.gm && this.gm.unlockedAchievements) {
          this.gm.unlockedAchievements.wife.points += bonus;
          this.gm.unlockedAchievements.husband.points += bonus;
        }

        return {
          coupleStreak: this.data.couple.sharedStreak,
          bonusEach: bonus
        };
      }
    }

    return null;
  }

  /**
   * Pobierz statystyki kooperacji
   */
  getCoupleStats() {
    return {
      sharedStreak: this.data.couple.sharedStreak,
      wifeStreak: this.data.wife.currentStreak,
      husbandStreak: this.data.husband.currentStreak,
      bothLoggedToday: this._bothLoggedToday(),
      coopChallengesCompleted: this.data.couple.coopChallengesCompleted.length
    };
  }

  _bothLoggedToday() {
    const today = this._getDateString(new Date());
    return this.data.wife.lastLoginDate === today &&
           this.data.husband.lastLoginDate === today;
  }

  // ==========================================
  // STATYSTYKI
  // ==========================================

  getStreakStats(owner = 'wife') {
    const user = this.data[owner];
    const multiplier = this._getMultiplier(user.currentStreak);
    const nextMilestone = this._getNextMilestone(user.currentStreak);

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalLogins: user.totalLogins,
      currentMultiplier: multiplier,
      dailyBonus: Math.round(EngagementManager.STREAK_CONFIG.baseDaily * multiplier),
      freezesAvailable: user.freezesAvailable,
      nextMilestone,
      daysToNextMilestone: nextMilestone ? nextMilestone.days - user.currentStreak : null,
      bonusPointsEarned: user.bonusPointsEarned,
      streakMilestones: user.streakMilestones
    };
  }

  _getMultiplier(streak) {
    const multipliers = EngagementManager.STREAK_CONFIG.multipliers;
    let mult = 1;
    for (const [days, m] of Object.entries(multipliers)) {
      if (streak >= parseInt(days)) mult = m;
    }
    return mult;
  }

  _getNextMilestone(streak) {
    const milestones = EngagementManager.STREAK_CONFIG.milestones;
    for (const [days, data] of Object.entries(milestones)) {
      if (streak < parseInt(days)) {
        return { days: parseInt(days), ...data };
      }
    }
    return null;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  _getDateString(date) {
    // Use shared utility if available
    return window.FGUtils?.getDateString?.(date) || date.toISOString().split('T')[0];
  }

  _daysBetween(date1Str, date2Str) {
    // Use shared utility if available
    if (window.FGUtils?.daysBetween) {
      return FGUtils.daysBetween(date1Str, date2Str);
    }
    if (!date1Str || !date2Str) return 0;
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    return Math.floor((d2 - d1) / 86400000);
  }

  _isInGracePeriod(lastLoginDate) {
    if (!lastLoginDate) return false;
    const now = new Date();
    const hours = now.getHours();
    const yesterday = this._getDateString(new Date(now - 86400000));

    return hours < EngagementManager.STREAK_CONFIG.gracePeriodHours &&
           lastLoginDate === yesterday;
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  _shuffleWithSeed(array, seed) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// === NOWE OSIĄGNIĘCIA DLA STREAK ===
const STREAK_ACHIEVEMENTS = {
  // Login streak
  login_streak_7: {
    id: 'login_streak_7',
    name: 'Tydzień w ogniu',
    description: 'Zaloguj się 7 dni z rzędu',
    icon: '🔥',
    category: 'streak',
    points: 50
  },
  login_streak_14: {
    id: 'login_streak_14',
    name: 'Dwa tygodnie',
    description: 'Zaloguj się 14 dni z rzędu',
    icon: '🔥',
    category: 'streak',
    points: 100
  },
  login_streak_30: {
    id: 'login_streak_30',
    name: 'Miesiąc mistrza',
    description: 'Zaloguj się 30 dni z rzędu',
    icon: '💎',
    category: 'streak',
    points: 200
  },
  login_streak_60: {
    id: 'login_streak_60',
    name: 'Dwa miesiące',
    description: 'Zaloguj się 60 dni z rzędu',
    icon: '💎',
    category: 'streak',
    points: 400
  },
  login_streak_90: {
    id: 'login_streak_90',
    name: 'Kwartał',
    description: 'Zaloguj się 90 dni z rzędu',
    icon: '👑',
    category: 'streak',
    points: 600
  },
  login_streak_180: {
    id: 'login_streak_180',
    name: 'Pół roku',
    description: 'Zaloguj się 180 dni z rzędu',
    icon: '👑',
    category: 'streak',
    points: 1000
  },
  login_streak_365: {
    id: 'login_streak_365',
    name: 'Legenda roku',
    description: 'Zaloguj się 365 dni z rzędu',
    icon: '🏆',
    category: 'streak',
    points: 3000,
    legendary: true
  },

  // Freeze achievements
  freeze_used: {
    id: 'freeze_used',
    name: 'Ratunek',
    description: 'Użyj freeze żeby ocalić streak',
    icon: '🧊',
    category: 'streak',
    points: 10
  },
  freeze_hoarder: {
    id: 'freeze_hoarder',
    name: 'Zapasowy',
    description: 'Miej 3 freeze na raz',
    icon: '❄️',
    category: 'streak',
    points: 30
  },

  // Couple streak
  couple_streak_7: {
    id: 'couple_streak_7',
    name: 'Tydzień razem',
    description: 'Oboje logujcie się 7 dni z rzędu',
    icon: '💑',
    category: 'couple',
    points: 100
  },
  couple_streak_30: {
    id: 'couple_streak_30',
    name: 'Miesiąc razem',
    description: 'Oboje logujcie się 30 dni z rzędu',
    icon: '💕',
    category: 'couple',
    points: 400
  },
  couple_streak_90: {
    id: 'couple_streak_90',
    name: 'Kwartał razem',
    description: 'Oboje logujcie się 90 dni z rzędu',
    icon: '❤️',
    category: 'couple',
    points: 1000
  },

  // Daily challenges
  daily_champion: {
    id: 'daily_champion',
    name: 'Dzienny mistrz',
    description: 'Ukończ wszystkie wyzwania dnia',
    icon: '⭐',
    category: 'streak',
    points: 50
  },
  weekly_challenger: {
    id: 'weekly_challenger',
    name: 'Tygodniowy wojownik',
    description: 'Ukończ wyzwanie tygodniowe',
    icon: '🏅',
    category: 'streak',
    points: 100
  },
  challenge_addict: {
    id: 'challenge_addict',
    name: 'Uzależniony od wyzwań',
    description: 'Ukończ 100 wyzwań dziennych',
    icon: '🎯',
    category: 'streak',
    points: 300
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EngagementManager, STREAK_ACHIEVEMENTS };
}
