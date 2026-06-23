# platform-registry — documentation

## Purpose

Central **contract registry** for platform microservices that serve multiple products.  
TagMe is listed as consumer `tagme-am`, same as any future `acme-corp-api` consumer.

## Files

| File | Role |
|------|------|
| [`../registry/platform-services.json`](../registry/platform-services.json) | Services, tenants, filter contracts, env keys, paths |
| [`../scripts/sync-consumer-docs.mjs`](../scripts/sync-consumer-docs.mjs) | Generates stubs across repos |
| [`../README.md`](../README.md) | Quick start |

## Doc layers (unchanged model)

| Layer | Owner repo | Content |
|-------|------------|---------|
| Platform proposal | `report-relay`, `message-relay` | Architecture, roadmap |
| **Registry** | **platform-registry** | Cross-repo keys — this repo |
| Consumer integration | Product repo (e.g. AM `docs/reports/`) | RBAC, cutover, product-specific |
| Generated stub | `{service}/docs/consumers/{consumerId}.md` | Synced from registry |

## Commands

```powershell
pnpm sync
```

After editing `registry/platform-services.json`.

## Registered services

<!-- platform-services:index:start -->
| id | Role | Service repo | Primary consumer |
|----|------|--------------|------------------|
| `report-relay` | Async report generation | [report-relay](https://github.com/renatogabrielbr/report-relay) | [tagme-am](https://github.com/tagmefoodsolutions/AvailabilityManager) |
| `message-relay` | SMS, WhatsApp, email delivery | [message-relay](https://github.com/renatogabrielbr/message-relay) | [tagme-am](https://github.com/tagmefoodsolutions/AvailabilityManager) |
<!-- platform-services:index:end -->
