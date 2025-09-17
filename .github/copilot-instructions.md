The goal: help an AI coding assistant be immediately productive in this repository.

Keep guidance short, actionable, and specific to this codebase (20–50 lines).

- Big picture
  - This is a React + TypeScript Electron app that uses an in-memory replacement of
    brackets-json-db (`src/services/memoryStorage.ts`) and the `brackets-manager`
    engine (`src/services/tournamentService.ts`) to model tournaments.
  - UI: `src/renderer.tsx` wires app state and provides three main views:
    Bracket (brackets viewer), Tables (table assignment), and Players (CSV upload).
  - Business logic lives in `src/services/*` (tournamentService, tableManager, memoryStorage).

- Key files to reference when changing behavior
  - `src/services/tournamentService.ts` — seed generation, disambiguation rules,
    stage creation, match update rules (race limits, grand final reset logic).
    If you change seeding or naming rules, update the disambiguation section here.
  - `src/services/memoryStorage.ts` — in-memory DB implementing select/insert/update/delete.
    It intentionally mirrors a tiny JSON DB (no filesystem). Use it when writing tests
    or when mocking persistence.
  - `src/services/tableManager.ts` — table assignment helpers: autoAssignMatches,
    getWaitingMatches, resizeTableAssignments. Table 1 is 'Stream' by convention.
  - `src/hooks/useTournament.ts` and `src/hooks/useTables.ts` — glue between services
    and React components; prefer adding logic to services, and keep hooks thin.
  - `src/components/BracketsViewer.tsx` — integrates the external `brackets-viewer`
    library via dynamic import; treat it as a rendering-only dependency.

- Important conventions & patterns
  - Persistence: the app stores live state in `memoryStorage` (service layer) and also
    mirrors view state to `localStorage` for popouts (`tournament:bracketsData`, `tournament:tablesData`).
  - Disambiguation: player display names may be appended with (state), (city), rating,
    or membershipId per `tournamentService.createTournament()` — preserve this logic when
    altering display strings.
  - Table numbering: UI exposes 1-based table numbers; internal arrays are 0-based. Table 1 is usually named "Stream".
  - Auto-assign: respects per-table `doNotAutoAssign` and global `globalAutoAssign`. Use `tableManager.autoAssignMatches` for algorithmic changes.

- Developer workflows (commands found in `package.json`)
  - Start dev (Electron + renderer): `npm start` (runs `electron-forge start`).
  - Package / make releases: `npm run package`, `npm run make` (or `npm run make:win`).
  - Tests: `npm test` (Jest). There is a small test file under `src/services/__tests__/basic.test.ts`.

- Integration & external deps
  - Core bracket engine: `brackets-manager`, `brackets-model`, `brackets-viewer` (rendered via `BracketsViewer` component). Treat `brackets-manager` as the source of truth for bracket structure and IDs.
  - Electron / Forge: desktop lifecycle and packaging handled by electron-forge; avoid changing electron entry points unless necessary.

- Quick examples (use these call patterns in code changes)
  - Get all tournament data: await new TournamentService().getTournamentData()
  - Create tournament: await svc.createTournament(playersArray, 'double_elimination', 'My Tourney', { trueDouble: true })
  - Auto-assign matches to tables: import and call `autoAssignMatches(matches, assignments, tableCount, tableSettings, globalAutoAssign)`

- When editing UI vs. business logic
  - Prefer to change algorithms in `src/services/` and expose small, well-documented functions to hooks/components.
  - Keep components focused on rendering and user interactions; tests should target services.

- Tests & safety
  - Add unit tests for changed service logic under `src/services/__tests__/` (Jest). Use `MemoryStorage` to avoid disk IO.

If anything here is unclear or you want a different level of detail (examples, call sites, or more files referenced), tell me which area to expand and I will iterate.
