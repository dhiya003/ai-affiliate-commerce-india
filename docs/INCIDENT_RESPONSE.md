# Incident response

1. **Detect and classify.** Confirm timestamp, route, request ID, deployment
   version, affected owners, data sensitivity, and whether the event is active.
2. **Contain.** Disable the narrow feature flag or automation job, suspend an
   affected application user, revoke the specific secret, or roll back the
   deployment. Do not destroy evidence.
3. **Preserve evidence.** Retain redacted Worker logs, audit/security events,
   source/run IDs, and deployment identifiers. Never copy secrets or raw
   personal identifiers into the incident record.
4. **Recover.** Apply the smallest verified fix, run migration/build/security
   gates, deploy privately, and verify the original failure path.
5. **Communicate.** Tell affected users what happened, what information or
   workflow was affected, the containment status, and any action required.
6. **Review.** Record cause, timeline, safeguards, owner, and due date for every
   follow-up. Close only after monitoring proves the issue has not recurred.

Severity is critical when credentials, personal data, attribution integrity,
administrator access, or broad production availability may be compromised.
