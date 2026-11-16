# Workflows and State Transitions

## Fault lifecycle

`REPORTED → UNDER_ASSESSMENT → APPROVED → ASSIGNED → IN_PROGRESS → REPAIR_COMPLETED → AWAITING_CONFIRMATION → RESTORED`

Alternative terminal or recovery states: `REJECTED`, `CANCELLED`, `REOPENED`.

## Transition ownership

| From | To | Actor | Required record |
|---|---|---|---|
| REPORTED | UNDER_ASSESSMENT | Operator/Admin | Assessment notes |
| REPORTED or UNDER_ASSESSMENT | APPROVED | Operator/Admin | Assessment notes, optional estimate |
| REPORTED or UNDER_ASSESSMENT | REJECTED | Operator/Admin | Rejection reason |
| APPROVED or REOPENED | ASSIGNED | Operator/Admin | Available technician |
| ASSIGNED | IN_PROGRESS | Assigned technician | Work-start notes |
| IN_PROGRESS | REPAIR_COMPLETED | Assigned technician | Work completion notes |
| REPAIR_COMPLETED | AWAITING_CONFIRMATION | Assigned technician or operator | Repair completion record |
| AWAITING_CONFIRMATION | RESTORED | Reporter or operator | Positive restoration confirmation |
| AWAITING_CONFIRMATION | REOPENED | Reporter or operator | Failed restoration confirmation |

## Important distinction
A technician's statement that work is complete is not proof that the water service is restored. Keep the repair-completed and restoration-confirmed states separate.

## Current implementation boundary
The MVP currently supports the primary path and selected recovery paths. It does not yet provide a full configurable workflow engine, operator priority override interface, cancellation UI or a complete admin role-management console. Treat these as known backlog items, not completed features.


## Fault intake and triage

1. A community reporter, assigned operator or administrator selects a registered water point.
2. The reporter selects a fault category and provides a description, estimated affected population, downtime, service-interruption state and alternative-water availability.
3. The reporter may attach one supported evidence file. The server validates the file signature and size.
4. The server checks the reporter's access to the selected water point, checks for a recent likely duplicate and applies the per-user submission limit.
5. MajiFix calculates a transparent priority score using the published rules and creates a report reference.
6. The report, optional evidence, initial timeline entry, water-point status history and audit record are committed together.
7. An assigned operator or administrator reviews the report, records an assessment and approves or rejects it.
8. An authorised manager may override the suggested priority with a reason. The calculated score remains recorded separately from the chosen priority.
