# Security operations

Affinity India uses Sign in with ChatGPT for identity, an administrator
allowlist for privileged operations, owner-scoped data access, strict request
validation, same-origin mutation checks, privacy-safe rate limits, restrictive
HTTP headers, and immutable administrator/security event evidence.

## Access and sessions

- Production access is private by default.
- `ADMIN_EMAILS` is the authoritative emergency administrator allowlist.
- Application user state supports active/suspended review, but the external
  identity provider remains responsible for session issuance and expiration.
- Never place API keys, webhook tokens, access tokens, or raw identity headers
  in the database, logs, pull requests, screenshots, or support messages.

## Vulnerability handling

Report vulnerabilities through the repository's private security-advisory
channel. Do not open a public issue containing exploit or credential details.
The CI pipeline performs dependency, lint, type, test, build, and CodeQL gates.

## Security-event response

Rate-limit violations are recorded with a one-way request fingerprint and
bounded route metadata, never a raw IP address. Administrators review and
resolve events in `/admin`. Critical events follow `INCIDENT_RESPONSE.md`.
