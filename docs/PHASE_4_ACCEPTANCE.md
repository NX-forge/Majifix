# Phase 4 acceptance checklist

This checklist records the Phase 4 scope and the evidence required before the phase can be marked verified.

## Implemented in the source tree

- [x] Community, assigned operator and administrator fault submission.
- [x] Server-side validation for water point, category, description, population impact, downtime and service availability.
- [x] Unique fault reference generation.
- [x] Immutable priority score and factor snapshot.
- [x] Critical, High and Normal priority bands.
- [x] Priority factor breakdown on the fault detail page.
- [x] Optional private JPEG, PNG, WebP and PDF evidence upload, maximum 4 MB.
- [x] Server-side file-signature validation and safe download response headers.
- [x] Duplicate detection for recent active reports from the same reporter, water point and category.
- [x] Atomic per-user fixed-window submission cap of 10 reports per hour.
- [x] Fault register search, filters and pagination.
- [x] Community, operator, technician and administrator report visibility rules.
- [x] Operator scope checks on assessment, assignment, repair updates, restoration confirmation and priority overrides.
- [x] Technician service-area validation during assignment.
- [x] Reason-required priority overrides with timeline and audit entries.
- [x] Water-point status recalculation after new reports and rejected reports.
- [x] Phase 4 documentation and unit tests.

## Source-level verification completed

- [x] All 59 TypeScript/TSX source files parsed without syntax diagnostics.
- [x] Six priority calculation scenarios passed using Node's built-in TypeScript type stripping.
- [x] Two priority snapshot helper checks passed.
- [x] Ten role-based access assertions passed.
- [x] Five evidence validation scenarios passed.
- [x] `package.json` parsed as valid JSON.
- [x] Prisma schema structural brace check passed.
- [x] ZIP archive integrity check passed.

## Runtime verification still required

The package registry was unreachable in the implementation environment. Dependencies and generated Prisma Client were therefore unavailable. The following checks have not been run and are required before a production-ready sign-off:

- [ ] `pnpm install` and lockfile generation.
- [ ] `pnpm db:generate`.
- [ ] `pnpm db:migrate --name init` against a fresh development database.
- [ ] `pnpm typecheck`.
- [ ] `pnpm lint`.
- [ ] `pnpm test` using Vitest.
- [ ] `pnpm build`.
- [ ] Browser test for file upload and authenticated evidence download.
- [ ] Database test for concurrent report throttling and duplicate handling.
- [ ] End-to-end test for operator access boundaries.

Do not mark Phase 4 production-verified until the pending checks pass.
