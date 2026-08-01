# Production rollback and release strategy

Every Sites release is an immutable saved version linked to an exact pushed
commit and migration archive. A failed release is rolled back to the most recent
verified version; it is never repaired by editing production state manually.

For blue-green safety, treat the saved candidate version as green and the
currently deployed version as blue. Build and package green, verify migrations
and health, then move production traffic by deploying that saved version. Keep
blue available for immediate version rollback until acceptance checks pass.

Database migrations are forward-only. Before a destructive schema change,
introduce additive compatibility first, deploy readers/writers, migrate data,
and remove obsolete fields only in a later release with verified backup and
rollback evidence.
