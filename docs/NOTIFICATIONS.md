# MajiFix notifications

## What is delivered

MajiFix Phase 7 adds an authenticated notification centre with unread counts, per-notification read actions, and a mark-all-read action. Notifications are scoped to the signed-in user. The centre shows the latest 100 in-app-visible records.

The notification service covers these workflow events:

- Fault report received, assessed, approved, and rejected.
- Technician assignment, acceptance, and decline.
- Repair estimate submission and approval or rejection.
- Repair start, repair completion, and restoration confirmation request.
- Repair delay reported and resolved.
- Water restoration confirmed or reported as not restored.

Recipients are drawn from the fault reporter, the water point's assigned operator, and the currently assigned technician. The actor who made a change is excluded. Only active accounts receive notifications. A technician newly assigned to a job is included because recipients are resolved after the assignment transaction commits. A technician removed by reassignment also receives a separate assignment-change notice.

## Preferences

Each user can control in-app and email channels independently and can turn off each event category. New users receive all notification categories and both channels enabled by default. Existing users without a preference row use the same defaults.

Turning off in-app notifications hides new records from the notification centre but does not prevent email delivery when email is enabled. Turning off email marks the email delivery state as skipped.

## Email delivery

Email delivery uses the existing Resend configuration (`RESEND_API_KEY` and `RESEND_FROM_EMAIL`). Workflow actions create in-app notification records and queue email delivery after their business transactions commit. Notification creation errors are caught and logged so they cannot undo a repair workflow action.

A scheduler must call `POST /api/notifications/dispatch` with:

`Authorization: Bearer <NOTIFICATION_WORKER_SECRET>`

The worker processes up to 20 queued emails per request. It records attempts and delivery errors, retries failed deliveries up to five attempts, and marks exhausted messages as `FAILED`. Stale `SENDING` claims older than ten minutes are returned to the queue after worker interruption. The endpoint does not expose notification content without the worker secret.

Configure `NOTIFICATION_WORKER_SECRET` as a random secret of at least 32 characters in the deployment environment. The dispatcher rejects missing or shorter secrets. Schedule the endpoint at a short interval (for example, every minute). Do not expose the secret in browser code.

In local development, the existing email sender prints a preview when Resend credentials are absent. Production email delivery requires valid Resend credentials.

## Migration

Generate the Phase 7 migration with the descriptive name `add_notification_system` against the existing MajiFix database:

```bash
pnpm db:migrate --name add_notification_system
pnpm db:generate
```

The repository archive supplied for this phase did not include the existing initial migration directory. Keep your original initial migration in your working copy. Run the command above against that existing migration history so Prisma creates the additive migration named `add_notification_system`. Do not reset the database or recreate migration history.

## Operational checks

1. Submit a fault report and confirm the reporter and assigned operator receive an in-app notification.
2. Assign a technician and confirm the technician and relevant fault participants receive the assignment update.
3. Accept and decline assignments and verify the other participants are notified.
4. Submit and decide a repair estimate and verify the cost event.
5. Report and resolve a delay and verify the delay event.
6. Move a repair through in-progress, completed, and awaiting-confirmation states. Verify the restoration request is sent.
7. Confirm restored and not-restored outcomes and verify the corresponding message.
8. Mark one notification read, then mark all read. Confirm the navigation unread count changes.
9. Disable a category and verify future events in that category are not created.
10. Disable email while keeping in-app enabled, and verify no email is queued.
11. Call the dispatch endpoint without a secret and confirm HTTP 401. Call it with the secret and verify successful delivery or a recorded retry state.

Email delivery is asynchronous. A queued notification is not proof that an email reached the recipient's inbox. The `SENT` state means the email provider accepted the send request.
