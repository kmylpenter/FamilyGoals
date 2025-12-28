# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## Related Documents

- [DEVLOG](./DEVLOG.md) - Development narrative
- [STATE](./STATE.md) - Current project state

---

## [Unreleased]

### Added
- Log File Genius v0.2.0 installed as documentation system. Files: `.log-file-genius/`, `.logfile-config.yml`
- Five-document system: CHANGELOG, DEVLOG, STATE, ADRs. Files: `logs/`
- Claude Code integration with always-active rules. Files: `.claude/rules/`
- ADR-001: Adopted LFG for project documentation. Files: `logs/adr/001-adopt-log-file-genius.md`
- Architecture documentation with full data models and API spec. Files: `docs/ARCHITECTURE.md`
- UI/UX design spec with wireframes and guidelines. Files: `docs/DESIGN.md`
- Data Manager - CRUD for expenses, income, categories. Files: `js/data-manager.js`
- PIN Manager - 4-digit PIN auth with sessions. Files: `js/pin-manager.js`
- PWA configuration - manifest and service worker. Files: `manifest.json`, `sw.js`
- Initial data files - categories, inflation, planned goals. Files: `data/*.json`

### Changed
- Initial commit - LFG project setup. Commit: `021b627`

---
