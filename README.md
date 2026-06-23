# Live ARC-1 Replay

Static interactive replay site for ARC-1 scenarios.

- Target URL: <https://live-arc-1.arc-1-mcp.com>
- Stack: Next.js static export, assistant-ui, TypeScript
- Deployment: GitHub Pages via GitHub Actions
- Mode: replay only; no live LLM, no live SAP system, no credentials

## Local Development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Scenario Design

Users land directly in the replay workbench. The scenario library is visible first and every scenario can be opened directly via `/scenarios/<id>/`.

Developer scenarios use a VS Code inspired shell. End-user scenarios use Teams, Outlook, or Copilot inspired shells. Each replay shows predefined chat turns, ARC-1 tool calls, SAP evidence panels, and small decision branches.

Scenarios are grouped by workflow lane: understanding, build and test, modernization, governance, operations, analytics, and business impact. The active scenario's group is shown first so direct links stay easy to orient on desktop and mobile.

The first scenario is dependency-first by design: it shows `SAPContext`, `SAPRead(grep)`, and `SAPNavigate(references)` around a class before any write scenario. Longer sample paths cover Claude/GitHub PR review, SEGW/UI5/RAP modernization, package Clean Core backlog, transport release risk, and analytics generation.
