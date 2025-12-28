# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## Related Documents

- [DEVLOG](./DEVLOG.md) - Development narrative
- [STATE](./STATE.md) - Current project state

---

## [Unreleased]

### Fixed
- fix: Correct manager initialization and method names. Files: `js/app.js`. Commit: `0eb6e45`
- fix: Add service worker registration for PWA. Files: `index.html`. Commit: `e72415e`

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
