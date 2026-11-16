# MajiFix Analytics

## Purpose

The analytics module turns recorded platform activity into operational measures for water-point operators, repair coordinators and administrators. It does not claim that a platform event proves a field outcome unless an authorised restoration confirmation has been recorded and independently checked during a pilot.

## Access scope

| Role | Analytics scope |
|---|---|
| ADMIN | All platform records |
| OPERATOR | Faults and water points assigned to that operator |
| TECHNICIAN | Repair jobs assigned to that technician |
| COMMUNITY | Fault reports submitted by that account |

Every aggregate, group-by query and supporting lookup must use the same role scope. Do not rely on hiding a dashboard section as an access-control mechanism.

## Date filters

- `from` and `to` accept `YYYY-MM-DD`.
- Both boundaries are interpreted in `Africa/Nairobi` time.
- The selected end date is inclusive. The database query uses an exclusive next-day boundary.
- The default range is the most recent 30 calendar days, including today.
- Invalid or reversed ranges fall back to the default range and display a validation message.

## Metric definitions

| Metric | Definition |
|---|---|
| Water points | Current registry count in the user's access scope. |
| Operational water points | Current registry status equals `OPERATIONAL`; this is not a historical as-at measure. |
| Fault reports | Reports created within the selected date range. |
| Active faults | Reports in a non-terminal operational status: reported, under assessment, approved, assigned, in progress, repair completed, awaiting confirmation or reopened. |
| Critical reports | Active reports whose stored priority is `CRITICAL`. |
| Restoration rate | Reports with status `RESTORED` divided by all reports created in the selected period. Rejected and cancelled reports remain in the denominator and should be considered when interpreting the rate. |
| Report-to-assignment | Average elapsed time from report creation to technician assignment for restored jobs with both timestamps. |
| Repair duration | Average elapsed time from work start to repair completion for restored jobs with both timestamps. |
| Total downtime | Average elapsed time from report creation to restoration timestamp for restored jobs with both timestamps. This is a recorded workflow duration, not independently observed water availability. |
| Open repair delays | Repair delays without a resolution timestamp on in-scope jobs. |
| Repeat-failure water points | Water points with more than one report in the selected period. This indicates repeated reporting, not proof of the same recurring defect. |
| Technician workload | Number of in-scope repair jobs grouped by assigned technician, available to administrators and operators. |

## Data quality and limitations

- Durations exclude missing, non-finite or negative intervals.
- Duration summaries use up to 10,000 matching restored jobs, and the activity chart uses up to 10,000 matching reports. The UI discloses this cap. Database counts and group-by distributions are not subject to the sample cap. If a deployment is expected to exceed this volume, replace bounded fetches with database-side time-bucket aggregation or a reporting table.
- Report category, priority and status distributions use database group-by counts and are not limited by the duration sample cap.
- Registry status is current status, even when viewing a past date range.
- Report-to-assignment, repair duration and downtime are based on stored timestamps. Do not describe them as causal reductions or achieved impact without a baseline and field evaluation.
- Restoration rate is a report cohort metric. A report created near the end of the selected period may be awaiting restoration and will lower the rate until its status changes.

## Testing

Run `pnpm test` to execute the analytics helper tests. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` after Prisma Client generation and database configuration. Validate each role using separate accounts and records belonging to at least two operators before production deployment.
