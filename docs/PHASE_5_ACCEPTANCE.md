# Phase 5 Acceptance Checklist

## Technician assignment

- [ ] Admin/operator assigns an active, available technician.
- [ ] Service-area matching accepts matching county/sub-county or explicit `ALL`; an empty list must not qualify.
- [ ] Assignment reservation prevents two managers from assigning the same available technician concurrently.
- [ ] Technician can accept a pending assignment.
- [ ] Technician can decline with a reason and the fault returns to `APPROVED`.
- [ ] Admin/operator can reassign an existing job with a reason.
- [ ] Assignment history records each assignment and end time.

## Repair work

- [ ] Only the assigned technician with an accepted assignment can start work.
- [ ] Only that technician can mark repair work completed.
- [ ] Pending/rejected submitted estimates block work until resolved.
- [ ] Open repair delays block completion and must be resolved.
- [ ] Admin/operator reviews completion and sends the job for restoration confirmation.
- [ ] Community/operator restoration confirmation remains a separate step.

## Cost estimate

- [ ] Assigned technician submits a non-negative KES estimate with notes.
- [ ] Estimate is pending until a manager decision.
- [ ] Only the assigned operator/admin can approve or reject it.
- [ ] Decision requires a reason and records the actor.
- [ ] Reassignment clears stale estimate and approval values.

## Delays and evidence

- [ ] Technician/operator records a delay during active work.
- [ ] Spare-parts delay requires part name and supports quantity/supplier.
- [ ] Expected resolution date must be valid and future-dated.
- [ ] Authorised users resolve open delays with notes.
- [ ] Repair evidence signature and size checks are enforced.
- [ ] Evidence download checks the caller's access to the repair.

## Verification

- [ ] Prisma schema validation.
- [ ] Prisma Client generation.
- [ ] TypeScript check.
- [ ] ESLint.
- [ ] Unit tests.
- [ ] Database migration on a disposable development database.
- [ ] Browser end-to-end tests for assignment, work, cost, delay and restoration handover.
- [ ] Production build.
