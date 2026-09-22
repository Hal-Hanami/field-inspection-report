# Contributing

## Before a change lands

```sh
npm run lint       # oxlint, including the hook and accessibility rules
npm test           # 64 tests, including the repository-wide gates
npm run build      # type check and bundle
```

All three pass, or the change is not finished.

## Where a change belongs

- A rule about what a report *is* or when it is valid → `src/domain`, with a `§` in
  `docs/DESIGN.md` and a test that cites it.
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
