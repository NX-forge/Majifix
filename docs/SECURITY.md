# Security Checklist

## Authentication and account access
- Better Auth manages password hashing and database-backed sessions.
- Public sign-up always creates a `COMMUNITY` account in `PENDING` status.
- Role and account status are non-input additional fields and are not accepted from public registration.
- Email verification is required before sign-in.
- Administrator activation is required before an account can create a session.
- Session creation checks the current account status in the database.
- Protected server pages re-check the current account status and role.
- Password reset and password change revoke sessions.
- Administrators can suspend accounts with a required reason.
- Account role/status changes revoke all target sessions and create audit records.
- The last active administrator cannot be demoted or suspended.
- Authentication rate limits are stored in PostgreSQL.
- Resend email credentials are required in production.

## Application authorisation
- Every protected server page calls `requireUser`.
- Every server action checks the caller's role and record ownership.
- Community members can view only their own fault reports and timelines.
- Community water-point pages do not expose other reporters' fault history or counts.
- Technicians can update only their assigned repair jobs.
- Technicians cannot confirm restoration.
- Community members can confirm restoration only on their own reports.
- Team management is administrator-only.

## Operational requirements before a real pilot
- Configure the production origin and trusted origins exactly.
- Configure trusted proxy IP headers for production rate limiting.
- Use a verified Resend sender domain and monitor delivery failures.
- Add rate limiting to public write endpoints, not only authentication endpoints.
- Add security headers and a reviewed content security policy.
- Add file upload scanning and strict content/type/size limits before accepting photos.
- Define privacy notice, consent, retention and deletion process.
- Review Kenya Data Protection Act requirements with qualified counsel.
- If county-based delegation is introduced later, add explicit county-level grants without weakening the current assigned-water-point checks.
- Run dependency, application and infrastructure security reviews.
- Run end-to-end tests against a disposable PostgreSQL database.
- Test database backup and restore procedures.

This checklist is not a security certification. Complete a security review before collecting real community data.


## Water-point registry scope

- Admins can manage all water points.
- Operators can manage only water points whose `operatorId` matches their user ID. Administrators assign records to active operators; unassigned records remain admin-managed.
- Technicians can view only water points linked to repair jobs assigned to them.
- Community members can browse the registry but cannot change water-point records.
- Server actions repeat the role and ownership checks. Client-side visibility is not an access boundary.
- Manual status changes require a reason and are recorded in status history and the audit log.
- Generic status editing cannot set a point to `OPERATIONAL` while an active fault remains. Successful restoration confirmation owns that transition. With no active faults, an authorised operator or administrator can record an inspected operational status with a reason.

## Fault report and evidence security

- Fault report creation is restricted to active community, operator and admin accounts.
- Operators can report, view, assess and override only faults for water points assigned to them.
- Community members can view only reports they submitted.
- Technicians can view only repair jobs assigned to them and cannot create or assess fault reports.
- Evidence downloads re-run the same fault visibility policy as the fault detail page.
- Evidence upload size is limited to 4 MB and file signatures are checked for JPEG, PNG, WebP and PDF.
- Evidence is served as an attachment with `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
- Priority overrides require a reason and are recorded in both the repair timeline and audit log.
- Fault report submission has duplicate and per-user rate safeguards.


## Repair workflow controls

- Assignment actions require an active administrator or the operator assigned to the water point.
- Technician assignment checks active account status, technician role, profile availability and service-area coverage.
- Assignment reservation uses a conditional database update so concurrent assignment attempts cannot reserve the same available profile.
- Technicians must accept a pending assignment before starting or completing repair work.
- Reassignment requires a reason and writes assignment history and an audit event.
- Cost decisions require manager authority and a reason.
- Repair delay and evidence actions verify access to the associated repair job.
- Repair evidence downloads are private, use `nosniff`, `no-store` and a restrictive content security policy.
- Technician accounts cannot confirm water restoration.

## Phase 8 hardening

- All routes receive a Content Security Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict referrer policy, a restrictive Permissions Policy and same-origin resource policy.
- Production responses add HSTS and `upgrade-insecure-requests`. Development CSP permits the local Next.js eval and WebSocket tooling only in development.
- Authenticated write actions for water-point creation, edits, status changes, repair-evidence uploads, fault assessment, assignment, repair updates, cost decisions, delays, restoration, priority overrides, account access changes and session revocation use the existing PostgreSQL `RateLimit` table with namespaced keys and conditional updates. Fault submission retains its separate 10-per-hour transactional throttle.
- The notification dispatch endpoint validates its worker bearer secret with a constant-time comparison and rejects missing or short secrets.
- Audit events for business mutations are written inside their business transaction. PostgreSQL integration tests verify fault/audit persistence and transaction rollback.
- `/privacy` describes the current data categories, purposes, access boundaries and default retention periods. The operator must replace the controller/contact placeholder before a public pilot.
- `pnpm db:retention:report` is dry-run only. `pnpm db:retention:execute` deletes only aged notifications, expired sessions, expired verification tokens and stale rate-limit counters. Production execution requires `RETENTION_MAINTENANCE_CONFIRM=DELETE_EXPIRED_DATA`. Fault, repair, evidence and audit records are excluded.
- Integration tests require `TEST_DATABASE_URL` pointing to a disposable database ending in `_test` or `-test`. Browser role tests use dedicated test accounts and must not use production credentials.
