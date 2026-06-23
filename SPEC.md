# Live ARC-1 Interactive Replay Demo Specification

Status: draft
Date: 2026-06-23
Target repo folder: `/Users/marianzeis/DEV/live-arc-1`
Target URL: `https://live-arc-1.arc-mcp.com`
Deployment target: GitHub Pages

## Locked Decisions

- Use a separate repository, not the ARC-1 repo.
- Use Next.js and assistant-ui.
- Replay only for now. No live LLM, no live SAP system, no user-provided prompts.
- Hosted at `live-arc-1.arc-mcp.com` on GitHub Pages.
- Developer scenarios use a VS Code inspired shell.
- End-user scenarios use Microsoft Copilot inspired shells, especially Teams and Outlook.
- Users can only choose predefined scenarios and predefined decisions between steps.
- Decisions should feel like approvals, drilldowns, and branch choices, not freeform chat.

## Product Goal

Build a deterministic, cheap, low-risk public showcase for ARC-1 that feels interactive but never calls an LLM or SAP system. The site should let visitors replay realistic ARC-1 workflows with visible chat, tool calls, SAP evidence, diffs, approvals, and final outcomes.

The core idea:

```text
User selects a scenario
  -> sees it inside a familiar client shell
  -> watches an ARC-1 tool trace unfold
  -> chooses from a few predefined decisions
  -> sees the resulting evidence, diff, report, or reply
```

This demonstrates what ARC-1 enables while keeping operating cost near zero.

## Non-Goals

- No hosted model calls in v1.
- No authentication.
- No SAP credentials.
- No MCP connection from the browser.
- No editable prompt box beyond replaying predefined user messages.
- No "try arbitrary object name" mode.
- No server APIs, route handlers, server actions, or dynamic rendering that would break static export.
- No pixel-perfect Microsoft or VS Code clone. Use familiar visual language, not trademark-sensitive impersonation.

## Research Summary

### assistant-ui

assistant-ui is a good fit because it provides React chat primitives, runtime state management, and tool-call UI hooks while still allowing a custom backend/runtime.

Relevant findings:

- The official docs describe assistant-ui as React components, runtimes, and primitives for production AI chat experiences.
- The CLI can scaffold new projects with `npx assistant-ui@latest create`, including minimal and MCP templates.
- For this replay-only app, use the minimal starter or add assistant-ui to a standard Next.js app. Do not use the MCP template for v1 because it implies live server integration.
- `ExternalStoreRuntime` is the right runtime pattern because the app owns scenario state and converts it into assistant-ui messages.
- Tool UI can be registered as UI-only for existing/backend tools, which fits replayed ARC-1 tool calls.
- ExternalStoreRuntime best practices from the docs: immutable updates, stable handlers via `useCallback`, and shallow store selectors when using Zustand.

Sources:

- https://www.assistant-ui.com/docs
- https://www.assistant-ui.com/docs/runtimes/custom/external-store
- https://www.assistant-ui.com/docs/tools/tool-ui
- https://github.com/assistant-ui/assistant-ui

### Next.js Static Export

GitHub Pages requires a static site. Next.js supports this with `output: 'export'`, generating an `out` folder from `next build`.

Relevant constraints:

- Use static export only.
- Avoid API routes, server-side data fetching, rewrites, redirects, custom headers, ISR, and default `next/image` optimization.
- If using `next/image`, configure `images.unoptimized: true` or use plain `img` tags for replay assets.
- Use generated static routes for scenario pages.
- Use `trailingSlash: true` so static hosting paths are predictable.

Sources:

- https://nextjs.org/docs/pages/guides/static-exports
- https://github.com/nextjs/deploy-github-pages

### GitHub Pages And Custom Domain

For `live-arc-1.arc-mcp.com`, configure the repository Pages settings with the custom domain before changing DNS.

Recommended setup:

- GitHub Pages source: GitHub Actions.
- DNS: CNAME record:

```text
Name: live-arc-1
Type: CNAME
Value: arc-mcp.github.io
```

Assumption: the repository is published from the `arc-mcp` GitHub organization. If the repo lives under another owner, use that owner's default Pages domain instead.

Important GitHub Pages details:

- Add the custom domain in GitHub first to reduce takeover risk.
- For a subdomain, GitHub recommends a CNAME to `<user>.github.io` or `<organization>.github.io`, not to a repository path.
- Avoid wildcard DNS records.
- Enable HTTPS after GitHub provisions the certificate.
- With a custom GitHub Actions workflow, a `CNAME` file is not required. The Pages setting is the source of truth.

Sources:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages

### Theme Libraries

Use lightweight theme code rather than heavy product clones.

Recommended:

- VS Code theme: CSS layout plus `@vscode/codicons` for familiar product icons.
- Teams, Outlook, Copilot shells: Fluent-inspired layout and `@fluentui/react-icons`; optionally use selected `@fluentui/react-components` for buttons, tabs, personas, menus, and message bars.
- Keep assistant-ui as the chat layer. Theme shells should wrap it, not replace it.

Sources:

- https://code.visualstudio.com/api/references/icons-in-labels
- https://www.npmjs.com/package/@vscode/codicons
- https://fluent2.microsoft.design/components/web/react/
- https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/design/design-teams-app-ui-templates

## Recommended Stack

```text
Framework:        Next.js App Router, static export
Language:         TypeScript
Package manager:  pnpm
Chat UI:          assistant-ui
Replay runtime:   custom ExternalStoreRuntime adapter
State:            Zustand or a small reducer-based store
Styling:          Tailwind CSS plus CSS variables
Icons:            lucide-react, @vscode/codicons, @fluentui/react-icons
Validation:       zod for scenario schema validation
Testing:          Vitest for graph/schema tests, Playwright for visual smoke tests
Deploy:           GitHub Actions -> GitHub Pages
```

Use Zustand if the replay graph, panels, and branch state start to spread across many components. A local reducer is enough for the first prototype, but assistant-ui ExternalStoreRuntime pairs naturally with an external store, so Zustand is a reasonable default.

## Repository Shape

Recommended initial structure:

```text
live-arc-1/
  app/
    layout.tsx
    page.tsx
    scenarios/
      [scenarioId]/
        page.tsx
  components/
    assistant/
      ArcReplayRuntimeProvider.tsx
      ArcToolRenderer.tsx
      DecisionPrompt.tsx
    shells/
      VscodeShell.tsx
      TeamsShell.tsx
      OutlookShell.tsx
      CopilotShell.tsx
    replay/
      ScenarioPicker.tsx
      ScenarioPlayer.tsx
      EvidencePanel.tsx
      DiffPanel.tsx
      TransportPanel.tsx
      SourcePanel.tsx
      Timeline.tsx
  lib/
    scenarios/
      schema.ts
      loader.ts
      player.ts
      convert-to-assistant-ui.ts
    sources.ts
  scenarios/
    manifest.json
    developer-method-surgery.json
    developer-cds-impact.json
    developer-pr-review.json
    copilot-sharepoint-impact.json
    outlook-dump-triage.json
    teams-clean-core.json
    segw-to-rap-guided.json
  public/
    assets/
      scenarios/
        ...
  tests/
    scenario-graph.test.ts
    scenario-assets.test.ts
  .github/
    workflows/
      deploy.yml
  next.config.ts
  package.json
  README.md
```

For v1, scenario JSON should live in the repo and be imported statically. Later, an exporter can generate replay JSON from ARC-1 eval fixtures.

## Scaffold Commands For Implementation

Use this when implementation starts:

```bash
cd /Users/marianzeis/DEV
pnpm dlx assistant-ui@latest create live-arc-1 -t minimal
cd live-arc-1
pnpm add zod zustand lucide-react @fluentui/react-icons @fluentui/react-components @vscode/codicons
pnpm add -D vitest playwright @playwright/test
```

If the assistant-ui CLI template changes or pulls in live AI SDK assumptions, fall back to:

```bash
pnpm create next-app@latest live-arc-1 --ts --app --tailwind --eslint --src-dir --import-alias "@/*"
cd live-arc-1
pnpm dlx assistant-ui@latest init
pnpm add @assistant-ui/react zod zustand lucide-react @fluentui/react-icons @fluentui/react-components @vscode/codicons
```

## Next.js Configuration

Use static export. The official Next.js GitHub Pages template uses `PAGES_BASE_PATH` from `actions/configure-pages`. Keep that pattern so the app works both on a GitHub Pages project path and on the final custom domain.

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const pagesBasePath = process.env.PAGES_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath ? `${pagesBasePath}/` : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

Notes:

- For `https://live-arc-1.arc-mcp.com`, the base path should be empty.
- For `https://arc-mcp.github.io/live-arc-1/`, the base path is expected to be `/live-arc-1`.
- Avoid hardcoding either path.

## GitHub Actions Deployment

Use GitHub's official Pages actions, not a third-party deploy action.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Next.js site to Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Pages
        id: setup_pages
        uses: actions/configure-pages@v5

      - name: Build
        run: pnpm run build
        env:
          PAGES_BASE_PATH: ${{ steps.setup_pages.outputs.base_path }}
          NEXT_TELEMETRY_DISABLED: 1

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Repository settings:

1. Settings -> Pages.
2. Source -> GitHub Actions.
3. Custom domain -> `live-arc-1.arc-mcp.com`.
4. Save.
5. Add DNS CNAME after the custom domain is configured.
6. Wait for certificate provisioning.
7. Enable Enforce HTTPS.

## UX Model

The first screen should be the demo, not a marketing landing page.

Desktop layout:

```text
+--------------------------------------------------------------+
| Top bar: Live ARC-1 Replay | Theme | Scenario | Progress      |
+---------------+------------------------------+---------------+
| Scenario list | Themed client shell + chat    | Evidence panel |
|               |                              | tool trace     |
|               |                              | source/diff    |
+---------------+------------------------------+---------------+
```

Mobile layout:

```text
Top bar
Scenario selector
Chat
Tabs: Trace | Evidence | Diff | Source
```

The chat is the narrative spine. The evidence panel is where ARC-1 becomes concrete.

## Theme Shells

### VS Code Shell

Use for developer scenarios.

Visual elements:

- Activity bar with Explorer, Search, Source Control, Run, Extensions icons.
- Explorer tree with package/object names.
- Editor tabs for ABAP objects, diffs, and test output.
- Bottom panel with Problems, Output, Terminal, ARC-1 Trace.
- Chat panel on the right, similar to an IDE assistant sidebar.

Use cases:

- Method-level surgery.
- CDS impact analysis.
- PR review with SAP context.
- SEGW-to-RAP guided migration.

Implementation notes:

- Use CSS variables modeled after VS Code dark theme.
- Use `@vscode/codicons` for icons.
- Use monospace snippets and stable panel sizes.
- Avoid embedding a real editor unless needed. Static `<pre>` panels are enough for v1.

### Teams Shell

Use for business-facing Copilot scenarios that start in chat or channel context.

Visual elements:

- Left rail with Activity, Chat, Teams, Calendar, Files.
- Channel/chat header.
- Conversation feed.
- Copilot pane or app tab area.
- SharePoint document or Jira ticket preview in the side panel.

Use cases:

- SharePoint change request to impact analysis.
- Clean Core readiness summary for architect/team lead.
- Transport or release-risk lookup.

Implementation notes:

- Use Fluent-inspired spacing, typography, and controls.
- Use `@fluentui/react-icons`.
- Keep it recognizable but not a pixel-perfect Teams clone.

### Outlook Shell

Use for support and incident scenarios that start from email.

Visual elements:

- Mail folder list.
- Message list.
- Selected email or ticket-like message.
- Copilot replay pane.
- Draft reply panel after ARC-1 analysis.

Use cases:

- Short dump diagnosis from support email.
- "Can we approve this change?" impact summary.

### Copilot Shell

Use as a neutral end-user shell when the exact host is less important.

Visual elements:

- Simple Copilot-style chat with attached enterprise sources.
- Source chips: SharePoint, Jira, SAP Docs, ARC-1.
- Tool trace collapsed by default.

Use cases:

- Generic end-user impact analysis.
- Clean Core readiness.
- Quality report.

## Replay Runtime Design

The app should treat replay as a graph, not a linear transcript. A graph supports predefined choices without allowing arbitrary prompts.

Concept:

```text
Scenario
  has nodes
  has a start node
  may include decisions
Decision
  has options
  each option points to another node
Player
  appends nodes into visible chat/tool/panel state
```

### Scenario Schema

Use Zod to validate all scenario JSON at build/test time.

Draft TypeScript shape:

```ts
export type ScenarioTheme = 'vscode' | 'teams' | 'outlook' | 'copilot';

export type ReplayNode =
  | UserMessageNode
  | AssistantMessageNode
  | ToolCallNode
  | PanelNode
  | DecisionNode;

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  theme: ScenarioTheme;
  audience: 'developer' | 'architect' | 'consultant' | 'support' | 'release-manager';
  estimatedMinutes: number;
  tags: string[];
  sourceRefs: SourceRef[];
  startNodeId: string;
  nodes: Record<string, ReplayNode>;
}

export interface SourceRef {
  label: string;
  kind: 'arc-repo' | 'blog' | 'eval' | 'external-doc' | 'asset';
  url?: string;
  localPath?: string;
}

export interface BaseNode {
  id: string;
  next?: string;
  delayMs?: number;
}

export interface UserMessageNode extends BaseNode {
  type: 'user-message';
  text: string;
}

export interface AssistantMessageNode extends BaseNode {
  type: 'assistant-message';
  markdown: string;
  highlights?: string[];
}

export interface ToolCallNode extends BaseNode {
  type: 'tool-call';
  toolName:
    | 'SAPRead'
    | 'SAPSearch'
    | 'SAPWrite'
    | 'SAPActivate'
    | 'SAPNavigate'
    | 'SAPQuery'
    | 'SAPTransport'
    | 'SAPGit'
    | 'SAPContext'
    | 'SAPLint'
    | 'SAPDiagnose'
    | 'SAPManage';
  callId: string;
  args: Record<string, unknown>;
  result: unknown;
  resultFormat: 'text' | 'json' | 'diff' | 'table' | 'mermaid';
  simulatedDurationMs?: number;
}

export interface PanelNode extends BaseNode {
  type: 'panel';
  panel:
    | SourcePanel
    | DiffPanel
    | TablePanel
    | MermaidPanel
    | EmailPanel
    | SharePointPanel
    | TicketPanel
    | TransportPanel
    | ReportPanel;
}

export interface DecisionNode extends BaseNode {
  type: 'decision';
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    next: string;
    recommended?: boolean;
  }>;
}
```

Scenario graph tests must enforce:

- `startNodeId` exists.
- Every `next` target exists.
- Every decision option target exists.
- Every asset path exists.
- No unbounded loops.
- All tool calls use known ARC-1 tool names.
- No scenario uses live URLs as execution endpoints.

## assistant-ui Integration

Use `useExternalStoreRuntime`.

Recommended runtime flow:

```text
Scenario store owns:
  selected scenario id
  visited node ids
  visible replay messages
  current tool call states
  current side panel
  active decision, if any
  isRunning

ExternalStoreRuntime receives:
  messages converted to ThreadMessageLike
  onNew disabled or constrained to predefined prompts
  onAddToolResult only if needed for tool UI state
```

For v1, the composer should not be a normal free-text input. Use one of these:

1. Hide the composer and show decision buttons in the assistant message.
2. Render the composer disabled with placeholder text: `Replay mode - choose one of the actions above`.
3. Allow clicking predefined prompt chips that submit exact known text.

Recommended: option 1 for clarity.

Tool-call rendering:

- Register UI-only backend tool renderers for ARC-1 tool names.
- Show arguments in a compact structured block.
- Show simulated status: queued -> running -> complete.
- Show results in the evidence panel and optionally inline in chat.
- Group multi-call sequences under a collapsible "ARC-1 tool trace".

Tool UI types:

```text
SAPContext     -> dependency graph, impact graph, compressed context summary
SAPRead        -> source excerpt, table metadata, diff, KTD
SAPWrite       -> proposed or simulated mutation result, diff
SAPDiagnose    -> syntax, unit, ATC, ST22 result cards
SAPTransport   -> transport history and lock owner card
SAPSearch      -> object search result list
SAPLint        -> lint findings and formatter notes
SAPActivate    -> activation log
```

## Scenario Catalog

### V1 Developer Scenarios

#### 1. VS Code: Method-Level Surgery

Purpose:
Show token-efficient class understanding and a surgical method edit.

Source material:

- ARC-1 eval: `tests/evals/scenarios/context-deps.ts`
- ARC-1 eval: `tests/evals/scenarios/write.ts`
- ARC-1 eval: `tests/evals/scenarios/diagnose.ts`

Replay prompt:

```text
Update get_name in ZCL_CUSTOMER to return first_name && last_name.
```

Main ARC-1 trace:

```text
SAPContext(type="CLAS", name="ZCL_CUSTOMER")
SAPRead(type="CLAS", name="ZCL_CUSTOMER", method="GET_NAME")
SAPWrite(action="edit_method", type="CLAS", name="ZCL_CUSTOMER", method="GET_NAME")
SAPDiagnose(action="syntax", type="CLAS", name="ZCL_CUSTOMER")
SAPDiagnose(action="unittest", type="CLAS", name="ZCL_CUSTOMER")
```

Decision points:

- "Inspect dependencies first" vs "Open method directly".
- "Show method diff" vs "Show test result".
- "Simulate apply" vs "Stop at proposal".

Panels:

- Explorer tree with `ZCL_CUSTOMER`.
- Method source before/after.
- Unified diff.
- Syntax/unit result.

#### 2. VS Code: CDS Impact Analysis

Purpose:
Show why `SAPContext(action="impact")` exists and why ARC-1 avoids bad SQL scans.

Source material:

- ARC-1 eval: `tests/evals/scenarios/context-impact.ts`

Replay prompt:

```text
What breaks if I change CDS view I_COUNTRY?
```

Main ARC-1 trace:

```text
SAPContext(action="impact", type="DDLS", name="I_COUNTRY")
```

Decision points:

- "Show downstream consumers".
- "Show upstream data sources".
- "Show anti-pattern avoided".

Panels:

- CDS impact graph.
- Consumer list: projection views, ABAP consumers, metadata extensions.
- Callout explaining that the model should not scan `DDDDLSRC` with `SAPQuery`.

#### 3. VS Code: PR Review With Real SAP Context

Purpose:
Show ARC-1 as the missing SAP-system context layer in GitHub review automation.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-12-arc-1-abap-cicd-review/index.md`
- Public sample repo: https://github.com/marianfoo/arc-1-abap-cicd-review

Replay prompt:

```text
Review this ABAP PR with live SAP context.
```

Main ARC-1 trace:

```text
SAPRead(type="CLAS", name="ZCL_ARC1_TASK_SERVICE", method="LIST_TASKS")
SAPDiagnose(action="unittest", type="CLAS", name="ZCL_ARC1_TASK_SERVICE")
SAPDiagnose(action="atc", type="CLAS", name="ZCL_ARC1_TASK_SERVICE")
SAPNavigate(action="references", type="CLAS", name="ZCL_ARC1_TASK_SERVICE")
```

Decision points:

- "Check activated SAP source".
- "Inspect PR diff only".
- "Post suggested review comment".

Panels:

- GitHub PR diff.
- Activated SAP method excerpt.
- Drift check result.
- Review comment with evidence.

#### 4. VS Code: SEGW to RAP Guided Migration

Purpose:
Long-form hero scenario showing ARC-1 as a workflow engine for modernization, not just a single tool call.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-11-segw-to-rap/index.md`
- Public demo repo: https://github.com/marianfoo/arc-1-segw-to-rap
- ARC-1 fixture package: `ZDEMO_MIG`

Replay prompt:

```text
Migrate ZDEMO_MIG_PROJECTS_SRV from SEGW to RAP.
```

Main ARC-1 trace:

```text
SAPManage(action="features")
SAPSearch(query="ZDEMO_MIG_PROJECTS")
SAPRead(type="CLAS", name="ZCL_ZDEMO_MIG_PROJECTS_MPC")
SAPRead(type="CLAS", name="ZCL_ZDEMO_MIG_PROJECTS_DPC_EXT")
SAPWrite(action="batch_create", activateAtEnd=true, ...)
SAPActivate(...)
SAPDiagnose(action="syntax", ...)
```

Decision points:

- "Show extracted legacy model" vs "Show source evidence".
- "Approve generated RAP plan" vs "Stop before writes".
- "Open generated service binding" vs "Open Fiori Elements result".

Panels:

- SEGW model summary.
- Extracted entity graph.
- Proposed RAP artifact table.
- Activation log.
- Screenshots from the blog/demo repo.

Note:
This can be v1.1 if v1 needs to stay smaller. It is the strongest story, but it needs careful curation.

### V1 End-User Scenarios

#### 5. Teams: SharePoint Change Request To Impact Analysis

Purpose:
Show ARC-1 for solution architects and functional consultants in Microsoft 365.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-05-arc-1-copilot-studio/index.md`
- Use Case 2: SharePoint change request impact analysis.

Replay prompt:

```text
Read the change request in IT/Clean Core/ and tell me what would break.
```

Main ARC-1 trace:

```text
SAPSearch(query="ZARC1_DEMO_AMOUNT_DOM")
SAPRead(type="DOMA", name="ZARC1_DEMO_AMOUNT_DOM")
SAPNavigate(action="references", type="DOMA", name="ZARC1_DEMO_AMOUNT_DOM")
SAPContext(action="impact", ...)
```

Decision points:

- "Show dependency chain".
- "Draft Teams summary".
- "Open technical risk details".

Panels:

- SharePoint memo preview.
- Teams thread summary.
- Domain -> data element -> table -> report chain.
- Risks: activation order, table lock, output length, hardcoded layout.

#### 6. Outlook: Short Dump Diagnosis From Support Mail

Purpose:
Show ARC-1 for support workflows starting from weak incident descriptions.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-05-arc-1-copilot-studio/index.md`
- Use Case 5: short dump diagnosis from Jira ticket.

Replay prompt:

```text
Investigate this overnight dump and draft a fix summary.
```

Main ARC-1 trace:

```text
SAPDiagnose(action="dumps")
SAPRead(type="PROG", name="ZARC1_DEMO_DUMP_RPT")
SAPDiagnose(action="syntax", type="PROG", name="ZARC1_DEMO_DUMP_RPT")
SAPWrite(action="update", type="PROG", name="ZARC1_DEMO_DUMP_RPT")  // simulated branch only
```

Decision points:

- "Open ST22 evidence".
- "Show root cause".
- "Draft Outlook reply".
- "Simulate defensive patch" vs "Stop at proposal".

Panels:

- Outlook email preview.
- ST22 dump card.
- ABAP source excerpt.
- Defensive validation diff.
- Draft reply.

#### 7. Teams: Clean Core Readiness

Purpose:
Show non-developer value: architecture and modernization planning from real custom code plus SAP guidance.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-05-arc-1-copilot-studio/index.md`
- Use Case 6: Clean Core readiness check.
- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-08-arc-1-joule-studio-clean-core/index.md`

Replay prompt:

```text
Is ZCL_ARC1_DEMO_CCORE clean-core ready?
```

Main ARC-1 trace:

```text
SAPRead(type="CLAS", name="ZCL_ARC1_DEMO_CCORE")
SAPContext(type="CLAS", name="ZCL_ARC1_DEMO_CCORE")
SAPRead(type="API_STATE", name="USR02")
SAPDiagnose(action="atc", type="CLAS", name="ZCL_ARC1_DEMO_CCORE")
```

Decision points:

- "Show evidence table".
- "Show recommended released APIs".
- "Create modernization backlog item".
- "Draft Teams message".

Panels:

- Clean Core risk card.
- Direct table access evidence.
- Released successor API suggestions.
- Backlog item draft.

#### 8. Copilot: ABAP Code Quality Report

Purpose:
Show ARC-1 as a reporting surface for leads and quality managers.

Source material:

- Blog: `/Users/marianzeis/DEV/blog.zeis.de/content/posts/2026-05-05-arc-1-copilot-studio/index.md`
- Use Case 4: ABAP code quality report.

Replay prompt:

```text
Audit our $TMP ZARC1_DEMO_* ABAP programs and prepare a quality report.
```

Main ARC-1 trace:

```text
SAPSearch(query="ZARC1_DEMO_*")
SAPRead(...)
SAPDiagnose(action="atc", ...)
SAPLint(action="check", ...)
```

Decision points:

- "Sort by risk".
- "Show ATC findings".
- "Show abaplint findings".
- "Export Markdown report" (simulated static download).

Panels:

- Risk table.
- Markdown report.
- Findings grouped by program.

## Scenario Source Inventory

### ARC-1 Repo

- `README.md`: positioning, tool list, security defaults, token efficiency.
- `tests/evals/README.md`: deterministic eval harness and mock backend.
- `tests/evals/scenarios/context-deps.ts`: dependency context scenario.
- `tests/evals/scenarios/context-impact.ts`: CDS impact analysis scenario.
- `tests/evals/scenarios/write.ts`: method-level edit scenario.
- `tests/evals/scenarios/diagnose.ts`: syntax/unit/dump scenarios.
- `tests/evals/scenarios/transport.ts`: transport history and lock-owner scenarios.
- `skills/README.md`: higher-level workflow catalog.
- `tests/fixtures/xml/package-contents-search.xml`: `ZDEMO_MIG` demo package anchor.

### Blog Repo

- `content/posts/2026-05-05-arc-1-copilot-studio/index.md`: Teams/Copilot/SharePoint/Jira scenarios.
- `content/posts/2026-05-08-arc-1-joule-studio-clean-core/index.md`: Clean Core and SAP-facing assistant narrative.
- `content/posts/2026-05-11-segw-to-rap/index.md`: modernization hero scenario.
- `content/posts/2026-05-12-arc-1-abap-cicd-review/index.md`: GitHub PR review with SAP context.

### Existing Assets

Potentially reusable assets from the blog repo:

- `content/posts/2026-05-05-arc-1-copilot-studio/conversations/*/*.png`
- `content/posts/2026-05-08-arc-1-joule-studio-clean-core/*.png`
- `content/posts/2026-05-11-segw-to-rap/images/*.png`
- `content/posts/2026-05-12-arc-1-abap-cicd-review/*.png`

Copy only selected, compressed assets into the new repo. Do not load large raw transcripts into the initial JS bundle.

## Decisions And Branching

Each scenario should have 1 to 3 decisions. Good decision types:

- Approval pause: "Apply simulated patch" vs "Stop at proposal".
- Evidence drilldown: "Show source" vs "Show dependency graph".
- Role framing: "Draft Teams reply" vs "Show technical details".
- Risk lens: "Sort by release risk" vs "Sort by runtime risk".

Avoid decisions that imply real execution:

- Bad: "Run this against my SAP system".
- Bad: "Enter object name".
- Bad: "Ask anything".

Good wording:

```text
This is a replay. Choose the next branch:
[Show the SAP evidence] [Show the proposed diff] [Draft the Teams summary]
```

## Data Loading Strategy

Keep scenario loading lazy.

Recommended:

- `scenarios/manifest.json` is small and loaded on the homepage.
- Each full scenario JSON is dynamically imported only when selected.
- Images are referenced by URL under `/assets/scenarios/...`.
- Long text transcripts are not included unless curated and shortened.

This keeps the initial GitHub Pages load small.

## URL Design

Recommended routes:

```text
/                         scenario picker + default featured replay
/scenarios/[scenarioId]/  direct replay link
```

Optional query params:

```text
?theme=vscode
?path=deps,diff,tests
```

Do not rely on client-only catch-all routing. Generate static scenario routes from `manifest.json`.

## Analytics

Optional. If added, keep it privacy-light.

Useful events:

- `scenario_started`
- `scenario_completed`
- `decision_selected`
- `theme_selected`
- `source_link_clicked`

Avoid:

- keystroke logging.
- any free-text capture.
- session recording.

If PostHog is reused from `arc-1-mcp.com`, make it opt-in or document it clearly.

## Accessibility

Minimum expectations:

- Keyboard navigable decision buttons.
- Visible focus states.
- Semantic buttons, tabs, nav, and headings.
- Reduced-motion support for replay animations.
- Replay speed control: `1x`, `2x`, `instant`.
- Pause/resume.
- Tool-call status is text, not color-only.

## Visual Design Guidance

Keep the app dense, operational, and evidence-focused.

Do:

- Use split panes and tabs.
- Use tool trace and source panels.
- Use compact typography.
- Use restrained color.
- Keep repeated scenario items as cards if useful.

Avoid:

- Marketing hero as first screen.
- Decorative gradients/orbs.
- Giant product-value headlines.
- UI cards inside UI cards.
- Text explaining how to use every control.

The product should immediately feel like an interactive workbench.

## Validation And Tests

### Unit Tests

Use Vitest.

Test:

- Scenario schema validation.
- No orphan graph nodes.
- No missing assets.
- All scenario IDs in manifest resolve to JSON files.
- All tool names are valid ARC-1 tools.
- All decision targets exist.
- No scenario contains unsupported live endpoint fields.

### Visual Smoke Tests

Use Playwright.

Test:

- Homepage renders.
- Each scenario route renders.
- Each theme shell renders at desktop width.
- Mobile layout uses tabs and has no overlapping panels.
- Decision buttons advance the replay.
- Evidence panel updates after a tool call.

Run against static output:

```bash
pnpm build
pnpm dlx serve out
pnpm playwright test
```

### Manual QA

Before launch:

- Check the site at default GitHub Pages URL.
- Check the custom domain after DNS/TLS.
- Verify hard refresh on scenario routes.
- Verify browser back/forward.
- Verify mobile Safari and Chrome.
- Verify no network calls except static assets and optional analytics.

## Implementation Milestones

### Milestone 1: Static Deployment Proof

Deliver:

- Next.js static export builds locally.
- GitHub Actions deploys to Pages.
- Custom domain configured.
- One placeholder scenario route works.

Acceptance:

- `https://live-arc-1.arc-mcp.com` loads over HTTPS.
- Hard refresh on `/scenarios/developer-cds-impact/` works.

### Milestone 2: Replay Engine

Deliver:

- Scenario schema.
- Scenario loader.
- Scenario graph player.
- Decision node support.
- Basic assistant-ui ExternalStoreRuntime integration.

Acceptance:

- A JSON scenario can play from start to finish.
- A decision can branch to two different outcomes.
- No free text input is available.

### Milestone 3: ARC-1 Tool UI

Deliver:

- Tool-call renderer.
- Tool trace panel.
- JSON/table/diff/source result renderers.
- Simulated running/complete states.

Acceptance:

- `SAPContext`, `SAPRead`, `SAPWrite`, `SAPDiagnose`, and `SAPTransport` calls have specific renderers.
- Unknown tools fall back to a generic structured renderer.

### Milestone 4: Theme Shells

Deliver:

- VS Code shell.
- Teams shell.
- Outlook shell.
- Copilot shell.

Acceptance:

- Theme can be set per scenario.
- Desktop and mobile layouts do not overlap.
- Shells are recognizable but not pixel-perfect product clones.

### Milestone 5: First Scenario Set

Deliver:

- Developer method surgery.
- CDS impact analysis.
- Teams SharePoint impact.
- Outlook dump triage.
- Teams Clean Core readiness.

Acceptance:

- Each scenario has at least one decision.
- Each scenario has source references.
- Each scenario ends with a concrete outcome.

### Milestone 6: Hero Scenario

Deliver:

- SEGW to RAP guided migration replay.

Acceptance:

- Shows discovery before generation.
- Shows approval pause before simulated writes.
- Shows generated artifact plan and final OData V4/Fiori result.

## Future Live Mode

Not in v1.

If a live mode is added later, do it as a separate clearly labeled path:

```text
Replay mode: public, free, deterministic
Live mode: authenticated, rate-limited, explicit cost controls
```

Likely live stack later:

- LibreChat for login/model routing/user quotas.
- ARC-1 read-only endpoint.
- Cheap model by default.
- BYOK optional.

Do not mix replay and live mode in the same chat surface without strong labeling.

## Open Decisions

1. GitHub organization and repository name:
   - Recommended: `arc-mcp/live-arc-1`.
   - Confirm the Pages default domain should be `arc-mcp.github.io`.

2. Analytics:
   - None for v1, or reuse PostHog from `arc-1-mcp.com`.

3. First release scope:
   - Small v1 with five scenarios, then SEGW-to-RAP as v1.1.
   - Or launch with SEGW-to-RAP included as the hero.

4. Brand assets:
   - Decide whether to use official product logos. Safer default: use text labels and generic icons.

5. Scenario exporter:
   - Manual JSON first.
   - Later: script to convert selected ARC-1 eval scenarios into replay JSON.

## Recommendation

Build v1 as a static replay workbench with five scenarios:

1. VS Code method-level surgery.
2. VS Code CDS impact analysis.
3. Teams SharePoint change request impact.
4. Outlook short dump triage.
5. Teams Clean Core readiness.

Then add the SEGW-to-RAP guided migration as the launch hero or first follow-up. It is the strongest narrative, but it deserves careful curation because it is a multi-phase workflow.

The key implementation decision is to use assistant-ui only as the chat/rendering layer and own all replay state with a custom ExternalStoreRuntime. That keeps the app static, deterministic, cheap, and maintainable.
