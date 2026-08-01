# Secret rotation

1. Identify the single provider credential and every runtime that uses it.
2. Create a replacement at the provider with the minimum required scope.
3. Update the Sites environment value without committing or logging it.
4. deploy or restart only the affected runtime and verify a non-sensitive
   health operation.
5. Revoke the prior credential after verification.
6. Review Worker and provider logs for use of the old credential after cutoff.
7. Record the actor, provider, reason, and completion time in the incident or
   change record—never the secret value.

Rotate immediately after suspected exposure, administrator departure, provider
security notice, or unintended logging. Routine rotation cadence follows each
provider's documented constraints.
