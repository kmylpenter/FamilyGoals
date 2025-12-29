# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## Related Documents

- [DEVLOG](./DEVLOG.md) - Development narrative
- [STATE](./STATE.md) - Current project state

---

## [Unreleased]

### Fixed
- fix: Data consistency - Dashboard vs Income screen (Mąż 2500→6000). Files: `index.html`. Commit: `df83f91`
- fix: Remove sticky button overlapping expense categories. Files: `css/main.css`. Commit: `d4db6de`
- fix: Compact UI - smaller padding, gaps, fonts for mobile fit. Files: `css/main.css`. Commit: `ef29a2c`
- fix: Base font size 18px → 16px. Files: `css/main.css`. Commit: `f2c555f`
- fix: Emoji icons in JSON (graduation-cap → 🎓). Files: `data/config.json`, `data/planned.json`. Commit: `afef4af`
- fix: Form submit buttons closed modal without saving. Files: `index.html`. Commit: `5a35029`
- fix: Chart placeholder when no data, values on bars. Files: `js/app.js`, `css/main.css`. Commit: `5a35029`
- fix: Expense categories expanded to 12, kids→children ID. Files: `index.html`. Commit: `5a35029`

### Added
- feat: Date range (from-to) for recurring expenses. Files: `index.html`, `js/app.js`, `css/main.css`. Commit: `8d8f52a`
- Demo data with leasing/insurance examples. Files: `js/app.js`. Commit: `8d8f52a`
- Demo data auto-initialization on first run. Files: `js/app.js`. Commit: `5a35029`

### Changed
- Compact mobile UI (padding 16px, gap 8px, nav 60px). Files: `css/main.css`. Commit: `ef29a2c`

---

### Fixed
- fix: Data consistency - Dashboard vs Income screen. Files: `index.html`. Commit: `df83f91` (previous session)
- fix: Deep frontend-backend integration (10 issues). Files: `js/app.js`, `index.html`. Commit: `1cb28ea`
- fix: checkAndUnlock() → checkAchievements() crash. Files: `js/app.js`. Commit: `1cb28ea`
- fix: Expense category chips missing data-category-id. Files: `index.html`. Commit: `1cb28ea`
- fix: Correct manager initialization and method names. Files: `js/app.js`. Commit: `0eb6e45`
- fix: Add service worker registration for PWA. Files: `index.html`. Commit: `e72415e`

### Added
- AlertManager integration on dashboard. Files: `js/app.js`, `index.html`, `css/main.css`. Commit: `1cb28ea`
- AIAdvisor daily tip on dashboard. Files: `js/app.js`, `index.html`, `css/main.css`. Commit: `1cb28ea`
- Edit prefill for goals and income sources. Files: `js/app.js`. Commit: `1cb28ea`
- All 11 manager scripts loaded. Files: `index.html`. Commit: `1cb28ea`

### Changed
- PIN handling unified with PinManager. Files: `index.html`, `js/app.js`. Commit: `1cb28ea`
- EventBus connected for UI reactivity. Files: `js/app.js`. Commit: `1cb28ea`
- RecurringManager initialized on app start. Files: `js/app.js`. Commit: `1cb28ea`
- Achievement category mapping expanded. Files: `js/app.js`. Commit: `1cb28ea`

### Added
- **CODEBASE.md** - dokumentacja API wszystkich managerów. Files: `logs/CODEBASE.md`. Commit: `0eb6e45`
- **app.js** - UI controller integrujący managery z frontendem. Files: `js/app.js`. Commit: `b3ac4c5`
- **PWA icons** - ikony 192x192 i 512x512. Files: `icons/`. Commit: `4aab851`
- **PWA screenshots** - dashboard i goals. Files: `screenshots/`. Commit: `c680d78`
- **PWA manifest** - kompletny z shortcuts, screenshots, id. Files: `manifest.json`. Commit: `c680d78`
- **Frontend v2** - jasny pastelowy motyw, fokus na przychody. Files: `css/main.css`, `index.html`. Commit: `608d9e4`
- **Complete UI** - wszystkie ekrany + modale. Files: `index.html`, `css/main.css`. Commit: `6248915`
- **New goals logic** - suma celów → miesięczne oszczędności. Files: `index.html`. Commit: `19e7fff`
- **GitHub Pages** - publiczny deploy. Commit: `2413bfa`
- **Goals system** - cele z dynamicznym deadline. Files: `js/data-manager.js`
- **Income Sources** - źródła przychodów + śledzenie wpłat. Files: `js/data-manager.js`
- **Gamification** - 105 osiągnięć, 12 nagród. Files: `js/gamification-manager.js`
- **AI Advisor** - szczere porady, ocena A-F. Files: `js/ai-advisor.js`
- **EventBus** - reaktywność UI. Files: `js/event-bus.js`
- **Engagement** - login streak, freeze, daily challenges. Files: `js/engagement-manager.js`
- **Family Unity** - współpraca > rywalizacja, wspólne punkty. Files: `js/family-unity.js`
- **Family Balance** - personalizacja mąż/żona, cele z "dlaczego". Files: `js/family-balance.js`
- Add README.md. Files: `README.md`. Commit: `f2183e1`
- Log File Genius v0.2.0 installed. Files: `.log-file-genius/`, `.logfile-config.yml`
- ADR-001: Adopted LFG for documentation. Files: `logs/adr/001-adopt-log-file-genius.md`
- Architecture + Design docs. Files: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`
- PIN Manager - 4-digit auth with sessions. Files: `js/pin-manager.js`
- Data Manager - full CRUD + stats + trends. Files: `js/data-manager.js`
- Recurring Manager - auto stałe wydatki. Files: `js/recurring-manager.js`
- Alert Manager - alerty budżetowe. Files: `js/alert-manager.js`
- PWA config. Files: `manifest.json`, `sw.js`
- Initial data files. Files: `data/*.json`

### Changed
- DESIGN.md rozszerzony o 5 nowych ekranów (Goals, Income Sources, Achievements, Rewards, AI Advisor)
- ARCHITECTURE.md rozszerzony o nowe modele i klasy
- Nawigacja: 📁 Kategorie → 🎯 Cele

### Changed
- Initial commit. Commit: `021b627`
- Architecture and core logic. Commit: `b5279cd`

---
