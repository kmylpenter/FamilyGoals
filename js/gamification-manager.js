/**
 * Gamification Manager - System osiągnięć i motywacji
 * 100+ osiągnięć dla żony i męża
 */
class GamificationManager {
  static STORAGE_KEY = 'familygoals_achievements';

  // === DEFINICJE OSIĄGNIĘĆ (100+) ===
  static ACHIEVEMENTS = {
    // ==========================================
    // 🌟 PIERWSZE KROKI (10)
    // ==========================================
    first_expense: {
      id: 'first_expense',
      name: 'Pierwszy krok',
      description: 'Dodaj pierwszy wydatek',
      icon: '👣',
      category: 'start',
      points: 10,
      secret: false
    },
    first_income: {
      id: 'first_income',
      name: 'Pierwszy zarobek',
      description: 'Dodaj pierwszy przychód',
      icon: '💵',
      category: 'start',
      points: 10
    },
    first_goal: {
      id: 'first_goal',
      name: 'Marzyciel',
      description: 'Ustaw pierwszy cel finansowy',
      icon: '🎯',
      category: 'start',
      points: 15
    },
    first_budget: {
      id: 'first_budget',
      name: 'Planista',
      description: 'Ustaw budżet dla kategorii',
      icon: '📋',
      category: 'start',
      points: 10
    },
    week_user: {
      id: 'week_user',
      name: 'Tydzień z nami',
      description: 'Używaj aplikacji przez 7 dni',
      icon: '📅',
      category: 'start',
      points: 20
    },
    month_user: {
      id: 'month_user',
      name: 'Miesiąc z nami',
      description: 'Używaj aplikacji przez 30 dni',
      icon: '🗓️',
      category: 'start',
      points: 50
    },
    setup_sources: {
      id: 'setup_sources',
      name: 'Źródła dochodu',
      description: 'Skonfiguruj wszystkie źródła przychodów',
      icon: '💼',
      category: 'start',
      points: 25
    },
    profile_complete: {
      id: 'profile_complete',
      name: 'Pełny profil',
      description: 'Uzupełnij wszystkie ustawienia',
      icon: '✅',
      category: 'start',
      points: 20
    },
    first_category: {
      id: 'first_category',
      name: 'Organizator',
      description: 'Dodaj własną kategorię wydatków',
      icon: '📁',
      category: 'start',
      points: 10
    },
    app_explorer: {
      id: 'app_explorer',
      name: 'Odkrywca',
      description: 'Odwiedź wszystkie ekrany aplikacji',
      icon: '🧭',
      category: 'start',
      points: 15
    },

    // ==========================================
    // 💰 OSZCZĘDNOŚCI (20)
    // ==========================================
    save_100: {
      id: 'save_100',
      name: 'Pierwsza setka',
      description: 'Zaoszczędź 100 zł w miesiącu',
      icon: '💰',
      category: 'savings',
      points: 20
    },
    save_500: {
      id: 'save_500',
      name: 'Pięć stówek',
      description: 'Zaoszczędź 500 zł w miesiącu',
      icon: '💰',
      category: 'savings',
      points: 30
    },
    save_1000: {
      id: 'save_1000',
      name: 'Tysiącznik',
      description: 'Zaoszczędź 1000 zł w miesiącu',
      icon: '💎',
      category: 'savings',
      points: 50
    },
    save_2000: {
      id: 'save_2000',
      name: 'Dwutysięcznik',
      description: 'Zaoszczędź 2000 zł w miesiącu',
      icon: '💎',
      category: 'savings',
      points: 75
    },
    save_5000: {
      id: 'save_5000',
      name: 'Pięć tysięcy',
      description: 'Zaoszczędź 5000 zł w miesiącu',
      icon: '👑',
      category: 'savings',
      points: 150
    },
    save_10000: {
      id: 'save_10000',
      name: 'Dziesięć tysięcy',
      description: 'Zaoszczędź 10000 zł w miesiącu',
      icon: '👑',
      category: 'savings',
      points: 300
    },
    savings_streak_3: {
      id: 'savings_streak_3',
      name: 'Trzy w rzędzie',
      description: 'Osiągnij cel oszczędności 3 miesiące z rzędu',
      icon: '🔥',
      category: 'savings',
      points: 60
    },
    savings_streak_6: {
      id: 'savings_streak_6',
      name: 'Pół roku sukcesu',
      description: 'Osiągnij cel oszczędności 6 miesięcy z rzędu',
      icon: '🔥',
      category: 'savings',
      points: 150
    },
    savings_streak_12: {
      id: 'savings_streak_12',
      name: 'Rok oszczędzania',
      description: 'Osiągnij cel oszczędności 12 miesięcy z rzędu',
      icon: '🏆',
      category: 'savings',
      points: 500
    },
    over_target: {
      id: 'over_target',
      name: 'Ponad cel',
      description: 'Zaoszczędź 120% celu miesięcznego',
      icon: '🚀',
      category: 'savings',
      points: 40
    },
    double_target: {
      id: 'double_target',
      name: 'Podwójny cel',
      description: 'Zaoszczędź 200% celu miesięcznego',
      icon: '🚀',
      category: 'savings',
      points: 100
    },
    emergency_fund_25: {
      id: 'emergency_fund_25',
      name: 'Fundusz awaryjny 25%',
      description: 'Zbierz 25% funduszu awaryjnego',
      icon: '🛡️',
      category: 'savings',
      points: 50
    },
    emergency_fund_50: {
      id: 'emergency_fund_50',
      name: 'Fundusz awaryjny 50%',
      description: 'Zbierz 50% funduszu awaryjnego',
      icon: '🛡️',
      category: 'savings',
      points: 100
    },
    emergency_fund_100: {
      id: 'emergency_fund_100',
      name: 'Pełne bezpieczeństwo',
      description: 'Zbierz 100% funduszu awaryjnego',
      icon: '🏰',
      category: 'savings',
      points: 250
    },
    total_saved_10k: {
      id: 'total_saved_10k',
      name: '10k łącznie',
      description: 'Zaoszczędź łącznie 10 000 zł',
      icon: '💎',
      category: 'savings',
      points: 200
    },
    total_saved_50k: {
      id: 'total_saved_50k',
      name: '50k łącznie',
      description: 'Zaoszczędź łącznie 50 000 zł',
      icon: '💎',
      category: 'savings',
      points: 500
    },
    total_saved_100k: {
      id: 'total_saved_100k',
      name: '100k łącznie',
      description: 'Zaoszczędź łącznie 100 000 zł',
      icon: '👑',
      category: 'savings',
      points: 1000
    },
    best_month_ever: {
      id: 'best_month_ever',
      name: 'Najlepszy miesiąc',
      description: 'Pobij swój rekord oszczędności',
      icon: '🏅',
      category: 'savings',
      points: 50
    },
    savings_rate_20: {
      id: 'savings_rate_20',
      name: '20% przychodów',
      description: 'Zaoszczędź 20% przychodów w miesiącu',
      icon: '📈',
      category: 'savings',
      points: 40
    },
    savings_rate_30: {
      id: 'savings_rate_30',
      name: '30% przychodów',
      description: 'Zaoszczędź 30% przychodów w miesiącu',
      icon: '📈',
      category: 'savings',
      points: 80
    },

    // ==========================================
    // 📈 SYSTEMATYCZNOŚĆ (15) - zastąpiło kontrolę wydatków
    // ==========================================
    regular_saver: {
      id: 'regular_saver',
      name: 'Regularny odkładacz',
      description: 'Odłóż pieniądze 3 miesiące z rzędu',
      icon: '✨',
      category: 'consistency',
      points: 30
    },
    discipline_master: {
      id: 'discipline_master',
      name: 'Mistrz dyscypliny',
      description: 'Osiągnij cel oszczędności przez 6 miesięcy',
      icon: '🎖️',
      category: 'consistency',
      points: 100
    },
    income_growth_10: {
      id: 'income_growth_10',
      name: 'Wzrost 10%',
      description: 'Zwiększ przychody o 10% vs poprzedni miesiąc',
      icon: '📈',
      category: 'consistency',
      points: 40
    },
    income_growth_20: {
      id: 'income_growth_20',
      name: 'Wzrost 20%',
      description: 'Zwiększ przychody o 20% vs poprzedni miesiąc',
      icon: '📈',
      category: 'consistency',
      points: 80
    },
    on_time_3: {
      id: 'on_time_3',
      name: 'Punktualność',
      description: 'Otrzymaj wszystkie przychody na czas 3 miesiące',
      icon: '⏰',
      category: 'consistency',
      points: 35
    },
    full_income: {
      id: 'full_income',
      name: 'Pełna kwota',
      description: 'Otrzymaj 100% oczekiwanych przychodów w miesiącu',
      icon: '💯',
      category: 'consistency',
      points: 25
    },
    bonus_hunter: {
      id: 'bonus_hunter',
      name: 'Łowca bonusów',
      description: 'Otrzymaj dodatkowy przychód poza pensją',
      icon: '🎁',
      category: 'consistency',
      points: 30
    },
    double_income: {
      id: 'double_income',
      name: 'Podwójny dochód',
      description: 'Oboje otrzymajcie przychody w tym samym miesiącu',
      icon: '👫',
      category: 'consistency',
      points: 20
    },
    savings_habit: {
      id: 'savings_habit',
      name: 'Nawyk oszczędzania',
      description: 'Odłóż minimum 10% przychodów przez 3 miesiące',
      icon: '🐷',
      category: 'consistency',
      points: 50
    },
    goal_contributor: {
      id: 'goal_contributor',
      name: 'Wkład w cel',
      description: 'Wpłać na cel 5 razy',
      icon: '💪',
      category: 'consistency',
      points: 30
    },
    monthly_review: {
      id: 'monthly_review',
      name: 'Przegląd miesięczny',
      description: 'Sprawdź podsumowanie na koniec miesiąca',
      icon: '📊',
      category: 'consistency',
      points: 15
    },
    early_saver: {
      id: 'early_saver',
      name: 'Wczesny odkładacz',
      description: 'Odłóż pieniądze w pierwszym tygodniu miesiąca',
      icon: '🌅',
      category: 'consistency',
      points: 25
    },
    surplus_month: {
      id: 'surplus_month',
      name: 'Nadwyżka',
      description: 'Zakończ miesiąc z nadwyżką przychodów',
      icon: '🎉',
      category: 'consistency',
      points: 35
    },
    no_gap: {
      id: 'no_gap',
      name: 'Bez luki',
      description: 'Przychody pokryły wszystkie cele',
      icon: '✅',
      category: 'consistency',
      points: 45
    },
    year_planner: {
      id: 'year_planner',
      name: 'Planista roczny',
      description: 'Zaplanuj cele na cały rok',
      icon: '📅',
      category: 'consistency',
      points: 60
    },

    // ==========================================
    // 🎯 CELE FINANSOWE (15)
    // ==========================================
    goal_25: {
      id: 'goal_25',
      name: 'Ćwierć drogi',
      description: 'Osiągnij 25% dowolnego celu',
      icon: '🌱',
      category: 'goals',
      points: 25
    },
    goal_50: {
      id: 'goal_50',
      name: 'Półmetek',
      description: 'Osiągnij 50% dowolnego celu',
      icon: '🌿',
      category: 'goals',
      points: 50
    },
    goal_75: {
      id: 'goal_75',
      name: 'Prawie tam',
      description: 'Osiągnij 75% dowolnego celu',
      icon: '🌳',
      category: 'goals',
      points: 75
    },
    goal_complete: {
      id: 'goal_complete',
      name: 'Cel osiągnięty!',
      description: 'Osiągnij 100% dowolnego celu',
      icon: '🎉',
      category: 'goals',
      points: 150
    },
    goal_complete_3: {
      id: 'goal_complete_3',
      name: 'Trzech celów',
      description: 'Osiągnij 3 cele finansowe',
      icon: '🏆',
      category: 'goals',
      points: 300
    },
    goal_complete_5: {
      id: 'goal_complete_5',
      name: 'Pięć celów',
      description: 'Osiągnij 5 celów finansowych',
      icon: '👑',
      category: 'goals',
      points: 500
    },
    goal_ahead: {
      id: 'goal_ahead',
      name: 'Przed czasem',
      description: 'Osiągnij cel przed deadline',
      icon: '⚡',
      category: 'goals',
      points: 100
    },
    goal_streak: {
      id: 'goal_streak',
      name: 'Seria wpłat',
      description: 'Wpłacaj na cel 6 miesięcy z rzędu',
      icon: '🔥',
      category: 'goals',
      points: 80
    },
    big_goal: {
      id: 'big_goal',
      name: 'Wielki cel',
      description: 'Ustaw cel powyżej 50 000 zł',
      icon: '🏔️',
      category: 'goals',
      points: 30
    },
    huge_goal: {
      id: 'huge_goal',
      name: 'Ogromny cel',
      description: 'Ustaw cel powyżej 100 000 zł',
      icon: '🗻',
      category: 'goals',
      points: 50
    },
    goal_collector: {
      id: 'goal_collector',
      name: 'Kolekcjoner celów',
      description: 'Miej 5 aktywnych celów jednocześnie',
      icon: '🎯',
      category: 'goals',
      points: 40
    },
    quick_goal: {
      id: 'quick_goal',
      name: 'Szybki cel',
      description: 'Osiągnij cel w mniej niż 3 miesiące',
      icon: '🏃',
      category: 'goals',
      points: 60
    },
    long_goal: {
      id: 'long_goal',
      name: 'Cierpliwość',
      description: 'Pracuj nad celem ponad rok',
      icon: '🐢',
      category: 'goals',
      points: 100
    },
    goal_boost: {
      id: 'goal_boost',
      name: 'Przyspieszenie',
      description: 'Wpłać 150% planowanej kwoty miesięcznej',
      icon: '🚀',
      category: 'goals',
      points: 45
    },
    all_goals_progress: {
      id: 'all_goals_progress',
      name: 'Wszystko idzie',
      description: 'Wszystkie cele mają postęp w tym miesiącu',
      icon: '📊',
      category: 'goals',
      points: 35
    },

    // ==========================================
    // 💑 WSPÓŁPRACA MAŁŻEŃSKA (15)
    // ==========================================
    team_start: {
      id: 'team_start',
      name: 'Drużyna',
      description: 'Oboje dodajcie wydatek tego samego dnia',
      icon: '👫',
      category: 'couple',
      points: 20
    },
    team_week: {
      id: 'team_week',
      name: 'Tydzień razem',
      description: 'Oboje aktywni przez tydzień',
      icon: '💑',
      category: 'couple',
      points: 40
    },
    team_month: {
      id: 'team_month',
      name: 'Miesiąc razem',
      description: 'Oboje aktywni przez cały miesiąc',
      icon: '💕',
      category: 'couple',
      points: 100
    },
    equal_contribution: {
      id: 'equal_contribution',
      name: 'Równy wkład',
      description: 'Oboje dodali podobną liczbę wydatków (±10%)',
      icon: '⚖️',
      category: 'couple',
      points: 30
    },
    shared_goal: {
      id: 'shared_goal',
      name: 'Wspólny cel',
      description: 'Ustaw cel oznaczony jako wspólny',
      icon: '🎯',
      category: 'couple',
      points: 25
    },
    shared_goal_complete: {
      id: 'shared_goal_complete',
      name: 'Wspólny sukces',
      description: 'Osiągnij wspólny cel',
      icon: '🏆',
      category: 'couple',
      points: 200
    },
    family_meeting: {
      id: 'family_meeting',
      name: 'Narada rodzinna',
      description: 'Przeglądaj statystyki razem (weekend)',
      icon: '👨‍👩‍👧‍👦',
      category: 'couple',
      points: 30
    },
    sync_masters: {
      id: 'sync_masters',
      name: 'Synchronizacja',
      description: 'Oboje dodajcie wydatki w ciągu godziny',
      icon: '🔄',
      category: 'couple',
      points: 25
    },
    budget_agreement: {
      id: 'budget_agreement',
      name: 'Zgoda budżetowa',
      description: 'Nie zmieniano budżetów przez 3 miesiące',
      icon: '🤝',
      category: 'couple',
      points: 50
    },
    motivation_gift: {
      id: 'motivation_gift',
      name: 'Prezent motywacyjny',
      description: 'Odblokuj nagrodę dla partnera',
      icon: '🎁',
      category: 'couple',
      points: 40
    },
    dual_income: {
      id: 'dual_income',
      name: 'Podwójne źródło',
      description: 'Oboje macie aktywne źródła przychodu',
      icon: '💵',
      category: 'couple',
      points: 35
    },
    support_streak: {
      id: 'support_streak',
      name: 'Wzajemne wsparcie',
      description: 'Oboje osiągnijcie cele 3 miesiące z rzędu',
      icon: '❤️',
      category: 'couple',
      points: 150
    },
    anniversary_saver: {
      id: 'anniversary_saver',
      name: 'Rocznicowe oszczędności',
      description: 'Oszczędzaj na wspólny cel przez rok',
      icon: '💍',
      category: 'couple',
      points: 200
    },
    dream_team: {
      id: 'dream_team',
      name: 'Dream Team',
      description: 'Łącznie 1000 punktów jako para',
      icon: '🌟',
      category: 'couple',
      points: 100
    },
    power_couple: {
      id: 'power_couple',
      name: 'Power Couple',
      description: 'Łącznie 5000 punktów jako para',
      icon: '👑',
      category: 'couple',
      points: 500
    },

    // ==========================================
    // 🔥 STREAK I REGULARNOŚĆ (10)
    // ==========================================
    streak_3: {
      id: 'streak_3',
      name: '3 dni z rzędu',
      description: 'Dodaj wydatek 3 dni pod rząd',
      icon: '🔥',
      category: 'streak',
      points: 15
    },
    streak_7: {
      id: 'streak_7',
      name: 'Tydzień non-stop',
      description: 'Dodaj wydatek 7 dni pod rząd',
      icon: '🔥',
      category: 'streak',
      points: 35
    },
    streak_14: {
      id: 'streak_14',
      name: '2 tygodnie',
      description: 'Dodaj wydatek 14 dni pod rząd',
      icon: '🔥',
      category: 'streak',
      points: 70
    },
    streak_30: {
      id: 'streak_30',
      name: 'Miesiąc streak',
      description: 'Dodaj wydatek 30 dni pod rząd',
      icon: '💎',
      category: 'streak',
      points: 150
    },
    streak_60: {
      id: 'streak_60',
      name: '2 miesiące streak',
      description: 'Dodaj wydatek 60 dni pod rząd',
      icon: '💎',
      category: 'streak',
      points: 300
    },
    streak_90: {
      id: 'streak_90',
      name: '3 miesiące streak',
      description: 'Dodaj wydatek 90 dni pod rząd',
      icon: '👑',
      category: 'streak',
      points: 500
    },
    streak_365: {
      id: 'streak_365',
      name: 'Rok streak!',
      description: 'Dodaj wydatek 365 dni pod rząd',
      icon: '🏆',
      category: 'streak',
      points: 2000,
      legendary: true
    },
    comeback: {
      id: 'comeback',
      name: 'Powrót',
      description: 'Wróć po tygodniu przerwy',
      icon: '🔄',
      category: 'streak',
      points: 20
    },
    consistency: {
      id: 'consistency',
      name: 'Konsekwencja',
      description: 'Dodawaj wydatki co najmniej 20 dni w miesiącu',
      icon: '📊',
      category: 'streak',
      points: 40
    },
    perfect_month: {
      id: 'perfect_month',
      name: 'Perfekcyjny miesiąc',
      description: 'Dodawaj wydatki każdego dnia miesiąca',
      icon: '⭐',
      category: 'streak',
      points: 100
    },

    // ==========================================
    // 💵 PRZYCHODY (10)
    // ==========================================
    all_sources_paid: {
      id: 'all_sources_paid',
      name: 'Wszystko wpłynęło',
      description: 'Wszystkie źródła przychodów oznaczone',
      icon: '✅',
      category: 'income',
      points: 30
    },
    income_up_10: {
      id: 'income_up_10',
      name: 'Wzrost 10%',
      description: 'Zwiększ przychody o 10% vs poprzedni miesiąc',
      icon: '📈',
      category: 'income',
      points: 50
    },
    income_up_20: {
      id: 'income_up_20',
      name: 'Wzrost 20%',
      description: 'Zwiększ przychody o 20% vs poprzedni miesiąc',
      icon: '📈',
      category: 'income',
      points: 100
    },
    new_income_source: {
      id: 'new_income_source',
      name: 'Nowe źródło',
      description: 'Dodaj nowe źródło przychodu',
      icon: '💼',
      category: 'income',
      points: 40
    },
    side_hustle: {
      id: 'side_hustle',
      name: 'Dodatkowy dochód',
      description: 'Miej 3+ źródła przychodu',
      icon: '🚀',
      category: 'income',
      points: 75
    },
    diversified: {
      id: 'diversified',
      name: 'Zdywersyfikowany',
      description: 'Miej 5+ źródeł przychodu',
      icon: '🌈',
      category: 'income',
      points: 150
    },
    early_payment: {
      id: 'early_payment',
      name: 'Wcześniejsza wpłata',
      description: 'Oznacz przychód przed 5. dniem miesiąca',
      icon: '⏰',
      category: 'income',
      points: 20
    },
    bonus_income: {
      id: 'bonus_income',
      name: 'Bonus!',
      description: 'Otrzymaj więcej niż oczekiwano',
      icon: '🎊',
      category: 'income',
      points: 35
    },
    stable_income: {
      id: 'stable_income',
      name: 'Stabilność',
      description: 'Wszystkie przychody regularne przez 6 miesięcy',
      icon: '🏛️',
      category: 'income',
      points: 100
    },
    income_milestone: {
      id: 'income_milestone',
      name: 'Kamień milowy',
      description: 'Łączne przychody przekroczyły 100 000 zł',
      icon: '💎',
      category: 'income',
      points: 200
    },

    // ==========================================
    // 🎊 SPECJALNE I SEZONOWE (10)
    // ==========================================
    new_year_goal: {
      id: 'new_year_goal',
      name: 'Noworoczny cel',
      description: 'Ustaw cel w styczniu',
      icon: '🎆',
      category: 'special',
      points: 25
    },
    christmas_saver: {
      id: 'christmas_saver',
      name: 'Świąteczny oszczędzacz',
      description: 'Zaoszczędź na święta (grudzień pod kontrolą)',
      icon: '🎄',
      category: 'special',
      points: 50
    },
    summer_budget: {
      id: 'summer_budget',
      name: 'Wakacyjny budżet',
      description: 'Nie przekrocz budżetu w wakacje',
      icon: '🏖️',
      category: 'special',
      points: 75
    },
    black_friday_resist: {
      id: 'black_friday_resist',
      name: 'Odporny na promocje',
      description: 'Nie zwiększ wydatków w Black Friday',
      icon: '🛡️',
      category: 'special',
      points: 40
    },
    birthday_gift: {
      id: 'birthday_gift',
      name: 'Urodzinowy prezent',
      description: 'Osiągnij cel w miesiącu urodzin',
      icon: '🎂',
      category: 'special',
      points: 50
    },
    valentines: {
      id: 'valentines',
      name: 'Walentynkowe oszczędności',
      description: 'Wspólny cel osiągnięty w lutym',
      icon: '💘',
      category: 'special',
      points: 60
    },
    spring_cleaning: {
      id: 'spring_cleaning',
      name: 'Wiosenne porządki',
      description: 'Zmniejsz wydatki o 15% w marcu',
      icon: '🌸',
      category: 'special',
      points: 45
    },
    back_to_school: {
      id: 'back_to_school',
      name: 'Powrót do szkoły',
      description: 'Zarządzaj wydatkami szkolnymi we wrześniu',
      icon: '🎒',
      category: 'special',
      points: 35
    },
    tax_season: {
      id: 'tax_season',
      name: 'Sezon podatkowy',
      description: 'Dodaj zwrot podatku jako przychód',
      icon: '📑',
      category: 'special',
      points: 30
    },
    friday_13: {
      id: 'friday_13',
      name: 'Szczęściarz',
      description: 'Zaoszczędź w piątek 13-tego',
      icon: '🍀',
      category: 'special',
      points: 13,
      secret: true
    },

    // ==========================================
    // 🏅 POZIOMY I RANGI (5)
    // ==========================================
    level_bronze: {
      id: 'level_bronze',
      name: 'Brązowy poziom',
      description: 'Zdobądź 500 punktów',
      icon: '🥉',
      category: 'level',
      points: 50
    },
    level_silver: {
      id: 'level_silver',
      name: 'Srebrny poziom',
      description: 'Zdobądź 2000 punktów',
      icon: '🥈',
      category: 'level',
      points: 100
    },
    level_gold: {
      id: 'level_gold',
      name: 'Złoty poziom',
      description: 'Zdobądź 5000 punktów',
      icon: '🥇',
      category: 'level',
      points: 200
    },
    level_platinum: {
      id: 'level_platinum',
      name: 'Platynowy poziom',
      description: 'Zdobądź 10000 punktów',
      icon: '💎',
      category: 'level',
      points: 500
    },
    level_diamond: {
      id: 'level_diamond',
      name: 'Diamentowy poziom',
      description: 'Zdobądź 25000 punktów',
      icon: '👑',
      category: 'level',
      points: 1000,
      legendary: true
    }
  };

  // === NAGRODY ===
  static REWARDS = {
    coffee_date: {
      id: 'coffee_date',
      name: 'Randka kawowa',
      description: 'Wspólna kawa poza domem',
      cost: 100,
      icon: '☕'
    },
    movie_night: {
      id: 'movie_night',
      name: 'Wieczór filmowy',
      description: 'Wybór filmu należy do Ciebie',
      cost: 150,
      icon: '🎬'
    },
    sleep_in: {
      id: 'sleep_in',
      name: 'Długie spanie',
      description: 'Partner zajmuje się dziećmi rano',
      cost: 200,
      icon: '😴'
    },
    restaurant: {
      id: 'restaurant',
      name: 'Kolacja w restauracji',
      description: 'Wspólna kolacja poza domem',
      cost: 300,
      icon: '🍽️'
    },
    spa_day: {
      id: 'spa_day',
      name: 'Dzień SPA',
      description: 'Relaks i pielęgnacja',
      cost: 500,
      icon: '🧖'
    },
    weekend_trip: {
      id: 'weekend_trip',
      name: 'Weekendowy wypad',
      description: 'Krótki wyjazd we dwoje',
      cost: 1000,
      icon: '🚗'
    },
    shopping_budget: {
      id: 'shopping_budget',
      name: 'Budżet na zakupy',
      description: 'Dodatkowe 200 zł na co chcesz',
      cost: 400,
      icon: '🛍️'
    },
    hobby_time: {
      id: 'hobby_time',
      name: 'Czas na hobby',
      description: 'Całe popołudnie dla siebie',
      cost: 250,
      icon: '🎨'
    },
    fancy_dinner: {
      id: 'fancy_dinner',
      name: 'Wykwintna kolacja',
      description: 'Kolacja w eleganckiej restauracji',
      cost: 750,
      icon: '🥂'
    },
    massage: {
      id: 'massage',
      name: 'Masaż',
      description: 'Profesjonalny masaż relaksacyjny',
      cost: 350,
      icon: '💆'
    },
    concert: {
      id: 'concert',
      name: 'Koncert/Event',
      description: 'Bilety na koncert lub wydarzenie',
      cost: 600,
      icon: '🎵'
    },
    new_gadget: {
      id: 'new_gadget',
      name: 'Nowy gadżet',
      description: 'Mały gadżet według wyboru',
      cost: 800,
      icon: '📱'
    }
  };

  constructor(dataManager) {
    this.dataManager = dataManager;
    this.unlockedAchievements = this._loadAchievements();
  }

  _loadAchievements() {
    const data = localStorage.getItem(GamificationManager.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('[GamificationManager] JSON parse error:', e);
      }
    }
    return {
      wife: { unlocked: [], points: 0, rewards: [] },
      husband: { unlocked: [], points: 0, rewards: [] }
    };
  }

  _save() {
    localStorage.setItem(GamificationManager.STORAGE_KEY, JSON.stringify(this.unlockedAchievements));
  }

  /**
   * Sprawdź i odblokuj osiągnięcia na podstawie aktualnych danych
   */
  /**
   * Sesja 13 (D-C2): TYLKO te osiągnięcia mają zaimplementowane warunki
   * w _checkCondition — UI pokazuje i sprawdza wyłącznie je (pozostałe
   * ~90 definicji w rejestrze wpadało w default:false = obietnice bez
   * pokrycia). Dodajesz osiągnięcie? Dopisz case w _checkCondition ORAZ
   * id tutaj.
   * Celowo poza listą: osiągnięcia wydatkowe (feature wydatków
   * zarchiwizowany w sesji 6) i kategorie couple/consistency/special
   * (wymagają martwych dziś podsystemów).
   */
  static EARNABLE_IDS = [
    // start / staż
    'first_income', 'first_goal', 'first_category', 'setup_sources',
    'week_user', 'month_user',
    // oszczędności
    'save_100', 'save_500', 'save_1000', 'save_2000', 'save_5000', 'save_10000',
    // cele
    'goal_25', 'goal_50', 'goal_75', 'goal_complete', 'goal_collector',
    // przychody
    'all_sources_paid', 'new_income_source', 'side_hustle', 'diversified',
    // streak (dane z EngagementManagera)
    'streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90', 'streak_365',
    // poziomy
    'level_bronze', 'level_silver', 'level_gold', 'level_platinum', 'level_diamond'
  ];

  static getEarnableAchievements() {
    return GamificationManager.EARNABLE_IDS
      .map(id => GamificationManager.ACHIEVEMENTS[id])
      .filter(Boolean);
  }

  checkAchievements(owner = 'wife') {
    const newUnlocks = [];
    const userAchievements = this.unlockedAchievements[owner];

    // Sprawdzaj wyłącznie osiągnięcia z zaimplementowanymi warunkami
    for (const id of GamificationManager.EARNABLE_IDS) {
      const achievement = GamificationManager.ACHIEVEMENTS[id];
      if (!achievement) continue;
      if (userAchievements.unlocked.includes(id)) continue;

      if (this._checkCondition(id, owner)) {
        this._unlock(id, owner);
        newUnlocks.push(achievement);
      }
    }

    return newUnlocks;
  }

  _checkCondition(achievementId, owner) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (achievementId) {
      // PIERWSZE KROKI
      case 'first_expense':
        return this.dataManager.getExpenses().length >= 1;
      case 'first_income':
        return this.dataManager.getIncome().length >= 1;
      case 'first_goal':
        return this.dataManager.getPlannedExpenses().length >= 1;
      case 'first_budget':
        return this.dataManager.getCategories().some(c => c.budget > 0);
      case 'first_category':
        return this.dataManager.getCustomCategories().length >= 1;
      case 'setup_sources':
        return this.dataManager.getIncomeSources().length >= 2;

      // OSZCZĘDNOŚCI
      case 'save_100':
        return this.dataManager.getMonthlyStats(year, month).savings >= 100;
      case 'save_500':
        return this.dataManager.getMonthlyStats(year, month).savings >= 500;
      case 'save_1000':
        return this.dataManager.getMonthlyStats(year, month).savings >= 1000;
      case 'save_2000':
        return this.dataManager.getMonthlyStats(year, month).savings >= 2000;
      case 'save_5000':
        return this.dataManager.getMonthlyStats(year, month).savings >= 5000;
      case 'save_10000':
        return this.dataManager.getMonthlyStats(year, month).savings >= 10000;

      // WYDATKI
      case 'expense_tracker':
        return this.dataManager.getExpenses().filter(e => e.description).length >= 50;
      case 'expense_veteran':
        return this.dataManager.getExpenses().length >= 200;
      case 'expense_master':
        return this.dataManager.getExpenses().length >= 500;
      case 'under_budget': {
        const stats = this.dataManager.getMonthlyStats(year, month);
        const cats = this.dataManager.getCategories().filter(c => c.budget > 0);
        return cats.every(c => (stats.byCategory[c.id] || 0) <= c.budget);
      }

      // CELE
      case 'goal_25':
        return this.dataManager.getPlannedExpenses().some(g =>
          (g.currentAmount / g.targetAmount) >= 0.25);
      case 'goal_50':
        return this.dataManager.getPlannedExpenses().some(g =>
          (g.currentAmount / g.targetAmount) >= 0.50);
      case 'goal_75':
        return this.dataManager.getPlannedExpenses().some(g =>
          (g.currentAmount / g.targetAmount) >= 0.75);
      case 'goal_complete':
        return this.dataManager.getPlannedExpenses().some(g =>
          g.currentAmount >= g.targetAmount);
      case 'goal_collector':
        return this.dataManager.getPlannedExpenses().filter(g =>
          g.currentAmount < g.targetAmount).length >= 5;

      // PRZYCHODY
      case 'all_sources_paid': {
        const summary = this.dataManager.getMonthlyIncomeSummary(year, month);
        return summary.sources.length > 0 &&
               summary.sources.every(s => s.status === 'complete');
      }
      case 'new_income_source':
        return this.dataManager.getIncomeSources().length >= 1;
      case 'side_hustle':
        return this.dataManager.getIncomeSources().length >= 3;
      case 'diversified':
        return this.dataManager.getIncomeSources().length >= 5;

      // POZIOMY
      case 'level_bronze':
        return this.unlockedAchievements[owner].points >= 500;
      case 'level_silver':
        return this.unlockedAchievements[owner].points >= 2000;
      case 'level_gold':
        return this.unlockedAchievements[owner].points >= 5000;
      case 'level_platinum':
        return this.unlockedAchievements[owner].points >= 10000;
      case 'level_diamond':
        return this.unlockedAchievements[owner].points >= 25000;

      // STREAK I STAŻ (sesja 13, D-C2/D-C4) — dane EngagementManagera;
      // longestStreak jest monotoniczny, więc odznaka nie "cofa się"
      case 'streak_3':
        return this._getEngagementStat(owner, 'longestStreak') >= 3;
      case 'streak_7':
        return this._getEngagementStat(owner, 'longestStreak') >= 7;
      case 'streak_14':
        return this._getEngagementStat(owner, 'longestStreak') >= 14;
      case 'streak_30':
        return this._getEngagementStat(owner, 'longestStreak') >= 30;
      case 'streak_60':
        return this._getEngagementStat(owner, 'longestStreak') >= 60;
      case 'streak_90':
        return this._getEngagementStat(owner, 'longestStreak') >= 90;
      case 'streak_365':
        return this._getEngagementStat(owner, 'longestStreak') >= 365;
      // totalLogins rośnie raz na dzień (recordLogin ma early-return),
      // więc totalLogins = liczba różnych dni używania aplikacji
      case 'week_user':
        return this._getEngagementStat(owner, 'totalLogins') >= 7;
      case 'month_user':
        return this._getEngagementStat(owner, 'totalLogins') >= 30;

      default:
        return false;
    }
  }

  _unlock(achievementId, owner) {
    const achievement = GamificationManager.ACHIEVEMENTS[achievementId];
    if (!achievement) return;

    this.unlockedAchievements[owner].unlocked.push(achievementId);
    this.unlockedAchievements[owner].points += achievement.points;
    this._save();
  }

  /**
   * Pobierz wszystkie osiągnięcia z statusem
   */
  getAllAchievements(owner = 'wife') {
    const unlocked = this.unlockedAchievements[owner].unlocked;

    return Object.values(GamificationManager.ACHIEVEMENTS).map(a => ({
      ...a,
      unlocked: unlocked.includes(a.id),
      unlockedAt: null // TODO: zapisywać datę
    }));
  }

  /**
   * Pobierz statystyki gracza
   */
  /**
   * Odczyt statystyki użytkownika z danych EngagementManagera.
   * Literal klucza (== EngagementManager.STORAGE_KEY) — bez zależności
   * od kolejności ładowania klas.
   */
  _getEngagementStat(owner, field) {
    try {
      const raw = localStorage.getItem('familygoals_engagement');
      if (!raw) return 0;
      const data = JSON.parse(raw);
      return (data && data[owner] && data[owner][field]) || 0;
    } catch (e) {
      return 0;
    }
  }

  getPlayerStats(owner = 'wife') {
    const data = this.unlockedAchievements[owner];
    // Sesja 13: licznik "x/y" pokazuje tylko realnie zdobywalne
    const total = GamificationManager.EARNABLE_IDS.length;

    return {
      points: data.points,
      unlockedCount: data.unlocked.length,
      totalCount: total,
      percentComplete: Math.round((data.unlocked.length / total) * 100),
      level: this._calculateLevel(data.points),
      pointsToNextLevel: this._pointsToNextLevel(data.points)
    };
  }

  _calculateLevel(points) {
    if (points >= 25000) return { name: 'Diamentowy', icon: '👑', number: 5 };
    if (points >= 10000) return { name: 'Platynowy', icon: '💎', number: 4 };
    if (points >= 5000) return { name: 'Złoty', icon: '🥇', number: 3 };
    if (points >= 2000) return { name: 'Srebrny', icon: '🥈', number: 2 };
    if (points >= 500) return { name: 'Brązowy', icon: '🥉', number: 1 };
    return { name: 'Początkujący', icon: '🌱', number: 0 };
  }

  _pointsToNextLevel(points) {
    const thresholds = [500, 2000, 5000, 10000, 25000];
    for (const t of thresholds) {
      if (points < t) return t - points;
    }
    return 0;
  }

  /**
   * Kup nagrodę
   */
  purchaseReward(rewardId, owner = 'wife') {
    const reward = GamificationManager.REWARDS[rewardId];
    if (!reward) return { success: false, error: 'Nieznana nagroda' };
    if (!reward.cost || reward.cost <= 0) return { success: false, error: 'Nieprawidłowy koszt nagrody' };

    const data = this.unlockedAchievements[owner];
    if (!data) return { success: false, error: 'Nieprawidłowy użytkownik' };
    if (typeof data.points !== 'number' || data.points < 0) {
      data.points = 0; // Reset corrupted points
    }
    if (data.points < reward.cost) {
      return { success: false, error: 'Za mało punktów' };
    }

    // Validate points won't go negative
    const newPoints = data.points - reward.cost;
    if (newPoints < 0) return { success: false, error: 'Błąd kalkulacji punktów' };
    data.points = newPoints;
    data.rewards.push({
      rewardId,
      purchasedAt: new Date().toISOString(),
      redeemed: false
    });
    this._save();

    return { success: true, reward, remainingPoints: data.points };
  }

  /**
   * Pobierz dostępne nagrody
   */
  getAvailableRewards(owner = 'wife') {
    const points = this.unlockedAchievements[owner].points;

    return Object.values(GamificationManager.REWARDS).map(r => ({
      ...r,
      canAfford: points >= r.cost
    })).sort((a, b) => a.cost - b.cost);
  }

  /**
   * Pobierz kupione nagrody
   */
  getPurchasedRewards(owner = 'wife') {
    return this.unlockedAchievements[owner].rewards.map(r => ({
      ...r,
      ...GamificationManager.REWARDS[r.rewardId]
    }));
  }

  /**
   * Oznacz nagrodę jako wykorzystaną
   */
  redeemReward(rewardIndex, owner = 'wife') {
    const rewards = this.unlockedAchievements[owner].rewards;
    if (rewards[rewardIndex]) {
      rewards[rewardIndex].redeemed = true;
      rewards[rewardIndex].redeemedAt = new Date().toISOString();
      this._save();
      return true;
    }
    return false;
  }

  /**
   * Leaderboard między żoną a mężem
   */
  getLeaderboard() {
    return [
      {
        owner: 'wife',
        label: 'Żona',
        ...this.getPlayerStats('wife')
      },
      {
        owner: 'husband',
        label: 'Mąż',
        ...this.getPlayerStats('husband')
      }
    ].sort((a, b) => b.points - a.points);
  }

  /**
   * Pobierz ostatnio odblokowane osiągnięcia
   */
  getRecentUnlocks(owner = 'wife', limit = 5) {
    const unlocked = this.unlockedAchievements[owner].unlocked;
    return unlocked.slice(-limit).reverse().map(id =>
      GamificationManager.ACHIEVEMENTS[id]
    );
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificationManager;
}
