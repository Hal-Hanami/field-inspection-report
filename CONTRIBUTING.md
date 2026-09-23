# Contributing

## Before a change lands

```sh
npm run lint       # oxlint, including the hook and accessibility rules
npm test           # including the repository-wide gates
npm run build      # type check and bundle

cd api
uv run ruff format --check . && uv run ruff check .
uv run pyright     # strict
uv run pytest      # against PostgreSQL: npm run db
```

All of them pass, or the change is not finished.

## Where a change belongs

- A rule about what a report *is* or when it is valid → `src/domain`, with a `§` in
  `docs/DESIGN.md` and a test that cites it.
- A rule about what a report *is* or when it is valid, on the server → `api/app/domain`,
  with the same change in `src/domain`, and a case in `contracts/validation-cases.json`
  that both test suites run. A rule changed on one side only fails the other suite.
- A change to what the API sends or accepts → the schemas in `api/app/http/schemas.py`,
  then regenerate both derived files; a test fails while either is stale:

  ```sh
  cd api
  uv run python -m app.openapi_export > openapi.json
  uv run python -m app.web_types > ../src/data/api/schema.ts
  ```

- A change to the database → a new Alembic revision in `api/migrations/versions`, and the
  table definitions in `api/app/repository/tables.py`; a test compares the two.
- Anything that talks to the outside → behind the repository interface in `src/data`.
- Screen state → the screen's hook. Components render what they are handed.
- Text a person reads → `src/locales/ja.json`. Code, comments and documentation are
  English; a test fails on Japanese anywhere else.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), in English:

```
<type>(<scope>): <summary, imperative, lower case, no trailing period>

<why the change was needed: the constraint, the alternative rejected, the
 measurement that motivated it — the diff already says what changed>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `chore`.

## Comments

Comments say **why**. What the code does, the code already says, and a comment that
repeats it starts lying the moment the code changes. Worth writing: a constraint that is
not visible here, a non-obvious ordering, an alternative that was rejected and the reason.

## The design document

`docs/DESIGN.md` holds invariants and their reasons, numbered `§N`. Tests cite those
numbers in their names, and a gate fails when a section has no test behind it. If a
section cannot be enforced by a test, it is narrative rather than specification, and it
belongs in prose — or not at all.
