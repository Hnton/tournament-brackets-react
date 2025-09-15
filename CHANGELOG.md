# Changelog

All notable changes to this project will be documented in this file.

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
