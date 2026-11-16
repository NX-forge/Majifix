# Fault reporting and prioritisation

## Purpose

The fault-reporting module creates a traceable record when a registered community water point develops a fault. It captures the reported impact, suggests an operational priority, and provides the initial record used by the assessment and repair workflow.

The priority engine is a transparent triage aid. It does not diagnose equipment, establish water safety, or replace an operator's judgement.

## Who can report

- `COMMUNITY`: may report a fault against any water point visible in the public registry.
- `OPERATOR`: may report faults only against water points assigned to that operator.
- `ADMIN`: may report faults against any registered water point.
- `TECHNICIAN`: does not create fault reports in this workflow. Technicians update repair jobs assigned to them.

All callers must have an active authenticated account. The server rechecks the water-point ownership before writing the report.

## Report fields

| Field | Validation / meaning |
| --- | --- |
| Water point | Required registered water-point ID |
| Category | Mechanical, pump, electrical, pipe leakage, water-quality concern, low yield or other |
| Description | 10–2,000 characters |
| People affected | Integer from 0 to 1,000,000 |
| Downtime | Integer hours from 0 to 8,760 |
| All service interrupted | Whether the water point has stopped providing all service |
| Alternative water available | Whether affected people have another water source |
| Evidence | Optional single JPEG, PNG, WebP or PDF file, up to 4 MB |

A selected zero-byte file is rejected. Evidence files are signature-checked on the server. The original filename is sanitised. Files are stored in PostgreSQL as private evidence records and can only be downloaded by a user who can view the related fault. Downloads use attachment disposition, `nosniff`, and private no-store caching.

The database-backed file approach is suitable for the bounded MVP upload size. Before scaling to large evidence volumes, move binary objects to private object storage and retain only object keys and metadata in PostgreSQL.

## Duplicate and abuse controls

- A second active report from the same reporter for the same water point and category within 30 minutes is treated as a likely duplicate. The user is directed to the existing report.
- A reporter may submit at most 10 fault reports in a fixed 60-minute window. A per-user database counter uses conditional updates so concurrent requests cannot increment beyond the limit.
- Duplicate detection is a usability safeguard, not a guarantee against concurrent duplicate submissions. Operators should still review similar reports before combining or rejecting them.
- A resolved, rejected or cancelled report does not block a later report for a new incident.

## Priority calculation

The priority score is the sum of the following factors.

| Factor | Condition | Points |
| --- | --- | ---: |
| People affected | 50–199 | 1 |
| People affected | 200–499 | 2 |
| People affected | 500 or more | 3 |
| Health facility | Water point serves a health facility | 3 |
| School | Water point serves a school | 2 |
| Downtime | 6–23 hours | 1 |
| Downtime | 24–71 hours | 2 |
| Downtime | 72 hours or more | 3 |
| Alternative source | No alternative water source is available | 2 |
| Service interruption | All service is interrupted | 2 |

Priority bands:

- `CRITICAL`: 8 points or more.
- `HIGH`: 4–7 points.
- `NORMAL`: 0–3 points.

The school and health-facility factors come from the registered water-point record. Other impact values come from the submitted report. The factor breakdown and score are stored as a snapshot at submission time. The report detail page displays that original snapshot even if the water-point registry is edited later.

An authorised administrator or the operator assigned to the water point may override the priority. An override requires a 10–500 character reason, creates a repair-timeline entry, and writes an audit record. The original numeric score is retained as the calculated score; the current priority field records the operator's decision.

## Water-point status effects

When a report is created, the system examines all active reports for the water point:

- If at least one active report says all service is interrupted, the water point becomes `NON_OPERATIONAL`.
- If active reports exist but none reports a complete interruption, the water point becomes `PARTIALLY_OPERATIONAL`.
- If no active reports remain after a rejection, the system does not assume the water point is operational. Its status is left unchanged until an authorised inspection or restoration confirmation establishes the service state.

Every automatic status change is written to `WaterPointStatusChange` in the same database transaction as the report change.

## Report lifecycle

`REPORTED → UNDER_ASSESSMENT → APPROVED → ASSIGNED → IN_PROGRESS → REPAIR_COMPLETED → AWAITING_CONFIRMATION → RESTORED`

A report can also be `REJECTED` during assessment. A failed restoration confirmation returns it to `REOPENED` for reassignment.

This phase implements report submission, initial prioritisation, evidence, duplicate handling, report filtering, assessment, priority overrides and their audit records. The repair stages remain part of the wider repair-management workflow.

## Access control

| Role | List and detail access | Create | Assess / override | Download evidence |
| --- | --- | --- | --- | --- |
| Admin | All reports | Yes | Yes | All reports |
| Operator | Reports for assigned water points | Yes, assigned points only | Assigned water points only | Assigned water points only |
| Technician | Assigned repair jobs only | No | No | Assigned jobs only |
| Community | Reports submitted by that user | Yes | No | Own reports only |

Access checks run on the server for page queries, server actions and evidence downloads. Hiding a button is not treated as an access-control boundary.

## Operational guidance

1. Reporters should select the closest matching fault category and describe observable symptoms rather than guess at a technical diagnosis.
2. People affected and downtime should be estimates when exact counts are unavailable.
3. Do not mark a water point restored because a repair task was marked complete. Restoration requires the separate confirmation workflow.
4. Treat water-quality concerns as reports requiring appropriate testing. The priority score does not determine whether water is safe to drink.
