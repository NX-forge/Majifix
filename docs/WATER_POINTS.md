# Water-point registry

## Purpose

The registry is the source of truth for community water infrastructure used by MajiFix fault reports and repair workflows. Each record has a unique code, a name, an infrastructure type, an administrative location and an estimated population served.

## Supported water-point types

- Borehole
- Handpump
- Motorised system
- Spring
- Other

## Registry fields

| Field | Rule |
| --- | --- |
| Code | Required, 2–30 characters, letters/numbers/hyphens, stored uppercase and unique |
| Name | Required, 3–120 characters |
| Type | Required enum value |
| County | Required, 2–80 characters |
| Sub-county | Optional, up to 80 characters |
| Community / village | Optional, up to 100 characters |
| Latitude | Optional, numeric and within the configured Kenya bounds |
| Longitude | Optional, numeric and within the configured Kenya bounds |
| People served | Integer from 0 to 1,000,000 |
| School served | Boolean |
| Health facility served | Boolean |
| Alternative water available | Boolean |
| Notes | Optional, up to 2,000 characters |

Coordinates must be supplied as a pair. The current validation bounds are latitude -4.8 to 5.5 and longitude 33.5 to 42.5. These are broad Kenya bounds for input validation, not a substitute for checking a field location.

## Roles and registry visibility

- Administrators can view and manage every water point.
- Operators can view and manage only water points assigned to their user account (`operatorId`). A newly registered water point created by an operator is assigned to that operator. Administrators can assign a point to an active operator or leave it unassigned for admin-only management.
- Technicians can view only water points with repair jobs assigned to them.
- Community users can browse the public water-point registry but cannot edit registry records.

All management restrictions are enforced in server-side page queries and server actions. Hiding an edit link is not treated as an access-control mechanism.

## Status management

Water-point statuses are:

- `UNKNOWN`
- `OPERATIONAL`
- `PARTIALLY_OPERATIONAL`
- `NON_OPERATIONAL`

An administrator or assigned operator can manually record `UNKNOWN`, `PARTIALLY_OPERATIONAL` or `NON_OPERATIONAL`, with a reason of at least 10 characters. They can also verify `OPERATIONAL` after an inspection when no active fault report remains. Every manual change creates a `WaterPointStatusChange` record containing the previous status, new status, reason, actor and timestamp. The same action is written to the audit log. When multiple faults are active, any full service interruption keeps the water point non-operational until the remaining fault is resolved or closed.

Manual status editing cannot set a point to `OPERATIONAL` while an active fault report remains. For an active repair, that status is reached only after a positive restoration confirmation. When no active fault remains, an authorised administrator or assigned operator may record a verified inspection. Fault reporting and successful restoration also create status-history entries when they change the water-point status.

## Search and filters

The registry supports case-insensitive search across code, name, county, sub-county and community. Users can filter by county, infrastructure type and operational status. Results are ordered by county and name and paginated at 10 records per page.

## Fault history

Water points are related to fault reports. The detail page shows the latest 10 reports visible to the current role and the latest 10 water-point status changes, including changes caused by fault reporting and restoration. Community users see only reports they submitted. Technicians see only reports linked to jobs assigned to them. Administrators and operators see the full fault history for records in their access scope.

## Data integrity

- Water-point codes are unique and normalised to uppercase.
- Fault reports reference a water point using a required foreign key.
- A water point with fault reports cannot be deleted by cascading deletion of those reports.
- Status changes are append-only history records from the application workflow.
- Do not place real personal data or unverified location coordinates in simulated demo records.

## Database setup

The project repository currently uses Prisma schema-driven initial migration setup. After installing dependencies and configuring `DATABASE_URL`, run:

```bash
pnpm db:generate
pnpm db:migrate --name init
```

For an existing database, inspect its migration history and schema before applying migrations. Do not reset a database containing real records.
