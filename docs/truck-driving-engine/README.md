
# Truck Driving Engine — Overview and Change Process

Purpose
This document explains what the Truck Driving Engine and its rules do, where the implementation lives in the repository, how to safely propose and test changes, and what to expect before/after any modification. It is written to be readable by non-technical stakeholders while providing clear pointers for developers.

Summary (plain English)
- The Truck Driving Engine simulates truck movement, driver hours, fuel consumption, vehicle condition degradation, mileage and integrates incident handling.
- It emits events used across the app (examples: truckLiveUpdate, routeCompleted, truckIncident).
- Rules that govern the engine are part of the game rules manifest (GR-008) and are documented in the code and in the manifest file.
- Changing the engine can affect gameplay for all players — therefore changes must be planned, tested and released carefully (staging, feature flags, gradual rollout).

Key manifest entries (where to find the authoritative descriptions)
- Game Rule: GR-008 — "Truck Driving Engine Rules" (category: Vehicles, status: active)
- Engine: E-001 — "Truck Driving Engine" (path: src/utils/truckDrivingEngine.ts, status: active)
- Cron: C-001 — "GameContext Background Tick" (mounts periodic tick used by GameProvider)

Important repository paths to review
- src/utils/truckDrivingEngine.ts
  - Primary engine implementation: movement, driving hours, fuel & condition updates, event emission.
- src/utils/incidentEngine.ts
  - Risk evaluation for breakdowns/incidents integrated into the driving engine.
- src/contexts/GameContext.tsx
  - Hosts the background tick (C-001) that may drive training finalization and engine ticks. Also holds higher-level job & company mutation APIs.
- src/engines/driverEngine.ts
  - Driver-specific background logic and interactions with the driving engine.
- src/utils/distanceCalculator.ts
  - Distance & route logic used by job generation and driving.
- src/data/game-rules-engines.ts
  - Canonical manifest (read-only file in codebase). See GR-008, E-001 for descriptions and codePaths.
- src/pages/GameRulesEngines.tsx and docs/ (admin UI)
  - UI pages to review rules/engines in read-only mode (we created an Admin UI page).

What to look for in the engine code (developer checklist)
- Entry points & exported functions:
  - Identify functions that start/stop the engine, tick handlers, and exported utilities.
- Public events and channel names:
  - Note the exact event names emitted (truckLiveUpdate, routeCompleted, truckIncident) so any consumer updates can stay compatible.
- Config constants and tuning knobs:
  - Look for constants (max speed, fuelRate, wearRate, drivingHoursLimits). These are the safest items to tune for balancing.
- Side-effects and persistence:
  - Find where the engine mutates GameContext/company state (capital, kilometers, reputation) and ensure expected validation.
- External dependencies:
  - Uses of distanceCalculator, incidentEngine, or external APIs — consider their caches and latencies.
- Cron / tick cadence:
  - Confirm tick interval used by the GameContext (dev 5s, recommended prod >= 60s). Changing cadence impacts timings across the system.
- Tests:
  - Search for unit tests or simulation utilities that run the engine in isolation (if none exist, plan to add them).

Non-technical process to propose a change (recommended)
1) Describe the change in the provided change-proposal-template.md (why, expected behavior, metrics to watch, rollback).
2) Developer tasks:
   - Create a feature branch.
   - Add unit and integration tests that exercise the modified behaviour.
   - Add a configuration flag / feature toggle so changes can be enabled in staging only.
   - Bump engine and/or rule version metadata (e.g., GR-008 version).
   - Document the change in the manifest (notes & metadata) and in the docs.
3) Staging:
   - Deploy to a staging environment and run the test scenarios (jobs, driving runs, incident simulations).
   - Run a smoke test: create a company, accept a job that triggers a driving route, observe emitted events.
4) Release:
   - If results are good, raise a PR and merge to main.
   - Deploy to production behind a feature flag (soft rollout) and monitor.
5) Rollback:
   - If issues occur, revert the feature flag and optionally revert the commit. Because state changes may have occurred, include mitigation steps (e.g., restore DB snapshot).

Testing scenarios to define (examples)
- Short route vs long route comparison: check fuel/condition consumption and job payout.
- Incident probability tuning: run 100 simulated routes and measure incident frequency before/after change.
- Edge cases: trucks with near-zero condition, drivers with different hours remaining, routes crossing very long distances.
- Performance: measure CPU/time for running the engine tick for N trucks.

Safety & governance
- Keep a human-readable change log in the manifest metadata (who, why, date).
- Update GR-008 (version & notes) whenever rules change.
- Prefer configuration/tuning changes over structural algorithm changes when possible.
- For large changes, prepare a migration plan for persisted fields (e.g., changed units or new attributes).

How I can help once you have a proposal
- Review your filled change-proposal template and translate it into a concrete PR with code changes, tests and rollout plan.
- Implement the change and tests, run staging validation, and prepare the production rollout steps or rollback commands.
- Optionally help create simulation harnesses to benchmark the change.

Appendix — quick glossary (for non-technical readers)
- Engine: background code that simulates a part of the game (here: trucks moving).
- Rule: higher-level declarative policy that describes how the system should behave (e.g., how maintenance restores condition).
- Tick: periodic invocation (cron-like) that advances simulated time.
- Upsert: insert-or-update database operation used by migration scripts.
- Feature flag: a toggle to enable/disable a feature without changing code in production.

You can now:
- Edit docs/truck-driving-engine/change-proposal-template.md with the changes you want (I will implement after you confirm), or
- Ask me to export more detailed technical artifacts (code snapshot, simulation harness) when you're ready.

End of README.
