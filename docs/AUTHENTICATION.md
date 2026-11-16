# MajiFix Authentication and Account Access

## Overview

MajiFix uses Better Auth for email/password authentication and PostgreSQL-backed sessions. Prisma 7 is the database adapter. Public registration never accepts a role or account status from the browser.

## Account lifecycle

1. A person registers with their name, email, password and optional phone number.
2. Better Auth creates a `COMMUNITY` account with `PENDING` status.
3. MajiFix sends a one-hour email verification link.
4. The person verifies the email address.
5. An administrator reviews the account and changes its status to `ACTIVE` from Team Access.
6. The user can sign in and access pages permitted by their role.

A verified email does not automatically activate an account. An administrator must approve it.

## Account statuses

| Status | Meaning | Can create a session |
| --- | --- | --- |
| `PENDING` | Registration or approval is incomplete | No |
| `ACTIVE` | Account is approved | Yes |
| `SUSPENDED` | Administrator has disabled access | No |

The session creation database hook checks the account status. Protected server pages also check the status. When an administrator changes role or status, MajiFix revokes all existing sessions for that account.

Suspension requires a reason between 10 and 500 characters. The reason is retained on the account and in the audit log.

## Roles

| Role | Access |
| --- | --- |
| `COMMUNITY` | Submit faults, view own fault records and confirm restoration on own reports |
| `TECHNICIAN` | View assigned repair jobs and update their repair progress |
| `OPERATOR` | Manage water points, assess reports, assign technicians, manage repair workflow and confirm restoration |
| `ADMIN` | Operator permissions plus team and account administration |

Technicians cannot confirm restoration. Community members cannot view another reporter's fault detail or timeline. A community member can browse the water-point registry to select a point when reporting a fault; the registry does not expose other reporters' fault timelines or counts.

## Administrator safeguards

- Public sign-up cannot set `role` or `accountStatus`.
- Only an active administrator can update another account's role or status.
- Administrators cannot change their own role or status through Team Access.
- The last active administrator cannot be demoted or suspended.
- An account cannot be activated until its email is verified.
- A technician with active repair assignments cannot be changed to a different role.
- Role and account-status changes are recorded in `AuditLog`.
- All sessions for the target account are revoked after an access change.

The first administrator is bootstrapped with `pnpm admin:promote admin@example.com`. The command requires an existing, email-verified user and writes an audit record. Run it only from a trusted operations environment.

## Password lifecycle

- Passwords must contain 10–128 characters.
- Better Auth hashes passwords using its built-in password hashing implementation.
- Password reset links expire after 30 minutes.
- Password reset revokes all active sessions.
- Password changes require the current password and revoke other sessions.
- Reset requests return a generic response to avoid revealing whether an email address is registered.

## Session lifecycle

- Sessions are stored in PostgreSQL.
- Session lifetime is 12 hours after the last refresh.
- Session refresh occurs after one hour of age while the session is active.
- Session freshness is five minutes for operations that require a fresh session in Better Auth.
- Users can review their active sessions and revoke another device from Account Security.
- Signing out ends the current session.
- Administrator access changes revoke all sessions for the affected user.

Cookie caching is intentionally disabled so that database revocation takes effect without waiting for a cached session to expire.

## Rate limiting

Better Auth rate limiting is enabled in development and production and stored in PostgreSQL:

| Endpoint | Limit |
| --- | --- |
| General authentication endpoints | 100 requests per 60 seconds |
| Email sign-in | 5 requests per 60 seconds |
| Email sign-up | 5 requests per 10 minutes |
| Password reset request | 3 requests per 10 minutes |
| Verification email resend | 3 requests per 10 minutes |

The limits are per client IP according to Better Auth's configured IP detection. Production proxy configuration must ensure that forwarded IP headers are set by trusted infrastructure, not accepted from arbitrary clients.

## Email delivery

MajiFix sends verification and password-reset email through Resend using the REST API.

Required production variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_SECRET`

The sender domain must be verified with Resend. The production application fails during auth initialization if the Resend credentials are missing. Local development without Resend prints an email preview to the server terminal so the developer can open the generated link manually.

## Database migration

After updating the Prisma schema, generate the client and create/apply the migration:

```bash
pnpm db:generate
pnpm db:migrate --name init
```

On a brand-new database, this first migration includes the complete current schema, including account status fields and the Better Auth `rateLimit` table. If a prior migration history already exists, create a follow-up migration with a distinct name instead of reusing `init`. On an existing database that already contains tables but has no migration history, reconcile the database state before applying a migration. Do not blindly apply an initial migration over existing tables.

## Verification checklist

- [ ] Registration creates a `PENDING` community account.
- [ ] A public request cannot set `ADMIN`, `OPERATOR`, `TECHNICIAN` or `ACTIVE`.
- [ ] An unverified account cannot sign in.
- [ ] A verified but pending account cannot create a session.
- [ ] An active account can sign in.
- [ ] A suspended account cannot sign in.
- [ ] Suspension revokes every active session.
- [ ] Role changes revoke every active session.
- [ ] The last active administrator cannot be demoted or suspended.
- [ ] A community member cannot open another reporter's fault detail.
- [ ] A technician cannot confirm water restoration.
- [ ] A community member can confirm restoration only for their own report.
- [ ] Password reset links expire and reset requests do not disclose account existence.
- [ ] Password reset revokes sessions.
- [ ] Users can revoke another device session.
- [ ] Authentication rate limits are persisted in PostgreSQL.
