# Data Model

## Identity

- `User`: account identity, role, optional phone number and profile relations.
- `Session`: authenticated session with expiry and request metadata.
- `Account`: Better Auth credential/provider account.
- `Verification`: Better Auth verification tokens.
- `TechnicianProfile`: technician skills, service areas and availability.

## Water infrastructure

- `WaterPoint`: unique code, name, type, county, sub-county, community, optional latitude/longitude, estimated people served, school/health-facility dependencies, alternative-water availability, notes, assigned operator and current operating status.
- `WaterPointStatusChange`: append-only status history with previous/new status, reason, actor and timestamp.
- `FaultReport`: report reference, water point, reporter, fault category, description, impact inputs, computed priority, immutable priority score/factor snapshot, status and optional override/rejection reason.
- `FaultEvidence`: private, bounded-size evidence file metadata and bytes, linked to one fault report and uploader. Evidence downloads are authorised through the parent fault access policy.
- `FaultSubmissionWindow`: per-user fixed-window submission counter used to enforce the fault-report rate limit atomically.

## Repair process

- `RepairJob`: one repair job per fault report, assigned technician, assignment response, estimate review and lifecycle timestamps.
- `RepairAssignmentHistory`: assignment/reassignment history with technician, assigning actor, assignment end time and end reason.
- `RepairDelay`: delay reason, description, optional spare-part/supplier details, expected resolution and resolution notes.
- `RepairEvidence`: private JPEG/PNG/WebP/PDF evidence and metadata linked to a repair job.
- `RepairUpdate`: append-only timeline entry authored by a user.
- `RestorationConfirmation`: confirmation result, confirming user, notes and timestamp. Multiple confirmations can exist if a reopened repair is attempted again.

## Audit

- `AuditLog`: actor, action, entity, entity ID, optional metadata and timestamp.

## Key integrity rules

- Water-point codes are unique.
- Fault references are unique.
- Evidence belongs to one fault report and is removed if that report is deleted. Evidence is not publicly addressable.
- A fault can have at most one current repair job.
- A repair job references one fault report.
- A technician assignment references a user account. The application checks that the account has the technician role, an active account, an available profile and a matching service area before assignment.
- A technician must accept an assignment before starting repair work.
- A repair estimate remains pending until an authorised manager approves or rejects it with a reason.
- Reassignment requires a reason and records assignment history.
- Repair evidence is private and requires authorised access to the parent repair job.
- Restoration confirmation requires a repair job and an `AWAITING_CONFIRMATION` report.
- A successful restoration confirmation changes the fault to `RESTORED`; a failed confirmation changes it to `REOPENED`.
- A water point is marked operational only when no other active fault report remains for that water point.

## Deletion policy

Operational records should not be hard-deleted through ordinary UI actions. Before production, define retention and anonymisation rules for user accounts and audit records. The current MVP does not expose deletion screens.


## WaterPointStatusChange

Append-only status history for a water point. Stores `waterPointId`, `previousStatus`, `newStatus`, a required reason, `changedById` and `createdAt`. The history is indexed by water point and timestamp. A matching audit log entry is written for manual status changes. Fault-report and restoration-driven status changes also create history records and are associated with their fault workflow audit events.
