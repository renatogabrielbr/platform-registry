## Phase P1 — Sync hardening (1 week)

Deliverables:
- [ ] `--dry-run` flag — print paths, no writes
- [ ] Validate all `localPath` / consumer paths exist (warn or fail)
- [ ] Validate `consumerId` references in services
- [ ] Validate `filterContract.fields` non-empty for report types
- [ ] Exit code 1 on validation failure
- [ ] Document flags in README

Acceptance: `pnpm sync -- --dry-run` succeeds on full workspace; fails clearly when path missing.
