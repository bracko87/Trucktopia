Purchase Delivery Flow — Game Rule (Draft)

Short id
GR-010

Name
Purchase Delivery Flow — Incoming Deliveries policy

Purpose
This rule defines the lifecycle and UX contract for purchased vehicles (trucks and trailers). It documents how purchases are represented while "in transit" (Incoming Deliveries), constraints that prevent duplicates in fleet views, and how finalization (delivery) is performed when ETA expires.

Rule (precise)
- On purchase of a truck or trailer:
  - Create an IncomingDelivery record attached to the purchasing company (company.incomingDeliveries[]).
  - The IncomingDelivery record MUST contain at least:
    - id (stable id for the incoming item)
    - sku / itemSpec (object or string describing the purchased spec)
    - type: 'truck' | 'trailer' (explicit type strongly recommended)
    - purchaseTime: ISO timestamp
    - deliveryEta: ISO timestamp (expected arrival)
    - source (seller identifier)
    - price
    - metadata: optional opaque JSON for additional fields (e.g., specs)
  - Immediately after purchase the item MUST NOT appear in company.trucks or company.trailers and must not be shown in Fleet UI lists.
- While incoming:
  - The item is rendered only in the Incoming Deliveries UI (incomingDeliveries panel).
  - The item must not appear in truck/trailer fleet lists.
  - The item may be cancellable (policy-defined refund/penalty).
- On deliveryEta <= now:
  - A background finalizer (engine/cron or GameContext tick) MUST:
    - Determine the target array by IncomingDelivery.type:
      - 'truck' -> company.trucks
      - 'trailer' -> company.trailers
    - If the item is not already present in the target array, push it into the array and remove the incoming record.
    - If the item already exists in the target array (migration/manual fix), remove the incoming record (do not duplicate).
  - The transition must be idempotent.
- Type detection:
  - Prefer explicitly storing type in IncomingDelivery.
  - If type is missing, fallback heuristics are allowed:
    - Presence of trailer-specific fields (tonnage, cargoClass, axleCount) -> 'trailer'
    - Presence of truck-specific fields (engine, cabType, chassis) -> 'truck'
    - If ambiguous, mark incoming record as 'unknown' and require manual review.
- Edge cases:
  - A single item must never be present simultaneously in incomingDeliveries and the target fleet array.
  - Incoming deliveries persist across sessions and savegames until finalized.
  - Concurrency/race conditions must be handled via the authoritative updater (use GameContext methods or single updater function) so UI actions and background ticks don't duplicate or drop items.

Why this is a rule (not purely UI)
- This is a business-level rule controlling data lifecycle and player expectation. It must be auditable, tested and documented separately from the implementation (finalizer engine).

Suggested manifest metadata
- Add to manifest as a new Game Rule entry:
  - id: GR-010
  - name: "Purchase Delivery Flow"
  - description: "Purchases create IncomingDelivery entries; items do not appear in fleet lists until delivered; a background finalizer moves items when ETA expires."
  - codePaths: ['src/utils/incomingDeliveryUtils.ts', 'src/components/fleet/IncomingDeliveriesPanel.tsx', 'src/contexts/GameContext.tsx']
  - status: proposed (move to active after implementation & QA)

Notes
- Implement finalization in the central background tick (GameContext) or a dedicated small finalizer engine. Prefer the existing tick to avoid multiple timers.
- Provide clear UI feedback (ETA, progress, cancel) and micro-animations on arrival to communicate the lifecycle to the player.
===============================================

Short id
GR-PUR-001

Name
Purchase Delivery Flow — Incoming Deliveries policy

Purpose
This rule defines the lifecycle and UX contract for purchased vehicles (trucks and trailers). It documents how purchases are represented while "in transit" (Incoming Deliveries), constraints that prevent duplicates in fleet views, and how finalization (delivery) is performed when ETA expires.

Rule (precise)
- On purchase of a truck or trailer:
  - Create an IncomingDelivery record attached to the purchasing company (company.incomingDeliveries[]).
  - The IncomingDelivery record MUST contain at least:
    - id (stable id for the incoming item)
    - sku / itemSpec (object or string describing the purchased spec)
    - type: 'truck' | 'trailer' (explicit type strongly recommended)
    - purchaseTime: ISO timestamp
    - deliveryEta: ISO timestamp (expected arrival)
    - source (seller identifier)
    - price
    - metadata: optional opaque JSON for additional fields (e.g., specs)
  - Immediately after purchase the item MUST NOT appear in company.trucks or company.trailers and must not be shown in Fleet UI lists.
- While incoming:
  - The item is rendered only in the Incoming Deliveries UI (incomingDeliveries panel).
  - The item must not appear in truck/trailer fleet lists.
  - The item may be cancellable (policy-defined refund/penalty).
- On deliveryEta <= now:
  - A background finalizer (engine/cron or GameContext tick) MUST:
    - Determine the target array by IncomingDelivery.type:
      - 'truck' -> company.trucks
      - 'trailer' -> company.trailers
    - If the item is not already present in the target array, push it into the array and remove the incoming record.
    - If the item already exists in the target array (migration/manual fix), remove the incoming record (do not duplicate).
  - The transition must be idempotent.
- Type detection:
  - Prefer explicitly storing type in IncomingDelivery.
  - If type is missing, fallback heuristics are allowed:
    - Presence of trailer-specific fields (tonnage, cargoClass, axleCount) -> 'trailer'
    - Presence of truck-specific fields (engine, cabType, chassis) -> 'truck'
    - If ambiguous, mark incoming record as 'unknown' and require manual review.
- Edge cases:
  - A single item must never be present simultaneously in incomingDeliveries and the target fleet array.
  - Incoming deliveries persist across sessions and savegames until finalized.
  - Concurrency/race conditions must be handled via the authoritative updater (use GameContext methods or single updater function) so UI actions and background ticks don't duplicate or drop items.

Why this is a rule (not purely UI)
- This is a business-level rule controlling data lifecycle and player expectation. It must be auditable, tested and documented separately from the implementation (finalizer engine).

Suggested manifest metadata
- Add to manifest as a new Game Rule entry:
  - id: GR-PUR-001
  - name: "Purchase Delivery Flow"
  - description: "Purchases create IncomingDelivery entries; items do not appear in fleet lists until delivered; a background finalizer moves items when ETA expires."
  - codePaths: ['src/utils/incomingDeliveryUtils.ts', 'src/components/fleet/IncomingDeliveriesPanel.tsx', 'src/contexts/GameContext.tsx']
  - status: proposed (move to active after implementation & QA)

Notes
- Implement finalization in the central background tick (GameContext) or a dedicated small finalizer engine. Prefer the existing tick to avoid multiple timers.
- Provide clear UI feedback (ETA, progress, cancel) and micro-animations on arrival to communicate the lifecycle to the player.
