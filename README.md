# MajiFix

MajiFix is a mobile-first repair coordination platform for rural water points. It connects community members, water operators and technicians through a trackable workflow: fault reporting, triage, assessment, assignment, repair updates and community-confirmed restoration.

> Demo records are simulated. The included 24 water points and sample fault scenario are synthetic. They are not evidence of real assets, breakdowns, field visits, pilots or partner commitments.

## Product scope

### Included in this repository
- Email/password authentication using Better Auth.
- Email verification and password reset/recovery.
- Account lifecycle: `PENDING`, `ACTIVE`, `SUSPENDED`.
- Roles: `ADMIN`, `OPERATOR`, `TECHNICIAN`, `COMMUNITY`.
- Admin-controlled account activation, role assignment and suspension.
- Session expiry, device-session review, session revocation and password change.
- Database-backed authentication rate limiting.
- Water-point registry with create, edit, operator assignment, search, filters, pagination and status history.
- Fault reporting with validated inputs, optional private evidence uploads and duplicate safeguards.
- Transparent Critical, High and Normal triage with visible scoring factors and reasoned operator overrides.
- Transparent rule-based priority scoring.
- Assessment and approval/rejection.
- Technician assignment and repair updates.
- Separate restoration confirmation.
- Dashboard, report lists, fault timeline, operational analytics and audit records.
- Admin-only team role management and technician profiles.
- Documented operator priority overrides with mandatory reasons.
- PostgreSQL data model and seed script.
- Unit tests for priority scoring, water-point access policy and water-point validation.

### Deliberately out of the first MVP
SMS/USSD, WhatsApp, live technician matching, AI diagnosis, IoT telemetry, parts inventory, payments and automated notifications. Add these only after the core workflow is validated.

## Technology
- Next.js App Router and React
- TypeScript
- PostgreSQL
- Prisma ORM 7 with the PostgreSQL driver adapter
- Better Auth
- Tailwind CSS 4
- Zod validation
- Vitest

Prisma 7 is used here because the current Prisma Better Auth guide documents the Prisma adapter path against Prisma 7. Prisma 8 is a release candidate in the current documentation and the Prisma guide notes that the Better Auth Prisma adapter path is not yet available for Prisma 8.

## Requirements
- Node.js 24 LTS recommended (Node 22.12+ also meets the current Prisma Better Auth guide requirements).
- pnpm 10 or newer.
- Docker Desktop or a local PostgreSQL 16/17 database.

## Quick start (Windows / PowerShell or Linux / macOS)

1. Install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Generate a secret and update `.env`:

   ```bash
   openssl rand -base64 32
   ```

   Set `BETTER_AUTH_SECRET` to the generated value. Set a strong `SEED_DEMO_PASSWORD` if you intend to load demo users. In production, configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` using a verified sender domain. Local development prints authentication email previews to the server terminal.

4. Start PostgreSQL with Docker:

   ```bash
   docker compose up -d db
   ```

   The default local database URL is `postgresql://postgres:postgres@localhost:5432/majifix?schema=public`. Change it if your local database uses different credentials or a different port.

5. Generate Prisma Client and apply the initial migration:

   ```bash
   pnpm db:generate
   pnpm db:migrate --name init
   ```

6. (Optional) Seed clearly labelled demo data:

   ```bash
   pnpm db:seed
   ```

7. Start the development server:

   ```bash
   pnpm dev
   ```

8. Open `http://localhost:3000`.

## Account approval and administrator bootstrap

1. Public registration creates a `PENDING` community account. It cannot access protected application pages.
2. The user verifies their email using the link sent by MajiFix.
3. The first administrator is bootstrapped through the trusted CLI command below. The email must already be verified.
4. The administrator signs in and opens Team Access to activate other verified accounts and assign their roles.
5. Suspending an account requires a reason and immediately revokes all its sessions.

To create the first production administrator:

1. Register the intended administrator through the normal registration page and verify the email address.
2. Connect to the production database from a trusted deployment/operations environment.
3. Run `pnpm admin:promote admin@example.com` with the registered email address.
4. Sign in and use the Team page to activate the remaining operational accounts.

Never expose this command through a public route or run it with an untrusted email address. The command writes an audit record and activates the verified account.

The promotion script writes an audit record. Never expose this command through a public route or run it with an untrusted email address.

## Demo accounts
After seeding, the following accounts are created. All use the password set in `SEED_DEMO_PASSWORD`.

| Role | Email |
|---|---|
| Admin | `admin@demo.majifix.local` |
| Operator | `operator@demo.majifix.local` |
| Technician | `technician@demo.majifix.local` |
| Community reporter | `community@demo.majifix.local` |

These accounts are for local demonstration only. Do not seed them into a public production environment.

## Core workflow

1. An authenticated community member selects a registered water point and submits a fault.
2. The priority engine scores the report using people affected, service to a school or health facility, downtime, alternative water availability and full service interruption.
3. An operator assesses and approves or rejects the report with notes.
4. An operator assigns an available technician.
5. The technician records work progress and marks the repair completed.
6. The status moves to `AWAITING_CONFIRMATION`.
7. The reporter or an authorised operator confirms whether water service has returned.
8. Only a positive confirmation changes the fault to `RESTORED` and updates the water point to `OPERATIONAL`. A negative confirmation reopens the report.

## Priority rules

| Signal | Points |
|---|---:|
| 50–199 people affected | 1 |
| 200–499 people affected | 2 |
| 500+ people affected | 3 |
| School served | 2 |
| Health facility served | 3 |
| 6–23 hours downtime | 1 |
| 24–71 hours downtime | 2 |
| 72+ hours downtime | 3 |
| No alternative water available | 2 |
| All service interrupted | 2 |

- `CRITICAL`: 8 or more points.
- `HIGH`: 4–7 points.
- `NORMAL`: 0–3 points.

The score is a transparent triage aid, not a scientific measure of harm or an automated diagnosis. An authorised operator or administrator can override a report priority by selecting a new level and recording a reason. The override is recorded in the repair timeline and audit log.

## Roles and access

- `COMMUNITY`: create reports, view own reports and confirm restoration only on own report.
- `TECHNICIAN`: view assigned reports and update the repair stages assigned to them. Technicians cannot confirm restoration.
- `OPERATOR`: manage water points, assess reports, assign technicians, update repair workflow and confirm restoration.
- `ADMIN`: same operational access as operator plus team and account administration.

New self-registered accounts default to `COMMUNITY` and `PENDING`. They must verify their email and receive administrator activation before they can create a session. Role and account status are server-controlled fields and cannot be supplied during public registration. Account status changes and role changes revoke existing sessions. The platform prevents demoting or suspending the last active administrator.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The project includes unit tests for priority scoring and access-control policies. Before production, add browser-based end-to-end tests for the complete multi-role workflow and test authentication/database transactions against a disposable PostgreSQL test database. Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` after installing dependencies and applying migrations.

## Deployment outline

1. Provision managed PostgreSQL with automated backups and TLS.
2. Deploy the Next.js app to a Node.js-compatible host (Vercel, Render, Railway or a managed container host).
3. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` in the hosting environment. Use a unique secret per environment.
4. Run `pnpm db:deploy` as a release step before serving the new application version.
5. Run `pnpm build` and `pnpm start`.
6. Configure a custom domain and HTTPS.
7. Disable demo seeding and remove demo accounts before public launch.
8. Configure Resend with a verified sender domain before opening public registration.
9. Configure the exact production origin in `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_TRUSTED_ORIGINS`.
9. Set up error monitoring, structured logs, backups, restore drills and an incident contact.

Do not run `prisma migrate dev` against production. Use `prisma migrate deploy`.

## Security and operational work before a real pilot

This repository is a substantial MVP foundation, not a security certification or a completed field deployment. Before collecting real community data:
- Validate email delivery, account approval and password recovery with the production email provider.
- Add rate limiting to public write endpoints in addition to the Better Auth authentication endpoints.
- Add CSRF/origin review, security headers, abuse monitoring and upload controls before accepting evidence files.
- Review data minimisation, retention, consent and Kenya Data Protection Act obligations.
- Add explicit operator scope restrictions by assigned county/water point.
- Add full status-transition policy tests and end-to-end tests.
- Validate the priority rules with local water operators and communities.
- Confirm water-point ownership, permissions and applicable regulatory requirements before a pilot.
- Use a pilot to measure reporting delay, assignment time, response time, repair duration, downtime, restoration rate and repeat failures.

## Repository map

```text
majifix/
├── prisma/              # Database schema and seed data
├── public/              # Static assets
├── src/
│   ├── app/              # Routes, pages and auth API handler
│   ├── components/       # Shared UI and auth components
│   ├── generated/        # Generated Prisma Client (created by db:generate)
│   └── lib/              # Auth, database, validation, business rules and actions
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── prisma.config.ts
└── README.md
```

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Workflows and state transitions](docs/WORKFLOWS.md)
- [Server actions and authentication routes](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Security checklist](docs/SECURITY.md)
- [Authentication and account access](docs/AUTHENTICATION.md)
- [Water-point registry](docs/WATER_POINTS.md)
- [Fault reporting and prioritisation](docs/FAULT_REPORTING.md)
- [Phase 4 acceptance checklist](docs/PHASE_4_ACCEPTANCE.md)
- [Repair management](docs/REPAIR_MANAGEMENT.md)
- [Phase 5 acceptance checklist](docs/PHASE_5_ACCEPTANCE.md)
- [Testing strategy](docs/TESTING.md)
- [Demo walkthrough](docs/DEMO_GUIDE.md)
- [Operations runbook](docs/OPERATIONS.md)

## Product status

The generated repository provides the initial full-stack MVP code and operational workflow. It has not been connected to your production database, deployed, independently penetration-tested or field-validated. Run the quality checks in your environment, then work through the pre-pilot checklist before real use.


## Repair management

See [`docs/REPAIR_MANAGEMENT.md`](docs/REPAIR_MANAGEMENT.md) for technician assignment, job acceptance, cost estimates, delay tracking, evidence handling and restoration handover. The Phase 5 verification checklist is in [`docs/PHASE_5_ACCEPTANCE.md`](docs/PHASE_5_ACCEPTANCE.md).

## Analytics

MajiFix includes role-scoped operational analytics. Administrators see platform-wide activity, operators see their assigned water points, technicians see their assigned repair work, and community users see their own submitted reports. Date filters use `Africa/Nairobi` calendar dates. See [`docs/ANALYTICS.md`](docs/ANALYTICS.md) for metric definitions, access scope, data limitations and verification steps.
