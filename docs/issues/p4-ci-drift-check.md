## Phase P4 — CI drift check (1 week)

Deliverables:
- [ ] GitHub Action on PR: run `pnpm sync` with `PLATFORM_WORKSPACE_ROOT`
- [ ] Fail if generated files differ from committed (report-relay/message-relay consumer stubs)
- [ ] Document checkout layout for CI (sparse or mock paths)

Acceptance: PR that edits registry without running sync fails CI.
