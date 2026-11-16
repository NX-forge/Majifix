# Operations Runbook

## Local startup

1. Confirm Node.js and pnpm are installed.
2. Copy `.env.example` to `.env` and configure the database URL and auth secret.
3. Start the database with `docker compose up -d db`.
4. Run `pnpm db:generate`.
5. Run `pnpm db:migrate --name init` for the first local database, or `pnpm db:deploy` for an existing migration history.
6. Run `pnpm db:seed` only when you want the synthetic demo records.
7. Run `pnpm dev`.

## Production release

1. Back up the database and confirm that a restore procedure has been tested.
2. Build and test the exact commit intended for release.
3. Run `pnpm db:deploy` once as a release step.
4. Deploy the application artifact.
5. Verify sign-in, water-point lookup, report creation, assignment and restoration confirmation.
6. Monitor application errors, database health and authentication failures.

## Incident response

- Record the time, affected service and observable symptoms.
- Avoid manually editing workflow records unless a documented recovery procedure requires it.
- Preserve audit logs and relevant application logs.
- If data integrity is in doubt, stop further mutations and restore from a verified backup only after assessing data loss.
- Document the cause, actions and follow-up work.

## Backups

Use managed PostgreSQL automated backups and point-in-time recovery where available. Set a retention period based on operational and legal requirements. Test restoration on a separate database before relying on backups.
