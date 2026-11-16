# Architecture

## Application shape

MajiFix is a modular monolith. The Next.js application serves the web interface, authentication handler and server-side mutations. PostgreSQL is the system of record.

```text
Browser (mobile or desktop)
        |
        v
Next.js App Router
  |-- Server Components: dashboard, registry, report details, analytics
  |-- Client Components: authentication forms, sign-out interaction
  |-- Server Actions: validated and role-checked mutations
  |-- Better Auth: sign-up, sign-in, session handling
        |
        v
Prisma ORM 7 + PostgreSQL driver adapter
        |
        v
PostgreSQL
  |-- identity and sessions
  |-- water-point registry
  |-- faults and repair jobs
  |-- restoration confirmations
  |-- audit records
```

## Architectural decisions

- One deployable application keeps the MVP simple to run and maintain.
- PostgreSQL stores relational records and enforces unique identifiers and foreign keys.
- Prisma provides typed database access and versioned migrations.
- Better Auth owns password hashing and session lifecycle.
- Server Actions own mutations so role checks and validation run on the server.
- Zod validates form values before database writes.
- Audit records capture important operational changes.
- The priority engine is a pure TypeScript function and can be tested independently.

## Trust boundaries

1. The browser is untrusted. Never rely on hidden fields, disabled controls or client-side validation for access control.
2. Every server action must load the current session and check the required role.
3. Every entity lookup must enforce ownership or assignment scope where relevant.
4. The database is the authoritative source for roles, assignment and workflow status.
5. Demo seed data is synthetic and must not be presented as field evidence.

## Runtime and deployment

The application requires a Node.js runtime and PostgreSQL. It is designed for a managed PostgreSQL service and a Next.js-compatible host. Run migrations as a release step. Do not run development migrations against production.

## Scaling path

Keep the modular monolith until measured workload or team boundaries justify separation. If background notifications, scheduled reminders or bulk imports become necessary, introduce a managed queue and worker as a separate process without splitting the core domain prematurely.
