# Changelog

## 1.0.0 – Initial project scaffold
- Added Next.js App Router application and responsive base UI.
- Added PostgreSQL schema with Better Auth models and MajiFix domain models.
- Added Better Auth email/password authentication.
- Added role-aware dashboard, water-point registry and fault workflow.
- Added transparent priority scoring and tests.
- Added repair assignment, progress updates and restoration confirmation.
- Added priority override with a mandatory reason.
- Added administrator team and technician profile management.
- Added analytics and synthetic seed data for 24 water points.
- Added seed data clearly marked as simulated.
- Added setup, product, architecture, data model, workflow, API, deployment, operations, demo, security and testing documentation.

## 1.1.0 – Authentication and access control
- Added `PENDING`, `ACTIVE` and `SUSPENDED` account lifecycle states.
- Required email verification and administrator activation before sign-in.
- Added Resend-backed verification and password-reset email delivery.
- Added password reset, password change and session revocation screens.
- Added database-backed Better Auth rate limiting.
- Added administrator account activation, suspension reasons and role management.
- Added protection against removing the last active administrator.
- Revoked sessions after role or account-status changes.
- Added active-account checks to session creation and protected server routes.
- Restricted community fault details to their own reports.
- Restricted restoration confirmation to administrators, operators and the original reporter.
- Prevented suspended technicians from receiving new repair assignments.
- Added access-control unit tests and authentication documentation.
- Renamed the Prisma 7 configuration file to the CLI-discovered `prisma.config.ts`.


## 1.2.0 – Water-point management
- Added water-point edit workflow with server-side ownership checks.
- Added county, infrastructure type, status and text search filters.
- Added stable 10-record pagination and registry summary counts.
- Added optional Kenya-bounded coordinate capture with paired-coordinate validation.
- Added operational notes and improved registry detail views.
- Added operator-scoped and technician-assignment-scoped registry visibility.
- Added administrator-controlled assignment of water points to active operators.
- Added append-only water-point status history and transactional audit records.
- Prevented manual promotion to operational while an active fault remains; permits reasoned operational verification after inspection when no active fault exists.
- Recorded automatic water-point status changes caused by fault reports and successful restoration confirmations.
- Added water-point access-policy and input-validation unit tests.
- Added water-point registry documentation and updated API, data model, security and README documentation.

## [1.3.0] - Phase 4: Fault reporting and prioritisation

### Added
- Fault report form with validated category, description, population impact, downtime, alternative source and service interruption fields.
- Optional private evidence attachment for JPEG, PNG, WebP and PDF files up to 4 MB.
- Server-side file signature validation and role-protected evidence downloads.
- Transparent priority factor breakdown and documented Critical, High and Normal thresholds.
- Duplicate report detection within a 30-minute window and a 10-report-per-hour user safeguard.
- Search, priority, status and category filters with pagination on the fault register.
- Report-level access policies for administrators, assigned operators, technicians and community reporters.
- Service-area validation for technician assignment.
- Fault reporting, assessment, assignment, repair updates, priority overrides and restoration confirmations audited transactionally.
- Fault reporting documentation and automated tests for prioritisation, access policy and evidence validation.

### Changed
- Operator access to fault reports is now scoped to their assigned water points.
- Technicians cannot create fault reports and can access only assigned repair jobs.
- Rejected fault reports no longer imply that a water point has become operational.


## [1.4.0] - Phase 5 Repair Management

### Added
- Technician job workspace with assignment acceptance and reasoned decline.
- Assignment history and reasoned technician reassignment.
- Technician repair estimates with manager approval/rejection and audit trail.
- Repair delay tracking, including spare-parts, supplier, quantity and expected resolution details.
- Private repair evidence uploads and authorised downloads.
- Repair policy unit tests and repair management documentation.

### Changed
- Repair status transitions now require an accepted technician assignment.
- Only administrators/assigned operators can hand completed repairs over for restoration confirmation.
- Technician availability is reserved for pending assignments and released when work/assignments conclude, subject to other open jobs.
- Reassignment clears estimates from the previous technician to prevent stale cost approvals.

## [1.5.0] - Phase 6: dashboards and analytics

### Added
- Role-scoped operational analytics for administrators, operators, technicians and community reporters.
- Inclusive date filtering interpreted in `Africa/Nairobi` time, with a 30-calendar-day default.
- Water-point, report volume, active fault, critical fault and restoration-rate metrics.
- Report-to-assignment, repair-duration and report-to-restoration downtime summaries.
- Fault category, priority and status distributions.
- Six-bucket report activity chart, repeat-report water-point table and unresolved repair-delay count.
- Technician workload breakdown for administrators and operators.
- Explicit metric definitions, data-quality limitations and analytics test coverage.

### Changed
- Dashboard aggregate queries now respect operator, technician and community access scopes.
- Dashboard water-point counts no longer expose platform-wide totals to scoped users.
- Active technician totals are displayed only to administrators and operators.

### Data integrity
- Duration calculations exclude missing, invalid and reversed timestamps.
- Analytics labels distinguish recorded workflow events from independently verified field outcomes.
- Registry status is documented as current status, not historical status for the selected reporting period.
