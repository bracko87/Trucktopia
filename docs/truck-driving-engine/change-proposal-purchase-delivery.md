Change Proposal — Purchase Delivery Flow

Title:
Purchase Delivery Flow — Incoming Deliveries and finalizer

Short summary (1-2 sentences):
Introduce an Incoming Deliveries lifecycle for purchased trucks/trailers: when a player purchases a vehicle it is recorded as an IncomingDelivery and only appears in fleet arrays when deliveryEta expires. Add a safe, idempotent finalizer to move items at arrival.

Why (motivation):
- Avoid confusing immediate-placement behavior on purchase.
- Support delivery ETA, cancellations, expedites and visible transit state.
- Prevent duplicate display across Incoming and Fleet lists.

Files / areas likely affected:
- New: src/utils/incomingDeliveryUtils.ts (pure finalizer logic)
- New: src/components/fleet/IncomingDeliveriesPanel.tsx + IncomingDeliveryCard.tsx (UI)
- Integration needed in: src/contexts/GameContext.tsx (call processIncomingDeliveries during background tick or mount a finalizer)
- Purchase flow code: src/components/market/PurchaseButton.tsx (should create IncomingDelivery instead of pushing into fleet)
- Manifest: docs/game-rules/purchase-delivery-rule.md and src/data/game-rules-engines.ts (audit entry GR-010)

Detailed description of change (what exactly to change):
- Introduce IncomingDelivery interface and helper util processIncomingDeliveries(company) -> updatedCompany, movedItems[].
- Modify purchase flow to create an IncomingDelivery record with explicit type and ETA.
- Add IncomingDeliveriesPanel to show incoming items and provide cancel/expedite actions (calls into GameContext methods).
- Wire processIncomingDeliveries into the central background tick (GameContext) so items whose deliveryEta <= now are moved into company.trucks or company.trailers.
- Ensure idempotence: if item already in fleet, drop incoming record.

User-visible effects:
- After purchase the item appears in Incoming Deliveries panel with ETA countdown, not in Fleet lists.
- When ETA expires there will be a short animation and the item appears in the appropriate Fleet box.
- Cancel / Expedite actions available on incoming item cards (policy-driven).

Acceptance criteria (how to confirm it’s correct):
- New purchases create IncomingDelivery entries; fleet lists do not contain these items.
- After deliveryEta passes and background tick runs, the item appears in the proper fleet list and incoming entry is removed.
- Re-running finalizer does not duplicate items.
- Cancelling incoming item before ETA reverses purchase per policy (refund/penalty).
- Type detection fallback works for items missing explicit type (rare).

Testing plan:
- Unit tests for processIncomingDeliveries:
  - item with type 'truck' moves to trucks
  - item with type 'trailer' moves to trailers
  - idempotence: calling twice leaves single fleet item
  - ambiguous/missing type: flagged or handled by fallback
- Integration tests:
  - Purchase flow -> creates incoming record and deducts money
  - Background tick -> moves item at ETA
  - UI tests for IncomingDeliveriesPanel rendering and action callbacks
- Manual staging test:
  - Create company, purchase truck & trailer, observe UI behavior and finalization.

Rollback / mitigation strategy:
- Revert the purchase flow and finalizer integration; keep incomingDeliveryUtils & UI files if revert is partial.
- Because data changes only affect new purchases, no complex migration required to rollback.

Estimated risk and impact:
- Low risk to legacy saved games (existing fleet items untouched).
- Medium impact to player expectations (some players might expect immediate availability).
- Economy effects minimal — purchase cost remains charged at purchase time.

Data migration steps (optional):
- If you decide to retroactively convert some saved purchases into incomingDeliveries, add a migration helper that scans company.trucks/trailers for items with 'recentPurchaseFlag' and convert them.

Owner for follow-up:
- [fill with product/owner name]

Implementation notes for devs:
- Keep processIncomingDeliveries pure and side-effect free; it should return mutations that GameContext can apply transactionally.
- Persist changes using the existing GameContext persistence method.
- Use a single authoritative finalizer (GameContext background tick) to avoid race conditions.

Reference:
- Manifest entry: GR-010 (Purchase Delivery Flow) — src/data/game-rules-engines.ts
=============================================

Title:
Purchase Delivery Flow — Incoming Deliveries and finalizer

Short summary (1-2 sentences):
Introduce an Incoming Deliveries lifecycle for purchased trucks/trailers: when a player purchases a vehicle it is recorded as an IncomingDelivery and only appears in fleet arrays when deliveryEta expires. Add a safe, idempotent finalizer to move items at arrival.

Why (motivation):
- Avoid confusing immediate-placement behavior on purchase.
- Support delivery ETA, cancellations, expedites and visible transit state.
- Prevent duplicate display across Incoming and Fleet lists.

Files / areas likely affected:
- New: src/utils/incomingDeliveryUtils.ts (pure finalizer logic)
- New: src/components/fleet/IncomingDeliveriesPanel.tsx + IncomingDeliveryCard.tsx (UI)
- Integration needed in: src/contexts/GameContext.tsx (call processIncomingDeliveries during background tick or mount a finalizer)
- Purchase flow code: src/components/market/PurchaseButton.tsx (should create IncomingDelivery instead of pushing into fleet)
- Manifest: docs/game-rules/purchase-delivery-rule.md and src/data/game-rules-engines.ts (audit entry)

Detailed description of change (what exactly to change):
- Introduce IncomingDelivery interface and helper util processIncomingDeliveries(company) -> updatedCompany, movedItems[].
- Modify purchase flow to create an IncomingDelivery record with explicit type and ETA.
- Add IncomingDeliveriesPanel to show incoming items and provide cancel/expedite actions (calls into GameContext methods).
- Wire processIncomingDeliveries into the central background tick (GameContext) so items whose deliveryEta <= now are moved into company.trucks or company.trailers.
- Ensure idempotence: if item already in fleet, drop incoming record.

User-visible effects:
- After purchase the item appears in Incoming Deliveries panel with ETA countdown, not in Fleet lists.
- When ETA expires there will be a short animation and the item appears in the appropriate Fleet box.
- Cancel / Expedite actions available on incoming item cards (policy-driven).

Acceptance criteria (how to confirm it’s correct):
- New purchases create IncomingDelivery entries; fleet lists do not contain these items.
- After deliveryEta passes and background tick runs, the item appears in the proper fleet list and incoming entry is removed.
- Re-running finalizer does not duplicate items.
- Cancelling incoming item before ETA reverses purchase per policy (refund/penalty).
- Type detection fallback works for items missing explicit type (rare).

Testing plan:
- Unit tests for processIncomingDeliveries:
  - item with type 'truck' moves to trucks
  - item with type 'trailer' moves to trailers
  - idempotence: calling twice leaves single fleet item
  - ambiguous/missing type: flagged or handled by fallback
- Integration tests:
  - Purchase flow -> creates incoming record and deducts money
  - Background tick -> moves item at ETA
  - UI tests for IncomingDeliveriesPanel rendering and action callbacks
- Manual staging test:
  - Create company, purchase truck & trailer, observe UI behavior and finalization.

Rollback / mitigation strategy:
- Revert the purchase flow and finalizer integration; keep incomingDeliveryUtils & UI files if revert is partial.
- Because data changes only affect new purchases, no complex migration required to rollback.

Estimated risk and impact:
- Low risk to legacy saved games (existing fleet items untouched).
- Medium impact to player expectations (some players might expect immediate availability).
- Economy effects minimal — purchase cost remains charged at purchase time.

Data migration steps (optional):
- If you decide to retroactively convert some saved purchases into incomingDeliveries, add a migration helper that scans company.trucks/trailers for items with 'recentPurchaseFlag' and convert them.

Owner for follow-up:
- [fill with product/owner name]

Implementation notes for devs:
- Keep processIncomingDeliveries pure and side-effect free; it should return mutations that GameContext can apply transactionally.
- Persist changes using the existing GameContext persistence method.
- Use a single authoritative finalizer (GameContext background tick) to avoid race conditions.

