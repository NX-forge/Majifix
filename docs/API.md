# API and Server Actions

The current MVP uses Next.js Server Actions for authenticated writes rather than exposing a public REST API for every operation. Authorization stays on the server. Better Auth exposes its handler under `/api/auth/*`.

## Authentication endpoints

Better Auth handles these routes under `/api/auth/*`:

- Email sign-up and sign-in.
- Sign-out and session retrieval.
- Email verification and verification-email resend.
- Password-reset request and password reset.
- Password change.
- Session revocation.

The application provides these user-facing pages:

| Page | Purpose | Access |
|---|---|---|
| `/register` | Create a pending community account | Public |
| `/login` | Sign in | Public |
| `/verify-email` | Explain verification and resend the link | Public |
| `/forgot-password` | Request password recovery | Public |
| `/reset-password` | Set a new password using a reset token | Public with valid token |
| `/account/pending` | Explain email verification and administrator approval | Public |
| `/account/suspended` | Explain suspended access | Public |
| `/account/security` | Change password and review/revoke device sessions | Active authenticated user |
| `/team` | Activate accounts, assign roles and suspend users | Active ADMIN |

## Server actions

| Action | Purpose | Access |
|---|---|---|
| `createWaterPointAction` | Register water point and optionally assign it to an active operator | ADMIN, OPERATOR |
| `updateWaterPointAction` | Update water-point details and admin-managed operator assignment | ADMIN or assigned OPERATOR |
| `updateWaterPointStatusAction` | Record a reasoned status change, excluding manual promotion to `OPERATIONAL` | ADMIN or assigned OPERATOR |
| `createFaultReportAction` | Submit fault report | Active authenticated user |
| `assessFaultAction` | Assess, approve or reject report | ADMIN, OPERATOR |
| `assignTechnicianAction` | Assign an active, available technician | ADMIN, OPERATOR |
| `updateRepairStatusAction` | Update repair status | Assigned technician, ADMIN, OPERATOR |
| `confirmRestorationAction` | Confirm service restoration | Original reporter, ADMIN, OPERATOR |
| `setUserRoleAction` | Change role/account status and technician profile | ADMIN |
| `revokeOwnSessionAction` | Revoke another session belonging to the current user | Active authenticated user |

Every action must authenticate the caller, verify role and record ownership, validate submitted values, and write audit records for sensitive changes. Client-side controls are not an authorization boundary.

## Access policy

- Public registration cannot assign a role or activate an account.
- Only email-verified accounts can be activated by an administrator.
- Only `ACTIVE` accounts can create sessions.
- Community members can view only their own fault details and timelines.
- Technicians can update only jobs assigned to them and cannot confirm restoration.
- A community member can confirm only their own fault report.
- Only active technicians can receive new assignments.
- Account role/status changes revoke all target sessions.


## Water-point registry actions

The registry is implemented with authenticated server-rendered pages and server actions.

| Page / action | Access | Behaviour |
|---|---|---|
| `GET /water-points` | Active authenticated users | Search, filter, paginate and browse water points within role scope |
| `GET /water-points/new` | Admin, operator | Show registration form |
| `createWaterPointAction` | Admin, operator | Validate and create a uniquely coded water point, assigning it to the creating operator |
| `GET /water-points/:id` | Active authenticated users within visibility scope | Show water-point details, visible fault history and status history |
| `GET /water-points/:id/edit` | Admin or assigned operator | Show edit form |
| `updateWaterPointAction` | Admin or assigned operator | Validate and update registry details |
| `updateWaterPointStatusAction` | Admin or assigned operator | Record a reasoned manual status change; `OPERATIONAL` requires no active fault reports |

Status changes are written to `WaterPointStatusChange` and `AuditLog` in one database transaction. Successful restoration continues to be handled by `confirmRestorationAction`.

## Fault reporting and evidence

| Page / action | Access | Behaviour |
|---|---|---|
| `GET /faults` | Active authenticated users | Search, filter and paginate reports within the caller's role scope |
| `GET /faults/new` | Admin, operator, community | Show the fault-report form and water points the caller may report against |
| `createFaultReportAction` | Admin, operator, community | Validate, deduplicate, prioritise and create the report, optional evidence and audit records in one transaction |
| `GET /faults/:id` | Report owner, assigned operator, assigned technician, admin | Show report details, score factors, evidence metadata and timeline |
| `GET /api/fault-evidence/:id` | Users allowed to view the related fault | Download private evidence with attachment disposition and no-store caching |
| `assessFaultAction` | Admin or assigned operator | Start assessment, approve or reject with notes |
| `overridePriorityAction` | Admin or assigned operator | Change priority with a mandatory reason |

Evidence uploads accept one JPEG, PNG, WebP or PDF file up to 4 MB. Server-side signature validation is used; the browser-provided MIME type is not trusted.

Fault report submissions are limited to 10 per user per fixed 60-minute window. A likely duplicate active report by the same user, for the same water point and category within 30 minutes, redirects to the existing report.


## Repair management server actions

The repair module is implemented with authenticated server actions and private evidence download routes.

- `assignTechnicianAction`: admin/operator assigns or reassigns a technician. Reassignment requires a reason.
- `acceptRepairAssignmentAction`: assigned technician accepts a pending assignment.
- `declineRepairAssignmentAction`: assigned technician declines with a reason.
- `updateRepairStatusAction`: accepted assigned technician updates work status; manager moves completed work to restoration handover.
- `submitRepairEstimateAction`: accepted assigned technician submits a KES estimate.
- `decideRepairEstimateAction`: admin/operator approves or rejects a pending estimate with a reason.
- `reportRepairDelayAction` and `resolveRepairDelayAction`: record and resolve repair delays.
- `addRepairEvidenceAction`: upload private repair evidence.
- `GET /api/repair-evidence/:id`: authorised private evidence download.

These are server actions rather than public unauthenticated REST endpoints. Every action rechecks the user's role and relationship to the water point or repair job on the server.

## Analytics

`GET /analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` renders the signed-in user's operational metrics for an inclusive date range interpreted in `Africa/Nairobi` time. The page is server-rendered and requires an active authenticated account.

- Administrators see platform-wide metrics.
- Operators see water points assigned to them and reports against those points.
- Technicians see reports and repair jobs assigned to their technician account.
- Community members see only reports they submitted and water points referenced by those reports.

The dashboard includes report volume, active and critical faults, restoration rate, report-to-assignment time, repair duration, report-to-restoration downtime, unresolved repair delays, fault category and priority distributions, status distribution, repeat-report water points, and technician workload for administrators/operators. Missing or reversed timestamps are excluded from duration calculations. The selected range defaults to the most recent 30 calendar days.
