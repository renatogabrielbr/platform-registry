/**
 * Syncs consumer docs from registry/platform-services.json (neutral hub — not AM-owned).
 *
 * Writes:
 *   {service}/docs/consumers/{consumerId}.md
 *   {consumer}/docs/... marker sections (integration docs)
 *   docs/README.md index table in this repo
 *
 * Usage:
 *   PLATFORM_WORKSPACE_ROOT=C:\Users\renato\workspace pnpm sync
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryRoot = path.join(__dirname, '..');
const configPath = path.join(registryRoot, 'registry', 'platform-services.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveWorkspaceRoot(config) {
  const envRoot = process.env[config.workspaceRootEnv || 'PLATFORM_WORKSPACE_ROOT'];
  if (envRoot) return path.resolve(envRoot);
  return path.resolve(registryRoot, '..');
}

function resolvePath(workspaceRoot, relativePath) {
  if (!relativePath) return null;
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.resolve(workspaceRoot, relativePath);
}

function ghUrl(github, docPath) {
  return `https://github.com/${github}/blob/main/${docPath}`;
}

function registryUrl(config, filePath) {
  return ghUrl(config.registryGithub, filePath);
}

function replaceMarkers(content, markerId, newBlock) {
  const start = `<!-- ${markerId}:start -->`;
  const end = `<!-- ${markerId}:end -->`;
  const re = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
  if (!re.test(content)) {
    console.warn(`⚠ markers not found: ${markerId}`);
    return content;
  }
  return content.replace(re, `${start}\n${newBlock}\n${end}`);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getConsumer(config, consumerId) {
  const c = config.consumers?.[consumerId];
  if (!c) throw new Error(`Unknown consumerId: ${consumerId}`);
  return c;
}

function filterContractTable(reportType, consumer) {
  const fc = reportType.filterContract;
  if (!fc?.fields?.length) return '_No filter contract defined._';

  const dtoLink = fc.sourcePath
    ? ` — source DTO \`${fc.sourceDto}\` in [\`${fc.sourcePath}\`](../../${fc.sourcePath})`
    : '';

  const lines = [
    `Report type \`${reportType.slug}\` (phase ${reportType.phase})${dtoLink}.`,
    '',
    '| Field | Type | Required | Notes |',
    '|-------|------|:--------:|-------|',
  ];

  for (const f of fc.fields) {
    const req = f.required ? 'yes' : 'no';
    const note = f.default != null ? `${f.note || ''} (default: ${f.default})`.trim() : f.note || '';
    lines.push(`| \`${f.name}\` | ${f.type} | ${req} | ${note} |`);
  }

  return lines.join('\n');
}

function tenantForConsumer(service, consumerId) {
  return service.tenants?.find((t) => t.consumerId === consumerId);
}

function buildReportRelayConsumerDoc(config, service, binding, consumer) {
  const d = service.docs;
  const rt = service.reportTypes?.[0];
  const tenant = tenantForConsumer(service, binding.consumerId);
  const envLines = Object.entries(binding.env || {}).map(([k, v]) => `| \`${k}\` | ${v} |`);

  return `# ${consumer.name} — report-relay consumer

> **Generated** from [platform-registry \`platform-services.json\`](${registryUrl(config, 'registry/platform-services.json')}) — do not edit by hand.  
> Run: \`pnpm sync\` in [platform-registry](https://github.com/${config.registryGithub})

**Consumer id:** \`${consumer.id}\` · **Service:** [\`${service.id}\`](${ghUrl(service.github, d.index)})

## Role

${service.role}

Platform proposal (this service repo):

| Doc | Link |
|-----|------|
| Proposal | [${d.proposal}](${ghUrl(service.github, d.proposal)}) |
| Architecture | [${d.architecture}](${ghUrl(service.github, d.architecture)}) |
| Own DB schema | [${d.dataModel}](${ghUrl(service.github, d.dataModel)}) |
| Connectors | [${d.connectors}](${ghUrl(service.github, d.connectors)}) |
| Roadmap | [${d.roadmap}](${ghUrl(service.github, d.roadmap)}) |

**GitHub:** [milestone](${d.milestoneUrl}) · [issues](${d.issuesUrl})

## Consumer integration (hand-written)

[${binding.integrationDoc}](https://github.com/${consumer.github}/blob/main/${binding.integrationDoc}) — product-specific cutover and RBAC.

## Code paths

${(binding.codePaths || []).map((p) => `- \`${p}\``).join('\n')}

## Env

| Variable | Purpose |
|----------|---------|
${envLines.join('\n')}

## Filter contract (\`${rt?.slug ?? 'reservations.export'}\`)

${rt ? filterContractTable(rt, consumer) : '_Define reportTypes in registry._'}

## Tenant + connector

| Setting | Value |
|---------|--------|
| Tenant slug | \`${tenant?.slug ?? '—'}\` |
| Connector name | \`${tenant?.connectorName ?? '—'}\` |
| Source DB | Read replica — SELECT only |

---

*Generated at ${new Date().toISOString()}*
`;
}

function buildMessageRelayConsumerDoc(config, service, binding, consumer) {
  const d = service.docs;
  const envLines = Object.entries(binding.env || {}).map(([k, v]) => `| \`${k}\` | ${v} |`);

  return `# ${consumer.name} — message-relay consumer

> **Generated** from [platform-registry](https://github.com/${config.registryGithub})

**Consumer id:** \`${consumer.id}\` · **Service:** [\`${service.id}\`](${ghUrl(service.github, d.index)})

## Role

${service.role}

| Doc | Link |
|-----|------|
| Proposal | [${d.proposal}](${ghUrl(service.github, d.proposal)}) |
| Roadmap | [${d.roadmap}](${ghUrl(service.github, d.roadmap)}) |

## Consumer integration

[${binding.integrationDoc}](https://github.com/${consumer.github}/blob/main/${binding.integrationDoc})

${binding.notes ? `\n> ${binding.notes}\n` : ''}

## Code paths

${(binding.codePaths || []).map((p) => `- \`${p}\``).join('\n')}

## Env

| Variable | Purpose |
|----------|---------|
${envLines.join('\n')}

---

*Generated at ${new Date().toISOString()}*
`;
}

function buildRegistryIndex(config) {
  const header = '| id | Role | Service repo | Primary consumer |';
  const sep = '|----|------|--------------|------------------|';
  const rows = config.services.map((s) => {
    const binding = s.consumerBindings?.[0];
    const consumer = binding ? getConsumer(config, binding.consumerId) : null;
    const consumerLink = consumer
      ? `[${consumer.id}](https://github.com/${consumer.github})`
      : '—';
    return `| \`${s.id}\` | ${s.role.split('—')[0].trim()} | [${s.name}](https://github.com/${s.github}) | ${consumerLink} |`;
  });
  return [header, sep, ...rows].join('\n');
}

function buildReportRelayLinksBlock(config, service) {
  const d = service.docs;
  const binding = service.consumerBindings?.find((b) => b.integrationIndex);
  const consumerDoc = binding?.platformConsumerDoc ?? 'docs/consumers/tagme-am.md';

  return `| Doc | Topic |
|-----|--------|
| [proposal.md](${ghUrl(service.github, d.proposal)}) | Vision, stack, multi-tenant model |
| [architecture.md](${ghUrl(service.github, d.architecture)}) | API + worker + own Postgres |
| [data-model.md](${ghUrl(service.github, d.dataModel)}) | \`report_relay\` schema |
| [connectors.md](${ghUrl(service.github, d.connectors)}) | Pluggable source DBs |
| [roadmap.md](${ghUrl(service.github, d.roadmap)}) | Phases R0–R5 |
| [${consumerDoc}](${ghUrl(service.github, consumerDoc)}) | Consumer stub (generated) |

**Registry:** [platform-registry/platform-services.json](${registryUrl(config, 'registry/platform-services.json')}) — run \`pnpm sync\` in that repo.

**GitHub:** [milestone](${d.milestoneUrl}) · [issues](${d.issuesUrl})`;
}

function main() {
  const config = readJson(configPath);
  const workspaceRoot = resolveWorkspaceRoot(config);
  let updated = 0;

  console.log(`Workspace root: ${workspaceRoot}`);

  for (const service of config.services) {
    const serviceRoot = resolvePath(workspaceRoot, service.localPath);

    for (const binding of service.consumerBindings || []) {
      const consumer = getConsumer(config, binding.consumerId);
      const consumerRoot = resolvePath(workspaceRoot, consumer.localPath);

      if (serviceRoot && fs.existsSync(serviceRoot) && binding.platformConsumerDoc) {
        const outPath = path.join(serviceRoot, binding.platformConsumerDoc);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        const body =
          service.id === 'report-relay'
            ? buildReportRelayConsumerDoc(config, service, binding, consumer)
            : service.id === 'message-relay'
              ? buildMessageRelayConsumerDoc(config, service, binding, consumer)
              : `# ${consumer.name} — ${service.id}\n\nExtend sync-consumer-docs.mjs\n`;

        fs.writeFileSync(outPath, body, 'utf8');
        console.log(`✓ ${service.id} consumer stub → ${outPath}`);
        updated += 1;
      } else if (service.localPath) {
        console.warn(`⚠ skip ${service.id} stub: ${serviceRoot}`);
      }

      if (service.id === 'report-relay' && binding.integrationIndex && consumerRoot) {
        const indexPath = path.join(consumerRoot, binding.integrationIndex);
        if (fs.existsSync(indexPath)) {
          let content = fs.readFileSync(indexPath, 'utf8');
          content = replaceMarkers(
            content,
            'platform-services:report-relay:links',
            buildReportRelayLinksBlock(config, service),
          );
          fs.writeFileSync(indexPath, content, 'utf8');
          console.log(`✓ links → ${indexPath}`);
          updated += 1;
        }
      }

      if (
        service.id === 'report-relay' &&
        binding.integrationDoc &&
        consumerRoot &&
        service.reportTypes?.[0]
      ) {
        const docPath = path.join(consumerRoot, binding.integrationDoc);
        if (fs.existsSync(docPath)) {
          let content = fs.readFileSync(docPath, 'utf8');
          content = replaceMarkers(
            content,
            'platform-services:report-relay:filter-contract',
            filterContractTable(service.reportTypes[0], consumer),
          );
          fs.writeFileSync(docPath, content, 'utf8');
          console.log(`✓ filter contract → ${docPath}`);
          updated += 1;
        }
      }
    }
  }

  const registryDocsReadme = path.join(registryRoot, 'docs', 'README.md');
  if (fs.existsSync(registryDocsReadme)) {
    let content = fs.readFileSync(registryDocsReadme, 'utf8');
    content = replaceMarkers(content, 'platform-services:index', buildRegistryIndex(config));
    fs.writeFileSync(registryDocsReadme, content, 'utf8');
    console.log(`✓ registry index → ${registryDocsReadme}`);
  }

  console.log(`Done (${updated} write(s)).`);
}

main();
