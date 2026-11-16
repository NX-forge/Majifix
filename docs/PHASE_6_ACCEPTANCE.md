# Phase 6 Acceptance Checklist: Dashboards and Analytics

## Access scope
- [ ] Administrator can view platform-wide metrics.
- [ ] Operator sees only water points assigned to that operator and their reports.
- [ ] Technician sees only reports and repair jobs assigned to that technician.
- [ ] Community member sees only their submitted reports and related water points.
- [ ] Supporting lookups and grouped aggregates use the same access scope.
- [ ] Dashboard counts do not expose global totals to scoped roles.

## Metrics
- [ ] Water-point count and current operational count are scoped correctly.
- [ ] Fault totals, active faults and critical active faults are correct.
- [ ] Restoration rate uses restored reports divided by all reports in the report cohort.
- [ ] Report-to-assignment uses report creation and assignment timestamps.
- [ ] Repair duration uses work start and repair completion timestamps.
- [ ] Downtime uses report creation and confirmed restoration timestamps.
- [ ] Missing, invalid and reversed timestamps are excluded.
- [ ] Open repair delays exclude resolved delays.
- [ ] Category, priority and status distributions match database counts.
- [ ] Repeat-report locations are described as repeated reports, not proven recurring defects.
- [ ] Technician workload is available only to administrators and operators.

## Date range and presentation
- [ ] Default range covers the most recent 30 `Africa/Nairobi` calendar days.
- [ ] Custom date range uses inclusive local start and end dates.
- [ ] Invalid dates and reversed ranges show a validation message and use the default range.
- [ ] Empty datasets render without division-by-zero or `NaN` values.
- [ ] The duration/activity sample limit is visible and documented.
- [ ] Current registry status is not presented as historical status.

## Automated and environment checks
- [x] Analytics helper runtime assertions pass.
- [x] TypeScript/TSX syntax parsing passes.
- [x] Package and TypeScript configuration JSON parse successfully.
- [ ] Full TypeScript typecheck with generated Prisma Client.
- [ ] ESLint.
- [ ] Full Vitest suite.
- [ ] Prisma schema validation and Client generation.
- [ ] Database integration checks for each role.
- [ ] Production build.
- [ ] Browser tests for date filters and role-specific dashboards.
