# MajiFix Demo Guide

## Before the demo

1. Start PostgreSQL.
2. Apply migrations and seed the database.
3. Start the application.
4. Sign in using the community, operator, technician and admin demo accounts.
5. Use only the synthetic demo water points and reports.

The demo password is the value configured in `SEED_DEMO_PASSWORD`.

## Three-minute walkthrough

### 1. Show the problem workflow (30 seconds)
Sign in as the community reporter. Open the sample critical fault report. Explain that the reference, affected population, downtime and alternative source details are recorded in one place.

### 2. Show triage and assessment (40 seconds)
Sign in as the operator. Open the report, show the priority score and rule inputs, start assessment, then approve the repair with a short note and estimated cost if useful.

### 3. Assign a technician (25 seconds)
Assign the available demo technician. Explain that MajiFix coordinates existing technicians rather than claiming to create a new technician workforce.

### 4. Record repair progress (45 seconds)
Sign in as the assigned technician. Move the job through `IN_PROGRESS`, `REPAIR_COMPLETED` and `AWAITING_CONFIRMATION`, adding clear notes at each step.

### 5. Verify restored service (30 seconds)
Sign in as the original community reporter or an operator. Confirm `WATER_RESTORED`. Show the final `RESTORED` status and timeline entry.

### 6. Close with measurement (10 seconds)
Show analytics. Explain that the dashboard reports recorded workflow data. It does not prove impact until validated through a real pilot.

## Demo integrity

- State that the water points and sample fault are simulated.
- Do not describe the sample as a real breakdown or a pilot result.
- Do not claim county, community, technician or partner commitments unless they have been independently confirmed.
- Explain that the prototype demonstrates a process. A field pilot must measure response time, repair duration, total downtime and restoration confirmation.
