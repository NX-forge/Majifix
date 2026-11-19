# Phase 9 Acceptance Checklist — Interface and User Experience

## Shared application experience

- [x] Responsive desktop navigation with active-route state.
- [x] Mobile navigation drawer with backdrop, close control and route links.
- [x] Navigation items are role-aware; server-side authorization remains authoritative.
- [x] Notification unread count remains visible in desktop and mobile navigation.
- [x] Skip-to-main-content link and visible keyboard focus treatment.
- [x] Footer and privacy link are consistent across routes.

## Main user journeys

- [x] Public landing page explains reporting, repair coordination and restoration confirmation.
- [x] Dashboard hierarchy improved without changing scoped database queries.
- [x] Existing fault, water-point, technician, notification and analytics workflows retained.
- [x] Existing form labels and native validation controls retained.

## Responsive and accessibility behavior

- [x] Breakpoints for desktop, tablet and narrow mobile layouts.
- [x] Mobile navigation exposes accessible name and expanded state.
- [x] Current navigation link uses `aria-current="page"`.
- [x] Reduced-motion preference is respected.
- [x] Main content has a stable skip-link target.

## Data and security constraints

- [x] No database schema changes.
- [x] No migration created; existing migration history remains untouched.
- [x] No client-side replacement for server-side role checks.
- [x] Dashboard queries retain the Phase 6 role scopes.

## Local verification still required

Run these commands in the project environment:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Playwright tests require the local application and test environment described in `docs/TESTING.md`. Run the mobile navigation tests even when role-specific E2E credentials are unavailable.
