# Deployment Guide

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `BETTER_AUTH_SECRET` | Yes | Random secret, at least 32 characters |
| `BETTER_AUTH_URL` | Yes | Canonical application URL used by Better Auth |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application origin |
| `RESEND_API_KEY` | Yes in production | Resend API key for verification and recovery email |
| `RESEND_FROM_EMAIL` | Yes in production | Sender identity from a verified Resend domain |
| `NOTIFICATION_WORKER_SECRET` | Yes for scheduled notifications | Random bearer secret of at least 32 characters for the email dispatcher |
| `NOTIFICATION_RETENTION_DAYS` | Optional | Notification retention period, default 365 days |
| `EXPIRED_SESSION_RETENTION_DAYS` | Optional | Expired session retention after expiry, default 30 days |
| `EXPIRED_VERIFICATION_RETENTION_DAYS` | Optional | Expired verification-token retention, default 30 days |
| `RATE_LIMIT_RETENTION_DAYS` | Optional | Stale rate-limit counter retention, default 7 days |
| `RETENTION_MAINTENANCE_CONFIRM` | Production deletion only | Must equal `DELETE_EXPIRED_DATA` for explicit production cleanup |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional | Comma-separated additional trusted browser origins |
| `SEED_DEMO_PASSWORD` | Only for seed | Password used for local demo accounts |

## Release steps

1. Create managed PostgreSQL and enable backups/TLS.
2. Set production environment variables in the hosting provider.
3. Build the application in CI.
4. Run `pnpm db:deploy` as a release migration step.
5. Start the Next.js server.
6. Configure a scheduler to POST to `/api/notifications/dispatch` with `Authorization: Bearer <NOTIFICATION_WORKER_SECRET>` at a short interval.
7. Verify registration, email verification, administrator activation, login, password reset, session revocation, role restrictions, notifications, water-point creation, fault submission and the complete repair-confirmation workflow.
8. Confirm monitoring, backup restore and rollback procedures.

## Production rules

- Never commit `.env`.
- Never use the local default PostgreSQL password in production.
- Never seed demo accounts into production.
- Never use `prisma migrate dev` against production.
- Require HTTPS and a strong unique auth secret.
- Configure Resend with a verified sender domain for verification, password reset and notification email before public registration.
- Keep `NOTIFICATION_WORKER_SECRET` private. Configure it only in the server environment and the trusted scheduler. Do not put it in client-side variables.
- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the exact production origin. Add only approved additional origins to `BETTER_AUTH_TRUSTED_ORIGINS`.
- Configure trusted proxy IP headers for Better Auth rate limiting. Never trust arbitrary client-supplied forwarding headers.
- Review hosting provider support for Next.js server actions, persistent connections and Prisma PostgreSQL adapters.

## Phase 8 security and privacy configuration

- Confirm the production CSP against the exact external services enabled by the deployment. The default policy intentionally permits same-origin scripts and inline Next.js hydration, but does not permit `unsafe-eval` in production.
- Serve the application only over HTTPS. HSTS is enabled in production responses.
- Apply action rate limits through the PostgreSQL `RateLimit` table. Keep this table available and schedule periodic retention maintenance.
- Before collecting real user data, complete the `/privacy` page with the data controller's identity, contact details, lawful basis and approved retention schedule.
- Review the default retention periods with the data controller. Run `pnpm db:retention:report` before any deletion. Production execution requires `RETENTION_MAINTENANCE_CONFIRM=DELETE_EXPIRED_DATA` and the explicit `--execute` command.
- Run PostgreSQL integration tests only against a disposable `_test` database. Run Playwright against a local or dedicated staging environment with test accounts.
- Review `pnpm audit --prod` and resolve production dependency advisories before release.
