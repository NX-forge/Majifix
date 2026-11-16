# Testing Strategy

## Automated checks

- `pnpm typecheck` – TypeScript diagnostics.
- `pnpm lint` – ESLint.
- `pnpm test` – Vitest unit tests.
- `pnpm build` – production build and Prisma generation.

## Required acceptance scenarios

1. A visitor cannot open protected dashboard routes.
2. Self-registration always creates a COMMUNITY user.
3. A community user cannot access another reporter's fault detail.
4. A technician cannot access or update a job assigned to another technician.
5. A fault cannot be approved without assessment notes.
6. A technician cannot skip from ASSIGNED directly to RESTORED.
7. A repair completion moves to awaiting confirmation, not restored.
8. A positive confirmation sets the report to RESTORED and water point to OPERATIONAL.
9. A negative confirmation reopens the report.
10. An unavailable or non-technician account cannot receive an assignment.

The initial repository includes unit tests for the priority scoring function. The acceptance scenarios above should be automated as database-backed integration and browser end-to-end tests before production use.
