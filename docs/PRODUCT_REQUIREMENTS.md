# MajiFix Product Requirements

## 1. Purpose

MajiFix coordinates the process of restoring rural water points after breakdowns. It creates a shared record from fault report to verified service restoration.

## 2. Users

- Community reporter: reports a fault and follows progress.
- Water operator: assesses, approves and coordinates a repair.
- Technician: receives assignments and records work.
- Administrator: manages operational access and system configuration.

## 3. MVP user stories

### Water point registry

- As an operator, I can register a water point with its code, type, county, estimated users and service dependencies.
- As an authenticated user, I can view registered water points.

### Fault reporting

- As a community member, I can report a fault against a known water point.
- I can describe the issue, category, affected population, downtime and alternative water availability.
- The system assigns a unique reference and calculates a priority score.

### Assessment and assignment

- As an operator, I can assess and approve or reject a report with a reason.
- As an operator, I can assign an available technician to an approved repair.

### Repair tracking

- As an assigned technician, I can start work and record progress.
- I can mark repair work completed.
- The platform then waits for service restoration confirmation.

### Restoration confirmation

- As the original reporter or authorised operator, I can confirm whether water service is flowing again.
- A failed confirmation reopens the case.
- A positive confirmation closes the case as restored and updates the water point status.

## 4. Non-functional requirements

- Mobile-first responsive interface.
- Server-side authentication and role checks.
- Input validation on the server.
- Audit records for important actions.
- Relational integrity and database migrations.
- No sensitive personal information in demo fixtures.
- Clear distinction between repair completion and service restoration.

## 5. Out of scope

SMS/USSD, WhatsApp, payment processing, automated technician matching, AI fault diagnosis, IoT monitoring, parts inventory and offline-first sync.

## 6. Success measures for a future pilot

- Time from fault occurrence to reporting.
- Time from report to assessment.
- Time from approval to technician assignment.
- Technician response time.
- Repair duration.
- Total water-point downtime.
- Percentage of repairs confirmed as restored.
- Repeat failure rate by water point and fault category.
