Truck Driving Engine — Export Bundle

1) README (Overview)
---------------------
Purpose
This document explains what the Truck Driving Engine and its rules do, where they live in the repository, and how to safely propose and test changes.

Quick summary
- Game Rule (GR-008) — documents policies for driving: distance, fuel, wear, incidents, driver hours and side-effects on company state.
- Engine (E-001) — truckDrivingEngine: the runtime implementation that simulates truck movement, fuel use, condition degradation, driver hours and incidents.
- Important events emitted: truckLiveUpdate, routeCompleted, truckIncident.
- Primary files: src/utils/truckDrivingEngine.ts, src/utils/incidentEngine.ts, src/utils/maintenanceEngine.ts, src/engines/driverEngine.ts, src/utils/distanceCalculator.ts, src/contexts/GameContext.tsx.

What the engine controls (plain language)
- Movement: advances trucks along routes each tick using speed and elapsed time.
- Fuel: consumes fuel by distance and speed using per-truck consumption rates or defaults.
- Odometer: increases truck mileage and records distance for company stats.
- Condition & wear: reduces condition as trucks travel; low condition increases incident risk.
- Drivers: tracks hours driven, enforces breaks, handles swaps and mandatory rest.
- Incidents: calls incidentEngine for probabilistic breakdowns; triggers truckIncident events and may adjust truck condition.
- Events & side-effects: emits live updates and completion events so UI and GameContext apply finances, reputation, and job resolution.

Key invariants to preserve when changing rules
- Kilometers and fuel accounting must remain consistent.
- Condition must stay in defined range (usually 0..100).
- Events and their payloads must preserve compatibility (so UI and contexts keep working).
- Monetary flows and difficulty balance should be re-checked after any tuning.

How to propose changes (short)
- Use the change proposal template (below). Provide purpose, expected behavior, tests, rollback plan.
- Implementation steps: small isolated change → unit/sim tests → staging validation → monitored release → rollback if needed.

Where to inspect the code
- src/utils/truckDrivingEngine.ts (main loop, per-tick updates)
- src/utils/incidentEngine.ts (incident probability & event)
- src/utils/maintenanceEngine.ts (repair & maintenance rules)
- src/engines/driverEngine.ts (driver work/rest rules)
- src/utils/distanceCalculator.ts (distance computation & caches)
- src/contexts/GameContext.tsx (where events mutate game/company state)

2) manifest.json (GR-008, E-001 and related cron entries)
----------------------------------------------------------
{
  "gameRule": {
    "id": "GR-008",
    "name": "Truck Driving Engine Rules",
    "description": "Rules governing truck movement, driver hours, fuel consumption and incident handling.",
    "category": "Vehicles",
    "status": "active",
    "version": "1.0.0",
    "lastModified": "2024-01-30",
    "author": "System",
    "codePaths": [
      "src/utils/truckDrivingEngine.ts",
      "src/utils/incidentEngine.ts",
      "src/contexts/GameContext.tsx"
    ],
    "notes": "Produces truckLiveUpdate, routeCompleted and truckIncident events.",
    "metadata": {}
  },
  "engine": {
    "id": "E-001",
    "name": "Truck Driving Engine",
    "description": "Core truck movement & logistics simulation — driving hours, fuel consumption, condition degradation, mileage, incident integration.",
    "path": "src/utils/truckDrivingEngine.ts",
    "tags": ["vehicles", "simulation", "core"],
    "mountStatus": "not-mounted",
    "status": "active",
    "version": "1.0.0",
    "lastModified": "2024-01-30",
    "author": "System",
    "notes": "Singleton engine used by UI/contexts via truckDrivingEngine export.",
    "metadata": {}
  },
  "cron": {
    "id": "C-001",
    "name": "GameContext Background Tick",
    "description": "Central periodic tick used by GameProvider to finalize trainings, reconcile staff, persist state and run background housekeeping.",
    "path": "src/contexts/GameContext.tsx",
    "schedule": "interval (dev 5000 ms) — production: configurable (e.g., 60000 ms)",
    "trigger": "interval",
    "status": "active",
    "lastModified": "2024-01-30",
    "author": "System",
    "notes": "Currently set to 5s for dev. Recommendation: increase cadence for production to 1m or more.",
    "metadata": {}
  }
}

3) Change proposal template
----------------------------
Title:
Short summary (1-2 sentences):
Why (motivation):
Files / areas likely affected:
Detailed description of change (what exactly to change):
User-visible effects (what players will notice):
Acceptance criteria (how will we confirm it’s correct?):
Testing plan (unit tests / simulation runs / staging scenario):
Rollback / mitigation strategy:
Estimated risk and impact on economy or gameplay:
Optional: data migration steps if persisted fields are changing:
Contact / owner for follow-up:

4) Useful next actions I can do now
- Create a code snapshot (zip) of the engine and related files for offline review (I can prepare a snapshot file in the repo).
- Produce a plain-language detailed report that lists functions, the main formulas (fuel, condition, incident rates) and exact line references from src/utils/truckDrivingEngine.ts and incidentEngine.ts.
- If you already have a specific change in mind, fill the template above and paste it here — I will prepare an implementation plan and estimate.
What the rule set (GR-008) describes — plain language
Purpose: Define the "business rules" and constraints for truck trips and how trucks behave while driving.
Main domains covered:
Distance & routing: how distances between cities are measured (matrix, Haversine fallback, optional online driving distances).
Driving hours & schedules: rules that limit how many hours a driver can drive, when breaks or rest must be applied, and how training/driver skills affect hours.
Fuel consumption: how much fuel a truck uses per kilometer (influenced by truck specs, load, speed) and refueling behavior.
Condition / wear & tear: how truck condition (0–100) declines with use and how maintenance or repairs restore condition.
Incidents & breakdowns: probability model to trigger incidents that can delay or stop routes (based on speed, condition, driver skill, and other risk factors).
Side-effects on company state: awarding kilometers, adjusting finances (income, fuel/repair costs), and reputation changes for deliveries (time, damage).
Events & monitoring: which events the engine emits (truckLiveUpdate, routeCompleted, truckIncident) so other parts of the app react.
What the engine (E-001) does in practice — observable behavior
Inputs:
Current job and planned route
Truck specs (speed, fuel capacity, maintenance group)
Driver assignment, skills and fatigue
Distance between nodes (cities)
Global tick / scheduler (the background tick that runs engine steps)
Processes:
For each engine tick it advances truck along route segments according to speed and elapsed time.
Deducts fuel according to travel distance and consumption rules.
Increases odometer / kilometers driven and updates job progress.
Applies condition degradation and, if condition falls under thresholds, increases incident probability or forces maintenance.
Accounts driver hours (so drivers must rest and some driving might pause).
Calls incident engine logic to roll for incidents; if incident occurs, it may pause route and create incident state.
Emits events other systems listen to: UI updates, job completion handlers, financial accounting.
Outputs / side-effects:
truckLiveUpdate: frequent updates about position, fuel, ETA
routeCompleted: job success triggers income distribution and reputation change
truckIncident: triggers repair flows and may charge the company
Updates to company state (kilometers, fuel expense, maintenance, drivers’ records)
Safety behavior:
Engines are typically idempotent per tick (re-running same tick should not double-apply effects).
The engine respects “mountStatus” — by default the E-001 is declared not-mounted in the manifest, meaning it should not auto-start unless explicitly enabled.
What was agreed (the manifest entries you already have)
GR-008 (Game Rule)
Category: Vehicles
Status: active
Description: defines driving engine rules: hours, fuel, wear, incidents
Code paths listed: src/utils/truckDrivingEngine.ts, src/utils/incidentEngine.ts (and various utils)
E-001 (Engine)
Name: Truck Driving Engine
Purpose: core truck movement & logistics simulation — driving hours, fuel consumption, condition degradation, mileage, incident integration
Path: src/utils/truckDrivingEngine.ts
mountStatus: not-mounted (meaning it’s configured to not auto-run on app start — avoid accidental background processing)
Notes in manifest: emits truckLiveUpdate, routeCompleted and truckIncident events
Key places in the codebase to inspect (these are the files a developer will open)
Primary implementation file:
src/utils/truckDrivingEngine.ts — the main engine loop and driving logic.
Related systems that influence or are influenced by driving:
src/utils/incidentEngine.ts — incident probability and incident handling
src/utils/maintenanceEngine.ts — maintenance cost/repair logic and condition restoration
src/engines/driverEngine.ts — driver shifts, rest and sick leave interactions
src/utils/distanceCalculator.ts and src/utils/distances.json — distance computation used for fuel/time/ETAs
src/contexts/GameContext.tsx — where engine events apply company-level state (money, reputation, job acceptance/completion)
src/contexts/JobMarketContext.tsx or job generator utilities — to see how job reward/requirements interact
src/data/trucks/* and src/data/trucks.ts — truck specs (speed, maintenanceGroup)
Documentation artifact I already created:
docs/truck-driving-engine/README.md — plain summary and change checklist (open this first)
docs/truck-driving-engine/manifest.json — the engine/rule entries in JSON
Practical invariants and expectations you must keep when changing rules (These are the “must not break” things — if you change rules, verify these)
Kilometers and fuel accounting must remain consistent (kilometers recorded for company should match distances driven).
Condition must always stay within a known range (for example 0–100) — engine should not produce negative condition.
Driver hours and legal limits should be preserved or changed consciously: changing them affects game difficulty and job feasibility.
Events (routeCompleted, truckIncident) must still be emitted so UI and job bookkeeping continue to work.
Monetary flows: delivery income, fuel costs and repair costs should remain balanced relative to difficulty changes (otherwise economy could break).
Upgradability: if you change formulas (e.g., fuel consumption), older saved games might see shifts — plan migration or compatibility notes.
Typical change requests and their impact (examples)
Example change: "Increase base fuel usage by 10% for heavy loads"
Where to change: compute consumption formula in truckDrivingEngine.ts (or a helper)
Tests: simulate same route before/after and compare fuel usage and trip completions
Risk: companies will pay more for fuel; some jobs may become unprofitable -> consider re-balancing job pay
Example change: "Reduce incident probability by half for drivers with Advanced Training"
Where: incidentEngine.ts decision logic where driver skill reduces probability
Tests: run many simulated trips to verify incident frequency reduction statistically
Risk: fewer breakdowns -> less repair revenue; might make game easier
Example change: "Allow longer continuous driving hours (increase max driving hours)"
Where: driverEngine.ts + truckDrivingEngine checks on rest/shift
Tests: ensure drivers don’t exceed new limits and job scheduling logic picks up the change
Risk: could remove rest penalties; review long-route job balance
Example change: "Add new event when crossing an international border"
Where: truckDrivingEngine.ts route progression (detect city-country change) then emit new event
Tests: run trips crossing country boundary, verify event payload and any UI/listeners
Risk: minimal if only event added; but anything listening to new event must be updated
How you (non-technical) can propose a change so it’s clear and safe
Fill a change proposal that includes:
Short description of what you want to change and why (player experience or bug fix)
Files/areas you think are affected (I can propose these if you don’t know)
Expected user-visible outcome (e.g., "jobs on long routes become 10% more expensive to account for fuel")
Acceptance criteria (how to check the change worked)
Any rollback or mitigation (what to revert if unexpected problems)
Use the template I added at docs/truck-driving-engine/change-proposal-template.md — fill it and send it to me. I will convert it to a step-by-step dev ticket and implementation plan.
How I (or your developer) will implement a change (high-level steps)
Read & document: review relevant code and add inline comments if needed.
Write a small isolated change: change a single formula, threshold or probability.
Add unit tests & simulation runs: simulate many trips to see statistical effects.
Stage environment testing: run the change in a non-production environment with sample saved games.
Review with you: show before/after metrics and screenshots.
Deploy behind a short monitoring window, watch logs and metrics for any unexpected outcomes.
If problem appears, quickly revert to previous code (we keep rollbacks ready).
How you can “see what is already established” right now
Read the docs I created in docs/truck-driving-engine/* for the human summary and the exact manifest subset.
Ask me to create a snapshot (export) of the engine code files so you can view them (I can export a zip or create a copy in docs/) — say "Snapshot" and I will produce it.
If you prefer a plain-language report listing all functions/behaviors found in the engine code (I can produce that automatically): say "Detailed report" and I’ll scan the engine files and return a non-technical summary plus line references.
Risks & compatibility notes (what to be mindful of)
Changing formulas may affect game economy; always evaluate finances, incomes and job availability after changes.
Saved games: some changes may make old saves behave differently (e.g., drivers immediately break if condition formula is harsher). Plan migration notes or gentle effect changes.
Hidden coupling: the engine emits events other parts rely on — make sure to keep event contracts (event names and essential payload fields).
Engines that are not mounted by default should not be enabled in production without a careful plan.

End of export bundle.