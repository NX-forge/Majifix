# Security Checklist

## Included baseline

- Better Auth handles password storage and session lifecycle.
- Server actions require an authenticated session.
- Mutations validate input with Zod.
- Roles are stored server-side and public registration cannot select a role.
- Technician updates are restricted to their assigned repair job.
- Community users can only access their own fault reports.
- Restoration confirmation is distinct from repair completion.
- Important changes write audit records.

## Before real community use

- Add email verification and password reset email delivery.
- Add login and mutation rate limits.
- Use the trusted `admin:promote` command to bootstrap the first administrator.
- Add an operational approval process for sensitive role changes and retain audit records.
- Scope operator access to assigned water points/counties.
- Review Better Auth trusted-origin and cookie settings for the exact production domain.
- Add security headers and content security policy.
- Add file upload scanning and strict content/type/size limits before accepting photos.
- Define privacy notice, consent, retention and deletion process.
- Review Kenya Data Protection Act requirements with qualified counsel.
- Perform dependency, application and infrastructure security reviews.
