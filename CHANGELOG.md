# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2025-09-17
### Breaking / Major
- Bumped major version to 3.0.0. This release includes API surface clarifications and internal refactors that may require downstream consumers to re-build.
- `tournamentService` now relies on clearer disambiguation rules for participant names; if you relied on previous implicit name collisions, review `src/services/tournamentService.ts`.

### Notable
- Continued use of in-memory storage (`src/services/memoryStorage.ts`) — storage API unchanged but persistent files are not used.
- `BracketsViewer` remains a rendering-only integration; popout sync uses `localStorage` keys `tournament:bracketsData` and `tournament:tablesData`.

## [2.1.0] - 2025-09-15
### Added
- Tunable Losers Bracket aggressiveness (`LB_AGGRESSIVENESS`) to improve assignment heuristic.
- Popout Tables view and Popout Bracket synchronization via localStorage.
- Friendly round numbering for LB/WB/finals via `getUserFriendlyRoundNumber`.

### Changed
- Assign-next heuristic now uses friendly round numbers and avoids fallback to internal `round_id`.
- Removed on-UI assign-next debug panel from Tables tab.

### Removed
- Realistic simulation script (`scripts/simulate_real.js`) used for heuristic benchmarking.

---

(Previous releases omitted)
