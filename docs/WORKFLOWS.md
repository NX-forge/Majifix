# Workflows and State Transitions

## Fault lifecycle

`REPORTED → UNDER_ASSESSMENT → APPROVED → ASSIGNED → IN_PROGRESS → REPAIR_COMPLETED → AWAITING_CONFIRMATION → RESTORED`

Alternative terminal or recovery states: `REJECTED`, `CANCELLED`, `REOPENED`.

## Transition ownership

| From | To | Actor | Required record |
| --- | --- | --- | --- |
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
