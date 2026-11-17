# Phase 8 Acceptance — Testing and Security

Phase 8 strengthens the existing product before a real pilot. It does not add a new business workflow or change the Prisma schema. No database migration is required for this phase.

## Automated test coverage

- [x] Unit tests for account activation, role checks, last-administrator protection and restoration permissions.
- [x] Unit tests for fault visibility and repair policies.
- [x] Unit tests for priority, evidence validation, analytics and notification policy.
- [x] Unit tests for production security headers, worker bearer-secret validation, fixed-window rate-limit decisions and retention cutoffs.
- [x] PostgreSQL integration suite for relational fault/audit persistence, transaction rollback, session revocation and concurrent rate-limit enforcement. It runs only when `TEST_DATABASE_URL` is set and refuses database names that do not end in `_test` or `-test`.
- [x] Playwright browser tests for protected-page redirects, notification-worker authorization, admin/community role boundaries and an optional full repair-to-restoration workflow.

## Security controls added

- [x] Security headers on all routes: CSP, `nosniff`, frame denial, strict referrer policy and permissions policy.
- [x] HSTS and `upgrade-insecure-requests` in production only.
- [x] Database-backed fixed-window limits on water-point creation, editing, status changes, repair-evidence uploads, assessment, assignment, repair updates, cost decisions, delays, restoration, priority overrides, account access changes and session revocation.
- [x] Existing fault-report throttle remains in place at 10 submissions per user per 60 minutes.
- [x] Notification worker bearer authentication extracted into a constant-time comparison helper and covered by tests.
- [x] Existing role and record-ownership checks remain server-side.
- [x] Audit writes remain in the same transaction as the business operation; integration coverage checks persisted audit events.
- [x] Public privacy and data-handling page.
- [x] Dry-run-first retention maintenance with an explicit deletion flag and an extra production confirmation.

## Retention defaults

| Record | Default retention |
| --- | ---: |
| Notifications | 365 days |
| Expired sessions | 30 days after expiry |
| Expired verification tokens | 30 days after expiry |
| Rate-limit counters | 7 days after last request |
| Faults, repairs, evidence and audit logs | Not automatically deleted |

The data controller must approve retention for fault, repair, evidence and audit records before real community data is collected. Update the privacy notice with the controller's legal identity and contact details before a public pilot.

## Run locally

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm security:audit
```

### PostgreSQL integration tests

Use a dedicated disposable database. Never point `TEST_DATABASE_URL` at development or production data.

```powershell
Copy-Item .env.test.example .env.test
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/majifix_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
pnpm db:generate
pnpm db:deploy
pnpm test:integration
```

The integration suite checks the database name before it performs writes. Create the `_test` database and apply the project's existing migration history first.

### Browser end-to-end tests

Install the browser once:

```powershell
pnpm exec playwright install chromium
```

Copy `.env.test.example` to `.env.test`. On a fresh test database, load its settings and seed the simulated accounts and water points:

```powershell
$env:TEST_ENV_FILE = ".env.test"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/majifix_test?schema=public"
pnpm db:deploy
pnpm db:seed
```

The file contains dedicated active, verified demo accounts and their shared test password. Set `E2E_WORKFLOW_FAULT_ID` to the ID of the seeded `MF-DEMO-0001` report, which belongs to the community demo account and references a Kitui water point. Retrieve its ID from Prisma Studio or PostgreSQL. The seeded technician is named `Demo Technician`, is active and covers Kitui. The full workflow test changes the report to `RESTORED`, so recreate the disposable test database and reseed it before repeating the full workflow.

```powershell
pnpm test:e2e
```

The admin/community tests are skipped unless their credentials are supplied. The unauthenticated-route and notification-worker checks run without demo credentials.

### Retention maintenance

Dry-run and inspect the counts first:

```powershell
pnpm db:retention:report
```

Delete eligible records only after review:

```powershell
pnpm db:retention:execute
```

In production, also set `RETENTION_MAINTENANCE_CONFIRM=DELETE_EXPIRED_DATA`. The script never deletes fault reports, repair records, evidence or audit logs.

## Required release review

- [ ] Run every local check and attach the output to the release record.
- [ ] Run integration tests against a disposable PostgreSQL database with the production migration history.
- [ ] Run Playwright role tests with dedicated non-production accounts.
- [ ] Review `pnpm audit --prod` findings and update vulnerable packages before release.
- [ ] Test backup restoration on a separate database.
- [ ] Confirm HTTPS, production origins, trusted proxy configuration, Resend sender verification and worker secret.
- [ ] Replace the privacy page's operational placeholder with the data controller's approved details and retention/legal basis.
- [ ] Complete an independent application and infrastructure security review. Automated checks are not a security certification.
