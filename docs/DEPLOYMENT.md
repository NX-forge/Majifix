# Deployment Guide

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `BETTER_AUTH_SECRET` | Yes | Random secret, at least 32 characters |
| `BETTER_AUTH_URL` | Yes | Canonical application URL used by Better Auth |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application origin |
| `SEED_DEMO_PASSWORD` | Only for seed | Password used for local demo accounts |

## Release steps

1. Create managed PostgreSQL and enable backups/TLS.
2. Set production environment variables in the hosting provider.
3. Build the application in CI.
4. Run `pnpm db:deploy` as a release migration step.
5. Start the Next.js server.
6. Verify login, logout, water-point creation, fault submission and the complete repair-confirmation workflow.
7. Confirm monitoring, backup restore and rollback procedures.

## Production rules

- Never commit `.env`.
- Never use the local default PostgreSQL password in production.
- Never seed demo accounts into production.
- Never use `prisma migrate dev` against production.
- Require HTTPS and a strong unique auth secret.
- Configure a real email provider for verification and password reset before public registration.
- Review hosting provider support for Next.js server actions, persistent connections and Prisma PostgreSQL adapters.
