# Data Model

## Identity

- `User`: account identity, role, optional phone number and profile relations.
- `Session`: authenticated session with expiry and request metadata.
- `Account`: Better Auth credential/provider account.
- `Verification`: Better Auth verification tokens.
- `TechnicianProfile`: technician skills, service areas and availability.

## Water infrastructure

- `WaterPoint`: unique code, name, type, county, community, estimated people served, critical service dependencies and current operating status.
- `FaultReport`: report reference, water point, reporter, fault category, description, impact inputs, computed priority, status and optional override/rejection reason.

## Repair process

- `RepairJob`: one repair job per fault report, assigned technician, estimate and lifecycle timestamps.
- `RepairUpdate`: append-only timeline entry authored by a user.
- `RestorationConfirmation`: confirmation result, confirming user, notes and timestamp. Multiple confirmations can exist if a reopened repair is attempted again.

## Audit

- `AuditLog`: actor, action, entity, entity ID, optional metadata and timestamp.

## Key integrity rules

- Water-point codes are unique.
- Fault references are unique.
- A fault can have at most one current repair job.
- A repair job references one fault report.
- A technician assignment references a user account. The application checks that the account has the technician role and an available profile before assignment.
- Restoration confirmation requires a repair job and an `AWAITING_CONFIRMATION` report.
- A successful restoration confirmation changes the fault to `RESTORED`; a failed confirmation changes it to `REOPENED`.
- A water point is marked operational only when no other active fault report remains for that water point.

## Deletion policy

Operational records should not be hard-deleted through ordinary UI actions. Before production, define retention and anonymisation rules for user accounts and audit records. The current MVP does not expose deletion screens.
