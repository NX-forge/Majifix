# Repair Management

## Purpose

The repair module manages a fault from technician assignment through work completion and community/operator restoration confirmation. A technician completing work does not automatically mark a water point operational.

## Roles

- Administrators can manage repair assignments and approve or reject repair estimates across the platform.
- Operators can manage repairs for water points assigned to them.
- Technicians can respond to their own assignments, update their own repair work, submit estimates, record delays and upload evidence.
- Community reporters can view their own fault and repair timeline, evidence and restoration handover. They cannot manage technician work or approve costs.

All role and ownership checks run on the server.

## Assignment lifecycle

1. An operator/admin assigns an active technician whose profile is available and whose service area covers the water point county or sub-county. A technician must list the water point county or sub-county. Use `ALL` explicitly for a nationwide service area. An empty list does not qualify for assignments.
2. The assignment is reserved by atomically changing the technician profile's `available` flag to false.
3. The technician accepts or declines the pending assignment. Declining requires a reason and returns the fault to `APPROVED` for reassignment.
4. An accepted technician can start work and then mark the repair work completed.
5. A manager reviews the completion and moves the fault to `AWAITING_CONFIRMATION`.
6. The reporter or authorised operator confirms whether water service is restored. A failed confirmation reopens the report.

Reassignment requires a reason. It closes the previous assignment-history row, records the new technician and resets work timestamps and any old estimate/approval so a new technician does not inherit a stale cost estimate.

## Cost estimates

- The assigned technician can submit an estimate while the job is assigned or in progress and the assignment is accepted.
- The estimate is stored in KES and marked `PENDING`.
- An administrator or the assigned operator can approve or reject the estimate with a reason.
- Approval copies the submitted estimate to `approvedCost` and records the reviewing user.
- Rejection leaves `approvedCost` empty and records the reason.
- A pending or rejected submitted estimate blocks starting or completing work until it is approved or replaced with a new approved estimate. If no estimate is submitted, the workflow can proceed.
- A manager may also enter an estimate during fault approval. Such an estimate is recorded as manager-approved.

Cost approval is an operational record. It does not initiate a payment or prove that money has been paid.

## Delays and spare parts

A technician or authorised manager can record a delay while a job is assigned or in progress. Reasons include:

- Spare parts unavailable
- Transport
- Weather
- Site access
- Funding
- Technical complexity
- Other

Spare-parts delays require a part name and can record quantity, supplier and expected resolution date. Open delays can be resolved with notes. Delay creation and resolution are included in the repair timeline and audit log.

## Repair evidence

Repair evidence accepts JPEG, PNG, WebP and PDF files up to 4 MB. The server validates file signatures rather than trusting the browser MIME type. Files are stored privately in PostgreSQL and downloaded through an authenticated route. Access follows the repair job's assigned technician/operator scope or the original community reporter.

## Repair history

`RepairAssignmentHistory` is append-oriented and records the technician, assigning user, assignment time, end time and reason the assignment ended. `RepairUpdate` records the chronological repair timeline. `RepairDelay` records delay and resolution data. `RepairEvidence` stores private evidence metadata and bytes. `AuditLog` records sensitive actions.

## Availability semantics

`TechnicianProfile.available` means the technician can receive a new assignment. It is reserved when an operator assigns a job and remains unavailable while the technician has other assigned or in-progress work. It is made available again after the technician declines or completes the work, provided no other assigned or in-progress job remains. A job awaiting community restoration confirmation does not require the technician to remain unavailable.

## Operational rules

- Only the assigned technician with an accepted assignment can move `ASSIGNED` to `IN_PROGRESS` or `IN_PROGRESS` to `REPAIR_COMPLETED`.
- All recorded repair delays must be resolved before repair completion and restoration handover.
- Only an administrator or the assigned operator can move `REPAIR_COMPLETED` to `AWAITING_CONFIRMATION`.
- Only the reporter or authorised operator can confirm restoration under the existing restoration policy.
- A technician cannot confirm restoration.
- An estimate approval is not a payment.
- A repair completion is not a restoration confirmation.
