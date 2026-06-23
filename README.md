# platform-registry

**Neutral hub** for platform service contracts — report-relay, message-relay, future services.  
Not owned by TagMe, AvailabilityManager, or any single product repo.

| What | Where |
|------|--------|
| **Registry (single key file)** | [`registry/platform-services.json`](./registry/platform-services.json) |
| **Sync script** | `pnpm sync` → consumer stubs + integration marker sections |
| **Docs** | [`docs/README.md`](./docs/README.md) |

## Quick start

Set your workspace root (parent of `tagme/`, `projects/`, etc.):

```powershell
$env:PLATFORM_WORKSPACE_ROOT = "C:\Users\renato\workspace"
cd platform-registry
pnpm sync
```

## Layout on disk (example)

```text
workspace/
├── platform-registry/     ← this repo
├── projects/
│   ├── report-relay/
│   └── message-relay/
└── tagme/
    ├── AvailabilityManager/   ← consumer tagme-am (not the registry owner)
    └── NewTableManagerFront/
```

## Related repos

| Repo | Role |
|------|------|
| [report-relay](https://github.com/renatogabrielbr/report-relay) | Async exports — own DB |
| [message-relay](https://github.com/renatogabrielbr/message-relay) | Comms delivery |
| TagMe AvailabilityManager | **One consumer** (`tagme-am`) — integration docs only |
