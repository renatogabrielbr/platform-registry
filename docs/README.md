# platform-registry — documentation

Neutral contract hub — **not TagMe-owned**. Start here before any platform service code.

| Doc | Topic |
|-----|--------|
| **[ecosystem-start.md](./ecosystem-start.md)** | **Master start guide** — all repos, issues, doc map, sprint plan |
| [roadmap.md](./roadmap.md) | P0–P4 registry phases + GitHub issues |
| [../registry/platform-services.json](../registry/platform-services.json) | Single key file |
| [../README.md](../README.md) | Quick start + `pnpm sync` |

## Downstream services

| Service | Docs | Milestone |
|---------|------|-----------|
| [report-relay](https://github.com/renatogabrielbr/report-relay) | [docs/](https://github.com/renatogabrielbr/report-relay/tree/main/docs) | [#1 Report Relay v1](https://github.com/renatogabrielbr/report-relay/milestone/1) |
| [message-relay](https://github.com/renatogabrielbr/message-relay) | [docs/](https://github.com/renatogabrielbr/message-relay/tree/main/docs) | [#1 Comms Greenfield](https://github.com/renatogabrielbr/message-relay/milestone/1) |

## Phase issues (this repo)

| Phase | Spec |
|-------|------|
| P0 | [issues/p0-bootstrap.md](./issues/p0-bootstrap.md) |
| P1 | [issues/p1-sync-hardening.md](./issues/p1-sync-hardening.md) |
| P2 | [issues/p2-schema-validation.md](./issues/p2-schema-validation.md) |
| P3 | [issues/p3-waitlist-consumer.md](./issues/p3-waitlist-consumer.md) |
| P4 | [issues/p4-ci-drift-check.md](./issues/p4-ci-drift-check.md) |

## Registered services

<!-- platform-services:index:start -->
| id | Role | Service repo | Primary consumer |
|----|------|--------------|------------------|
| `report-relay` | Async report generation | [report-relay](https://github.com/renatogabrielbr/report-relay) | [tagme-am](https://github.com/tagmefoodsolutions/AvailabilityManager) |
| `message-relay` | SMS, WhatsApp, email delivery | [message-relay](https://github.com/renatogabrielbr/message-relay) | [tagme-am](https://github.com/tagmefoodsolutions/AvailabilityManager) |
<!-- platform-services:index:end -->

Run `pnpm sync` after editing the registry JSON.
