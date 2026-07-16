# DCMS docs index

Start here:

- [`current-architecture.md`](./current-architecture.md) - what's built today
- [`target-architecture.md`](./target-architecture.md) - where we're taking it (clean + secure multi-tenant)
- [`roadmap.md`](./roadmap.md) - phased plan and status (Phase 0 and Phase 1 done as of 2026-07-16)

## Subfolders

- `setup/` - local/Windows/network installation guides
- `guides/` - how-to's for specific features (testing, partner accounts, superadmin recovery, partner API)
- `database/` - migrations, DB access, schema notes
- `infra/` - hosting/VPS recommendations, production deployment
- `business/` - cost breakdowns, timeline
- `planning/` - open-source strategy docs (moved from the old root-level `Open Source/` folder)
- `archive/` - superseded or point-in-time status docs kept for reference only, including old POC/sync-server setup notes (the sync server itself was removed in Phase 1) and raw Cursor chat-session exports under `archive/cursor-chat-exports/`

## Root-level GDPR/pricing/market docs

The following predate this reorganization and still live directly under `docs/` un-categorized: `CONSENT_DATABASE_MIGRATION.md`, `CUSTOMER_DATA_LIFECYCLE.md`, `DATABASE_MIGRATION_BENEFITS.md`, `DEPLOYMENT_SINGLE_VS_SHARED.md`, `DOCKER_VPS_LOCAL_TEST.md`, `FEASIBLE-WITHOUT-BACKEND.md`, `FINAL-SUMMARY.md`, `GDPR_*.md`, `LOCATIONS_AND_LOCATION_TYPES.md`, `MAC_LOCAL_SETUP.md`, `MARKET_*.md`, `MULTITENANT_DESIGN.md`, `NEXT-STEPS-TO-START.md`, `PRICING_*.md`, `SPAIN_DIVE_REGULATIONS.md`, `SaaS_FINANCIAL_BALANCE_12_CENTERS.md`, `WHY_LOCALSTORAGE.md`. Left in place for this pass; folding them into the subfolders above is a reasonable follow-up.
