# API and Server Actions

The current MVP uses Next.js Server Actions for authenticated writes rather than exposing a public REST API for every operation. This keeps authorization close to the mutation. Better Auth exposes its handler under `/api/auth/*`.

## Authentication

- `GET /api/auth/*` – Better Auth handler.
- `POST /api/auth/*` – Better Auth handler.

## Server actions

| Action | Purpose | Access |
| --- | --- | --- |
| `createWaterPointAction` | Register water point | ADMIN, OPERATOR |
| `createFaultReportAction` | Submit fault report | Authenticated user |
| `assessFaultAction` | Approve/reject report | ADMIN, OPERATOR |
| `assignTechnicianAction` | Assign available technician | ADMIN, OPERATOR |
| `updateRepairStatusAction` | Update repair status | Assigned technician, ADMIN, OPERATOR |
| `confirmRestorationAction` | Confirm service restoration | Original reporter, ADMIN, OPERATOR |

All mutations validate input and check the current session on the server. Do not call database writes directly from client components.
