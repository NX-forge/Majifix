# Phase 7 acceptance checklist

## Notification centre

- [ ] Signed-in users can open `/notifications`.
- [ ] Users see only their own in-app-visible notifications.
- [ ] Unread count appears in the navigation and excludes hidden/read notifications.
- [ ] A user can mark one notification read.
- [ ] A user can mark all their visible notifications read.
- [ ] Empty state and the latest-100 limit are clear.

## Workflow events

- [ ] Fault submission notifies the reporter and assigned operator.
- [ ] Fault assessment, approval, and rejection notify the other participants.
- [ ] Technician assignment notifies the new technician and other participants.
- [ ] A technician removed during reassignment receives a separate reassignment notice.
- [ ] Assignment acceptance and decline notify the other participants.
- [ ] Repair estimate submission and decisions notify the other participants.
- [ ] Repair start, completion, and restoration-confirmation request notify the other participants.
- [ ] Delay report and resolution notify the other participants.
- [ ] Restoration and not-restored outcomes notify the other participants.

## Preferences and email

- [ ] New users default to all event categories and channels enabled.
- [ ] In-app visibility and email delivery can be disabled independently.
- [ ] Category preferences apply to both channels.
- [ ] Email messages use the configured Resend sender.
- [ ] The dispatch route rejects requests without the worker bearer secret.
- [ ] The worker claims messages safely, records attempts, retries up to five times, and recovers stale claims.
- [ ] A delivery failure does not roll back a repair workflow action.

## Database and verification

- [ ] Apply the additive migration with `pnpm db:migrate --name add_notification_system`.
- [ ] Regenerate Prisma Client with `pnpm db:generate`.
- [ ] Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Test the complete workflow with separate community, operator, and technician accounts.

The supplied source archive does not include the pre-existing initial migration directory. Keep that migration from the working repository before generating this additive migration. Do not reset the database.
