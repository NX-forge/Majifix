# Testing Strategy

## Automated checks
- `pnpm typecheck` – TypeScript diagnostics.
- `pnpm lint` – ESLint.
- `pnpm test` – Vitest unit tests.
- `pnpm build` – production build and Prisma generation.

## Phase 2 authentication acceptance scenarios
1. Registration creates a `COMMUNITY` account in `PENDING` status.
2. Public registration cannot set a role or account status.
3. Unverified accounts cannot sign in.
4. Verified but pending accounts cannot create a session.
5. Active, verified accounts can sign in.
6. Suspended accounts cannot create a session.
7. Account suspension revokes all existing sessions.
8. Role changes revoke all existing sessions.
9. The last active administrator cannot be demoted or suspended.
10. An account cannot be activated before email verification.
11. Password reset links expire and reset requests do not disclose account existence.
12. Password reset revokes all active sessions.
13. Password change requires the current password and revokes other sessions.
14. Users can revoke another session that belongs to them.
15. A user cannot revoke a session belonging to another user.
16. Authentication rate limits are stored in PostgreSQL.
17. A community user cannot access another reporter's fault detail or timeline.
18. A technician cannot confirm restoration.
19. A community member can confirm restoration only on their own report.
20. A suspended technician cannot receive a new repair assignment.

## Existing domain acceptance scenarios
1. A visitor cannot open protected dashboard routes.
2. A technician cannot access or update a job assigned to another technician.
3. A fault cannot be approved without assessment notes.
4. A technician cannot skip from `ASSIGNED` directly to `RESTORED`.
5. Repair completion moves to awaiting confirmation, not restored.
6. A positive confirmation sets the report to `RESTORED` and water point to `OPERATIONAL`.
7. A negative confirmation reopens the report.
8. An unavailable or non-technician account cannot receive an assignment.

## Current automated coverage

Vitest contains unit tests for priority scoring and factor snapshots, pure access-control policies, and evidence file validation. The repository still requires database-backed authentication tests and browser end-to-end tests for the scenarios above. A written acceptance scenario is not evidence that the scenario has already passed.

Run the full check suite after dependencies are installed and the Prisma migration is applied:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```


## Phase 4 fault reporting acceptance scenarios
1. Only active community, operator and admin accounts can submit reports.
2. An operator can report only against water points assigned to that operator.
3. A report must reference an existing water point and pass server-side field validation.
4. A report receives a unique human-readable reference.
5. A same-reporter, same-water-point, same-category active report in the prior 30 minutes is detected as a likely duplicate.
6. A user cannot submit more than 10 reports in a fixed 60-minute window.
7. Priority is calculated from people affected, registered school/health-facility dependencies, downtime, alternative-source availability and full-service interruption.
8. The report detail page displays every factor contributing to the score.
9. An operator can assess, approve, reject and override priority only for assigned water points.
10. A priority override requires a reason and is written to the repair timeline and audit log.
11. Only JPEG, PNG, WebP and PDF evidence with matching file signatures can be uploaded, with a 4 MB limit.
12. Evidence downloads are restricted to users who can view the parent fault.
13. Community users see only their own reports; technicians see only assigned repair jobs.
14. A rejected report does not automatically mark a water point operational.
15. Automatic water-point status changes are recorded with a reason and actor.

## Phase 4 unit-test coverage
- Priority thresholds and factor breakdown.
- Role-specific report visibility, management and submission policies.
- Evidence file signature, size and filename validation.


## Phase 5 tests

`src/__tests__/repair-policy.test.ts` covers manager scope, technician assignment ownership, acceptance requirements, allowed technician status transitions, service-area matching, estimate bounds, pending/rejected estimate gates, service-area matching and repair-note length. Database integration and browser end-to-end tests are still required against a disposable PostgreSQL database.
