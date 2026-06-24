# Dual-ship — message-relay + report-relay

Orchestration lives in **platform-registry** (no runtime server). Each service remains an independent deployable.

## Modes

| Mode | Command / trigger | Deploys |
|------|-------------------|---------|
| **Solo message-relay** | `message-relay/deployments/cloudbuild.yaml` or `provision-cloud-run.ps1 -Service message-relay` | api + worker |
| **Solo report-relay** | `report-relay/deployments/cloudbuild.yaml` or `-Service report-relay` | api + worker |
| **Dual local** | `docker compose -f deploy/docker-compose.dual.yml up --build` | both stacks on one machine |
| **Dual GCP** | `deploy/cloudbuild.dual.yaml` or `-DualTrigger` | 4 Cloud Run services |

## Dual local

```powershell
$env:PLATFORM_WORKSPACE_ROOT = "C:\Users\renato\workspace"
cd projects/platform-registry/deploy
docker compose -f docker-compose.dual.yml up --build
```

| Service | URL |
|---------|-----|
| message-relay api | http://localhost:3012 |
| report-relay api | http://localhost:3020 |

AM local env:

```env
COMMUNICATION_MANAGER_URL=http://localhost:3012
REPORT_RELAY_URL=http://localhost:3020
REPORT_RELAY_ENABLED=true
```

## Dual GCP triggers

```powershell
cd projects/platform-registry/scripts/gcp
.\provision-cloud-run.ps1 -Service all -Environment dev
.\provision-cloud-run.ps1 -Service all -Environment dev -DualTrigger
```

Solo triggers (recommended for prod rollback): one trigger per `{service}-{component}-{env}`.

Dual trigger: single pipeline → [cloudbuild.dual.yaml](./cloudbuild.dual.yaml).

## Shared GCP project

Same project (`tagme-live-menu-dev`) is fine. Prefer **separate** Memorystore instances and separate Cloud SQL (report-relay) vs Mongo Atlas (message-relay).

## Prerequisites

See:

- [message-relay/docs/deploy-gcp.md](https://github.com/renatogabrielbr/message-relay/blob/main/docs/deploy-gcp.md)
- [report-relay/docs/deploy-gcp.md](https://github.com/renatogabrielbr/report-relay/blob/main/docs/deploy-gcp.md)

Bootstrap Cloud Run service names once before first trigger-driven deploy.

## Cutover policy

No per-venue legacy toggle. message-relay replaces Legacy via **environment** `COMMUNICATION_MANAGER_URL` only ([message-relay/docs/compat.md](https://github.com/renatogabrielbr/message-relay/blob/main/docs/compat.md)).
