# Disaster recovery

## Objectives

- Restore a known-good application version before attempting forward repair.
- Restore database state only from a provider-confirmed, integrity-checked
  backup with a recorded storage-reference hash.
- Never mark a backup or restore test successful without external evidence.

## Recovery sequence

1. Freeze mutations and scheduled jobs.
2. Record the incident and last known healthy deployment/database timestamp.
3. Roll back the Sites version when application code is the cause.
4. If data is affected, select the most recent verified backup before the event,
   restore into an isolated environment, and run migration and invariant checks.
5. Compare record counts, ownership boundaries, affiliate attribution hashes,
   and the 50-product baseline before production cutover.
6. Re-enable writes gradually; keep external ingestion and email disabled until
   health evidence is stable.

The `/admin` backup control intentionally reports `BLOCKED` until a managed
backup transport is configured. This prevents a database row from being
mistaken for an actual recoverable backup.
