# Contributing

## Branching

`main` must remain releasable. Create a short-lived branch from the latest
`main` using one of:

- `feat/short-description`
- `fix/short-description`
- `docs/short-description`
- `chore/short-description`

Avoid long-running environment branches. Release history is represented by
annotated semantic-version tags.

## Development workflow

1. Choose or create an issue with acceptance criteria.
2. Keep changes focused and include tests for changed behavior.
3. Run `npm run check` before pushing.
4. Open a pull request using the repository template.
5. Resolve review and required checks before squash merging.

Use Conventional Commit subjects such as `feat: add score breakdown`.

## Standards

- TypeScript is strict; avoid `any` and unsafe assertions.
- Validate external data at its entry boundary.
- Keep domain rules pure when possible.
- Add accessible names, keyboard behavior, and meaningful empty/error states.
- Never commit secrets, customer data, marketplace credentials, or production
  exports.

## Database changes

Update the Prisma schema, generate a named migration, inspect its SQL, and add
or update migration tests. Destructive migrations require a documented
roll-forward and rollback plan.

## Definition of ready for review

- Acceptance criteria are satisfied.
- Relevant tests are present and passing.
- Formatting, lint, type checking, and production build pass.
- Documentation and `.env.example` reflect configuration changes.
- Screenshots are included for meaningful UI changes.
