
# Truck Driving Engine — Change Proposal Template

Fill this template to describe the change you want. The clearer the proposal, the faster and safer the implementation.

1) Title
- Short title for the change (one line).

2) Requester and date
- Name: 
- Email (optional):
- Date:

3) Summary (plain English)
- What do you want to change? (2–4 sentences)
- Why do you want it? (player experience, balance, bug fix, performance)

4) Current behaviour (if known)
- Describe how the engine behaves today in the affected area.

5) Proposed behaviour
- Describe precisely what should happen after the change.
- Include examples (input -> output) and acceptance criteria.

6) Metrics & success criteria
- How will we know the change is successful? (e.g., incident rate reduced by X%, average fuel consumption reduced by Y%)
- What to monitor after release?

7) Risk assessment
- What could go wrong? (regression in scoring, incorrect state changes, increased CPU use)
- Which components depend on this behaviour?

8) Rollout plan
- Feature flag? (yes/no)
- Staging validation steps (which scenarios to test).
- Production rollout (gradual/instant).
- Rollback plan (how to revert & mitigate).

9) Tests to add
- Unit tests to verify function-level behavior.
- Integration tests (engine tick + GameContext).
- Simulation scenarios (100 runs, route X, driver Y).

10) Data migrations (if any)
- Do we need to migrate persisted fields? (e.g., add new attributes)
- If yes, describe migration SQL or data transform.

11) Documentation updates
- Manifest (game-rules-engines.ts) version bump and notes.
- Admin UI notes.

12) Comments / Additional information
- Paste any relevant logs, screenshots or developer notes.

Once you fill this template, attach it to a ticket or paste it here and I will:
- Convert it into a concrete implementation plan and PR with tests, or
- Provide an estimate and timeline for the work.
