# ADR-001: Adopt Log File Genius

**Status:** Accepted
**Date:** 2025-12-28
**Deciders:** Project owner
**Related:** Initial commit `021b627`

---

## Context

FamilyGoals is a new project using
AI-assisted development with Claude Code.

Traditional documentation (README, wiki)
is token-inefficient - AI must load
entire files even for simple context.

We need a documentation system that:
- Minimizes token usage
- Provides structured context
- Integrates with Claude Code
- Scales with project growth

---

## Decision

Adopt Log File Genius v0.2.0 with
`solo-developer` profile.

**Five-document system:**
1. PRD - What we're building
2. CHANGELOG - What changed (facts)
3. DEVLOG - Why it changed (narrative)
4. STATE - Current status
5. ADRs - Architectural decisions

**Token budget:** <25k total
**Location:** `logs/` folder

---

## Consequences

### Positive
- Token-efficient context loading
- Structured documentation pattern
- Always-active Claude rules
- Automatic archival when files grow
- Clear separation of concerns

### Negative
- Learning curve for LFG workflow
- Must maintain multiple files
- Rules overhead in .claude/

### Neutral
- Commits must include log updates
- May need ADR for major decisions

---

## Alternatives Considered

### Alternative 1: Single README.md
**Rejected:** Not scalable, token-heavy
for AI context loading.

### Alternative 2: GitHub Wiki
**Rejected:** External to repo, not
integrated with Claude Code.

### Alternative 3: No formal docs
**Rejected:** AI loses context between
sessions, inefficient development.

---

## Notes

- Profile: `solo-developer` (flexible)
- Config: `.logfile-config.yml`
- Templates: `.log-file-genius/templates/`
