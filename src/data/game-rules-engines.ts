/**
 * src/data/game-rules-engines.ts
 *
 * Canonical manifest of Game Rules, Engines and Cron Jobs.
 *
 * This file is the authoritative source used by the Game Rules & Engines admin UI.
 * Every rule/engine/cron added to the codebase MUST be added here so the admin UI
 * can expose and audit it.
 */

/**
 * @interface GameRule
 * @description Describes a game rule entry stored in the manifest
 */
export interface GameRule {
  id: string;
  name: string;
  description: string;
  category?: string;
  status: 'active' | 'proposed' | 'deprecated';
  version?: string;
  lastModified?: string;
  author?: string;
  codePaths?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * @interface EngineEntry
 * @description Describes a runtime engine or helper that performs background work
 */
export interface EngineEntry {
  id: string;
  name: string;
  description: string;
  path?: string | null;
  tags?: string[];
  mountStatus?: 'mounted' | 'not-mounted' | 'proposed';
  status?: 'active' | 'proposed' | 'deprecated';
  version?: string;
  lastModified?: string;
  author?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * @interface CronJob
 * @description Describes a scheduled/background task (cron-like)
 */
export interface CronJob {
  id: string;
  name: string;
  description: string;
  path?: string | null;
  schedule?: string | null;
  trigger?: string;
  status?: 'active' | 'proposed' | 'deprecated';
  lastModified?: string;
  author?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * @description The manifest exported for admin UI & migration.
 */
export const manifest: {
  gameRules: GameRule[];
  engines: EngineEntry[];
  cronJobs: CronJob[];
} = {
  gameRules: [
    {
      id: 'GR-001',
      name: 'Distance Calculation',
      description:
        'Real-time distance calculation between cities using Haversine formula, precomputed matrix and optional online driving distances.',
      category: 'Core',
      status: 'active',
      version: '2.1.0',
      lastModified: '2024-01-30',
      author: 'System',
      codePaths: ['src/utils/distanceCalculator.ts', 'src/utils/distance-scaffold.ts', 'src/utils/distances.json'],
      notes: 'Used by job generator and map features.',
      metadata: {}
    },
    {
      id: 'GR-002',
      name: 'Job Generation',
      description:
        'Dynamic job creation based on market demand and player/company level with hub boosts and deterministic offers.',
      category: 'Economic',
      status: 'active',
      version: '1.5.2',
      lastModified: '2024-01-29',
      author: 'System',
      codePaths: ['src/utils/jobGenerator.ts'],
      notes: 'Enforces 50% Dry Goods probability and special hub doubling logic for large cities.',
      metadata: {}
    },
    {
      id: 'GR-003',
      name: 'Vehicle Maintenance',
      description:
        'Vehicle wear and tear simulation with maintenance cost rules and maintenance group effects.',
      category: 'Vehicles',
      status: 'active',
      version: '1.3.1',
      lastModified: '2024-01-28',
      author: 'System',
      codePaths: ['src/utils/maintenanceEngine.ts'],
      notes: 'Estimates costs/duration and applies condition restoration.',
      metadata: {}
    },
    {
      id: 'GR-004',
      name: 'Staff Management',
      description:
        'Staff hiring, training, performance tracking and morale/fit updates.',
      category: 'Staff',
      status: 'active',
      version: '1.4.0',
      lastModified: '2024-01-27',
      author: 'System',
      codePaths: ['src/engines/driverEngine.ts', 'src/engines/staffConditionEngine.ts', 'src/utils/skillPersistence.ts'],
      notes: 'Includes training finalization, sick leave rules and skill card disabling.',
      metadata: {}
    },
    {
      id: 'GR-005',
      name: 'Market Price Fluctuation',
      description: 'Dynamic pricing system for vehicles, trailers and market goods.',
      category: 'Economic',
      status: 'active',
      version: '1.2.1',
      lastModified: '2024-01-18',
      author: 'System',
      codePaths: ['src/contexts/JobMarketContext.tsx'],
      notes: 'Used by market UIs and provider refresh logic.',
      metadata: {}
    },
    {
      id: 'GR-006',
      name: 'Staff Regeneration System',
      description:
        'Regeneration of staff candidate pool with deterministic ratios (80% native / 20% foreign, 90% male / 10% female) every 48 hours when needed.',
      category: 'System',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      codePaths: ['src/components/staff/*', 'src/engines/driverEngine.ts'],
      notes: 'TTL-based generation; uses local storage keys tm_staff_*',
      metadata: {}
    },
    {
      id: 'GR-007',
      name: '48-Hour Persistence System',
      description:
        'Data persistence and regeneration rules with key format and timestamp validation; periodic regeneration ready for scheduled daily run.',
      category: 'System',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      codePaths: ['src/utils/worldStorage.ts', 'src/engines/staffConditionEngine.ts'],
      notes: 'Documented behavior; intended for server migration later.',
      metadata: {}
    },
    {
      id: 'GR-008',
      name: 'Truck Driving Engine Rules',
      description:
        'Rules governing truck movement, driver hours, fuel consumption and incident handling.',
      category: 'Vehicles',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      codePaths: ['src/utils/truckDrivingEngine.ts', 'src/utils/incidentEngine.ts'],
      notes: 'Produces truckLiveUpdate, routeCompleted and truckIncident events.',
      metadata: {}
    },
    {
      id: 'GR-009',
      name: 'Reputation Enforcement',
      description:
        'Enforce company.reputation reset/format during persistence and restore flows. This rule documents code paths that currently set reputation to a canonical value.',
      category: 'System',
      status: 'proposed',
      version: '1.0.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      codePaths: ['src/contexts/GameContext.tsx'],
      notes: 'Proposed entry; does not change behavior. Add if you want explicit configurable rule record.',
      metadata: { enforcement: true }
    },
    {
      id: 'GR-010',
      name: 'Purchase Delivery Flow',
      description:
        'Purchases create IncomingDelivery entries; items do not appear in fleet lists until delivered; a background finalizer moves items when ETA expires.',
      category: 'System',
      status: 'proposed',
      version: '1.0.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'System',
      codePaths: ['src/utils/incomingDeliveryUtils.ts', 'src/components/fleet/IncomingDeliveriesPanel.tsx', 'src/components/fleet/IncomingDeliveryFinalizer.tsx', 'src/components/market/PurchaseButton.tsx'],
      notes: 'Defines IncomingDeliveries lifecycle and finalizer behavior.',
      metadata: {}
    },
    {
      id: 'GR-011',
      name: 'Rule & Engine Visibility Policy',
      description:
        'All newly added Game Rules, Engines and CronJobs MUST be recorded in the Game Rules & Engines manifest (src/data/game-rules-engines.ts) and visible in the Game Rules & Engines admin UI. This ensures auditability and discoverability of runtime policies and background helpers.',
      category: 'System',
      status: 'active',
      version: '1.0.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'System',
      codePaths: ['src/data/game-rules-engines.ts', 'src/pages/GameRulesEngines.tsx'],
      notes: 'Enforces documentation + UI visibility for engine/rule changes.',
      metadata: { enforcement: true }
    }
  ],
  engines: [
    {
      id: 'E-001',
      name: 'Truck Driving Engine',
      description:
        'Core truck movement & logistics simulation — driving hours, fuel consumption, condition degradation, mileage, incident integration.',
      path: 'src/utils/truckDrivingEngine.ts',
      tags: ['vehicles', 'simulation', 'core'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Singleton engine used by UI/contexts via truckDrivingEngine export.',
      metadata: {}
    },
    {
      id: 'E-002',
      name: 'Incident Engine',
      description: 'Evaluates risk of breakdowns/incidents and emits truckIncident events.',
      path: 'src/utils/incidentEngine.ts',
      tags: ['vehicles', 'risk', 'events'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Invoked by Truck Driving Engine on updates.',
      metadata: {}
    },
    {
      id: 'E-003',
      name: 'Job Generation Engine',
      description:
        'Generates freight jobs based on market demand, city sizes and cargo-trailer compatibility rules.',
      path: 'src/utils/jobGenerator.ts',
      tags: ['economic', 'generator', 'market'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.5.2',
      lastModified: '2024-01-29',
      author: 'System',
      notes: 'Stateless generator used by JobMarketProvider and admin tools.',
      metadata: {}
    },
    {
      id: 'E-004',
      name: 'Job Market Provider',
      description: 'Manages market lifecycle, snapshots, regeneration and persistence.',
      path: 'src/contexts/JobMarketContext.tsx',
      tags: ['market', 'provider', 'persistence'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Mounted in App via <JobMarketProvider />.',
      metadata: {}
    },
    {
      id: 'E-005',
      name: 'Distance Calculation Service',
      description:
        'Multi-layer distance service: precomputed matrix, Haversine fallback, heuristics and optional online driving distances with caching.',
      path: 'src/utils/distanceCalculator.ts',
      tags: ['core', 'geo', 'utility'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '2.1.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Used widely by job generator and UI distance features.',
      metadata: {}
    },
    {
      id: 'E-006',
      name: 'Staff Training Engine',
      description: 'Schedules & finalizes training sessions, awards skill points and persists progress.',
      path: 'src/contexts/GameContext.tsx',
      tags: ['staff', 'training', 'background'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Part of GameProvider background tick.',
      metadata: {}
    },
    {
      id: 'E-007',
      name: 'Staff Skill Assigner Helpers',
      description:
        'Non-visual helpers that normalize staff data, assign mechanic/manager skills and stable IDs.',
      path: 'src/components/staff/*',
      tags: ['staff', 'migration', 'normalization'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Mounted UI-less components in App for data normalization on mount.',
      metadata: {}
    },
    {
      id: 'E-008',
      name: 'Trailer Normalizer',
      description:
        'Data cleanup helper that moves trailers mis-assigned to trucks back into company.trailers.',
      path: 'src/components/fleet/TrailerNormalizer.tsx',
      tags: ['migration', 'data-cleanup'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Runs once on App mount via component side-effect.',
      metadata: {}
    },
    {
      id: 'E-009',
      name: 'Job/Data Sanitizers & Cleaners',
      description: 'Migration & sanitizer helpers for jobs and company data (clean old specs, announcements).',
      path: 'src/components/*',
      tags: ['migration', 'sanitization'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Mounted on App load as UI-less components.',
      metadata: {}
    },
    {
      id: 'E-010',
      name: 'Runtime / Dev Helpers',
      description: 'Development helpers and listeners such as RuntimeSpecLocator and MarketRedirectListener.',
      path: 'src/components/Debug/*',
      tags: ['debug', 'dev'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Dev-only helpers mounted for debugging.',
      metadata: {}
    },
    {
      id: 'E-011',
      name: 'Job Lifecycle Logic (GameContext)',
      description:
        'Accept/complete/cancel job operations that apply company side-effects (tours, kilometers, reputation).',
      path: 'src/contexts/GameContext.tsx',
      tags: ['jobs', 'company-state', 'business-logic'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Exposed through GameProvider methods.',
      metadata: {}
    },
    {
      id: 'E-012',
      name: 'Cargo ↔ Trailer Compatibility Engine',
      description: 'Defines compatibility rules between cargo types and trailer types.',
      path: 'src/utils/cargoTrailerCompatibility.ts',
      tags: ['compatibility', 'utility'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Used by jobGenerator and market filters.',
      metadata: {}
    },
    {
      id: 'E-013',
      name: 'Skill Persistence Utilities',
      description: 'Read/Write helpers for skill progress persisted to localStorage keyed by staff id/hire.',
      path: 'src/utils/skillPersistence.ts',
      tags: ['persistence', 'staff'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Used by training finalization logic.',
      metadata: {}
    },
    {
      id: 'E-014',
      name: 'Fleet Spec Initializer / Storage',
      description: 'Initialization of per-truck and per-trailer specs (speed, reliability, maintenanceGroup).',
      path: 'src/data/trucks/*',
      tags: ['fleet', 'data'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Data seed files and runtime imports populate these specs.',
      metadata: {}
    },
    {
      id: 'E-015',
      name: 'Data Seeders (trailers/availability)',
      description: 'Import-time seed/migration files that populate trailer datasets.',
      path: 'src/data/trailer-*.ts',
      tags: ['seeding', 'data'],
      mountStatus: 'not-mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Imported during app startup; safe and idempotent seeds.',
      metadata: {}
    },
    {
      id: 'E-016',
      name: 'Engine Starter (Bootstrap Orchestrator)',
      description:
        'Proposed orchestrator to safely control which engines start automatically and under which environment (dev/prod).',
      path: null,
      tags: ['orchestration', 'safety'],
      mountStatus: 'proposed',
      status: 'proposed',
      version: '0.1.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Proposal: centralize engine start logic to avoid accidental auto-start of heavy background engines.',
      metadata: {}
    },
    {
      id: 'E-017',
      name: 'Staff Condition Engine Starter',
      description:
        'Proposed separate starter for the staff condition engine to allow independent scheduling and safer control.',
      path: null,
      tags: ['staff', 'background', 'proposed'],
      mountStatus: 'proposed',
      status: 'proposed',
      version: '0.1.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Proposal: useful to split staff condition processing out of the main GameProvider tick.',
      metadata: {}
    },
    {
      id: 'E-018',
      name: 'IncomingDelivery Finalizer',
      description: 'Finalizer that moves delivered incoming items into fleet arrays when ETA expires.',
      path: 'src/components/fleet/IncomingDeliveryFinalizer.tsx',
      tags: ['finalizer', 'incoming', 'fleet'],
      mountStatus: 'mounted',
      status: 'active',
      version: '1.0.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'System',
      notes: 'Mounted in App to process incoming deliveries and emit events for UI animations.',
      metadata: {}
    }
  ],
  cronJobs: [
    {
      id: 'C-001',
      name: 'GameContext Background Tick',
      description:
        'Central periodic tick used by GameProvider to finalize trainings, reconcile staff, persist state and run background housekeeping.',
      path: 'src/contexts/GameContext.tsx',
      schedule: 'interval (dev 5000 ms) — production: configurable (e.g., 60000 ms)',
      trigger: 'interval',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Currently set to 5s for dev. Recommendation: increase cadence for production to 1m or more.',
      metadata: {}
    },
    {
      id: 'C-002',
      name: 'Staff Hiring / Regeneration TTL Check',
      description: 'Regenerate staff candidate pool when stored generatedAt is older than 48 hours.',
      path: 'src/components/staff/*',
      schedule: 'TTL check on mount (48 hours)',
      trigger: 'ttl-check',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Triggered on Staff Hiring page mount; optionally convert to scheduled server-side sweep.',
      metadata: {}
    },
    {
      id: 'C-003',
      name: 'Training Finalization (via Background Tick)',
      description:
        'Training finalization is executed by the central tick (C-001) — checks training.endDate and finalizes training.',
      path: 'src/contexts/GameContext.tsx',
      schedule: 'carried out by C-001',
      trigger: 'internal',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'No separate scheduler required; recorded for audit.',
      metadata: {}
    },
    {
      id: 'C-004',
      name: 'Job Market Regeneration (on mount / manual)',
      description: 'Regenerates the job market snapshot on provider mount or explicit refresh by the user/admin.',
      path: 'src/contexts/JobMarketContext.tsx',
      schedule: 'on-mount / manual',
      trigger: 'on-demand',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Proposed optional cron to periodically refresh market (see C-009).',
      metadata: {}
    },
    {
      id: 'C-005',
      name: 'One-time / On-mount Migration Helpers',
      description:
        'One-time migration and normalizer tasks executed on App mount (e.g., trailer normalizer, id assigners).',
      path: 'src/components/*Normalizer*.tsx',
      schedule: 'on-mount (one-time)',
      trigger: 'on-mount',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Run once per load and safe to keep idempotent.',
      metadata: {}
    },
    {
      id: 'C-006',
      name: 'External/Netlify Function Endpoints',
      description: 'Endpoints suitable for external scheduled invocations (migrate, health-check).',
      path: '/.netlify/functions/*',
      schedule: 'external-scheduler (optional)',
      trigger: 'external',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'No internal cron found; these are hooks for server-side scheduled jobs.',
      metadata: {}
    },
    {
      id: 'C-007',
      name: 'Distance Cache Warm-Up (on-demand)',
      description:
        'Distance cache maintains TTLed entries; warmDistance() populates cache on demand. A cron could periodically warm key routes.',
      path: 'src/utils/distanceCalculator.ts',
      schedule: 'on-demand / optional cron',
      trigger: 'on-demand',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'Proposed C-010 to make this explicit as a cron job.',
      metadata: {}
    },
    {
      id: 'C-008',
      name: 'UI Helper Polling & Event Listeners',
      description: 'Various dev/UI polling/listeners — listed here for audit. They are event-driven rather than scheduled.',
      path: 'src/components/Debug/*, src/components/*Listener*.tsx',
      schedule: 'event-driven',
      trigger: 'event',
      status: 'active',
      lastModified: '2024-01-30',
      author: 'System',
      notes: 'No immediate cron changes recommended.',
      metadata: {}
    },
    {
      id: 'C-009',
      name: 'Job Market Periodic Refresh',
      description:
        'Proposed cron: periodically refresh job market (example every 6 hours) to ensure fresh offers without relying on provider mount.',
      path: 'src/contexts/JobMarketContext.tsx',
      schedule: '0 */6 * * * (every 6 hours) — proposed',
      trigger: 'external-scheduler or server-side cron',
      status: 'proposed',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Proposal only; no runtime changes until approved.',
      metadata: {}
    },
    {
      id: 'C-010',
      name: 'Distance Cache Warm-Up / TTL Refresh',
      description:
        'Proposed cron to warm/populate the distance cache for major hub pairs nightly to reduce runtime latency.',
      path: 'src/utils/distanceCalculator.ts',
      schedule: '0 2 * * * (daily at 02:00) — proposed',
      trigger: 'external-scheduler',
      status: 'proposed',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Would call warmDistance() for high-priority city pairs and populate local cache or server cache.',
      metadata: {}
    },
    {
      id: 'C-011',
      name: 'Netlify Scheduled Migrations / Health Checks',
      description:
        'Proposed cron: schedule repeated calls to serverless endpoints (e.g., /functions/migrate, /functions/debug-deploy-check) for health and migration triggers.',
      path: '/.netlify/functions/*',
      schedule: 'cron (configurable) — proposed',
      trigger: 'external-scheduler',
      status: 'proposed',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Useful to keep server-side maintenance tight; only a proposal.',
      metadata: {}
    },
    {
      id: 'C-012',
      name: 'Staff Pool Regeneration Sweep',
      description:
        'Proposed cron to proactively refresh staff candidate pools (instead of TTL-on-mount) to ensure pools are available for players.',
      path: 'src/components/staff/*',
      schedule: '0 */48 * * * (every 48 hours) — proposed',
      trigger: 'external-scheduler',
      status: 'proposed',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Proposed',
      notes: 'Optional; good candidate for server-side migration to Supabase functions.',
      metadata: {}
    },
    {
      id: 'C-013',
      name: 'Incoming Delivery Finalizer Tick',
      description:
        'Periodic check that finalizes incoming deliveries and moves them into fleet arrays when ETA expires.',
      path: 'src/components/fleet/IncomingDeliveryFinalizer.tsx',
      schedule: 'interval (dev 5000 ms) — production: configurable',
      trigger: 'interval',
      status: 'active',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'System',
      notes: 'Processes incomingDeliveries and emits incomingDeliveriesMoved events for UI animations.',
      metadata: {}
    }
  ]
};

export default manifest;