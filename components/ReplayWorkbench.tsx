'use client';

import Link from 'next/link';
import {
  AssistantRuntimeProvider,
  type ThreadMessageLike,
  useExternalStoreRuntime
} from '@assistant-ui/react';
import {
  Bot24Regular,
  Chat24Regular,
  Code24Regular,
  Document24Regular,
  Mail24Regular,
  People24Regular,
  Sparkle24Regular
} from '@fluentui/react-icons';
import {
  Activity,
  CirclePlay,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  RefreshCw,
  StepForward,
  Wrench
} from 'lucide-react';
import { type Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultScenarioId, getScenario, scenarios } from '@/lib/scenarios/data';
import type {
  DecisionNode,
  McpServerId,
  ReplayGraph,
  ReplayNode,
  ReplayPanel,
  Scenario,
  ScenarioGroup,
  ToolNode
} from '@/lib/scenarios/types';

type VisibleEvent =
  | {
      kind: 'node';
      nodeId: string;
    }
  | {
      kind: 'choice';
      id: string;
      decisionId: string;
      optionId: string;
      prompt: string;
      label: string;
    };

type Speed = '1x' | '2x' | 'instant';

const toolServerLabels = {
  'arc-1': 'ARC-1',
  'sap-docs': 'SAP Docs',
  'ui5-mcp': 'UI5 MCP',
  'fiori-mcp': 'Fiori MCP'
} satisfies Record<McpServerId, string>;

const scenarioGroupOrder: ScenarioGroup[] = [
  'Understanding',
  'Build & Test',
  'Modernization',
  'Governance',
  'Operations',
  'Analytics',
  'Business Impact'
];

function groupScenarios(activeGroup: ScenarioGroup) {
  const orderedGroups = [activeGroup, ...scenarioGroupOrder.filter((group) => group !== activeGroup)];
  return orderedGroups
    .map((group) => ({
      group,
      items: scenarios.filter((scenario) => scenario.group === group)
    }))
    .filter((group) => group.items.length > 0);
}

interface ReplayState {
  events: VisibleEvent[];
  currentNodeId?: string;
  activeDecision?: DecisionNode;
  activePanel?: ReplayPanel;
  isPlaying: boolean;
  speed: Speed;
}

interface VscodeWorkspaceEntry {
  label: string;
  depth?: 0 | 1 | 2;
  active?: boolean;
}

interface VscodeWorkspace {
  root: string;
  commandCenter: string;
  entries: VscodeWorkspaceEntry[];
  tabs: Array<{
    label: string;
    active?: boolean;
  }>;
  variant?: 'migration';
}

const initialState = (scenario: Scenario): ReplayState => ({
  events: [],
  currentNodeId: scenario.startNodeId,
  activePanel: undefined,
  activeDecision: undefined,
  isPlaying: false,
  speed: '1x'
});

export function ReplayWorkbench({ initialScenarioId }: { initialScenarioId: string }) {
  const scenario = getScenario(initialScenarioId) ?? getScenario(defaultScenarioId) ?? scenarios[0];
  const [state, setState] = useState<ReplayState>(() => initialState(scenario));
  const [scenariosOpen, setScenariosOpen] = useState(true);
  const groupedScenarios = useMemo(() => groupScenarios(scenario.group), [scenario.group]);

  useEffect(() => {
    setState(initialState(scenario));
  }, [scenario]);

  const visibleNodes = useMemo(
    () =>
      state.events
        .filter((event): event is Extract<VisibleEvent, { kind: 'node' }> => event.kind === 'node')
        .map((event) => scenario.nodes[event.nodeId])
        .filter(Boolean),
    [scenario, state.events]
  );

  const toolNodes = visibleNodes.filter((node): node is ToolNode => node.type === 'tool');
  const progress = Math.min(100, Math.round((state.events.length / Math.max(Object.keys(scenario.nodes).length - 1, 1)) * 100));

  const assistantMessages = useMemo(() => toAssistantMessages(scenario, state.events), [scenario, state.events]);
  const runtime = useExternalStoreRuntime({
    messages: assistantMessages,
    convertMessage: (message) => message,
    isDisabled: true,
    isSendDisabled: true,
    isRunning: state.isPlaying,
    onNew: async () => undefined
  });

  const advanceOne = useCallback(() => {
    setState((current) => {
      if (!current.currentNodeId) {
        return { ...current, isPlaying: false };
      }

      const node = scenario.nodes[current.currentNodeId];
      if (!node) {
        return { ...current, currentNodeId: undefined, isPlaying: false };
      }

      if (node.type === 'decision') {
        return { ...current, activeDecision: node, isPlaying: false };
      }

      const nextEvents = [...current.events, { kind: 'node' as const, nodeId: node.id }];
      const nextPanel = node.type === 'tool' && node.panel ? node.panel : node.type === 'panel' ? node.panel : current.activePanel;

      return {
        ...current,
        events: nextEvents,
        currentNodeId: node.next,
        activePanel: nextPanel,
        isPlaying: Boolean(node.next)
      };
    });
  }, [scenario]);

  useEffect(() => {
    if (!state.isPlaying) {
      return;
    }

    const delay = state.speed === 'instant' ? 25 : state.speed === '2x' ? 520 : 920;
    const timeout = window.setTimeout(advanceOne, delay);
    return () => window.clearTimeout(timeout);
  }, [advanceOne, state.currentNodeId, state.isPlaying, state.speed]);

  const start = () => setState((current) => ({ ...current, isPlaying: Boolean(current.currentNodeId) }));
  const pause = () => setState((current) => ({ ...current, isPlaying: false }));
  const reset = () => setState(initialState(scenario));
  const step = () => advanceOne();
  const setSpeed = (speed: Speed) => setState((current) => ({ ...current, speed }));
  const choose = (decision: DecisionNode, optionId: string) => {
    const option = decision.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return;
    }
    setState((current) => ({
      ...current,
      events: [
        ...current.events,
        {
          kind: 'choice',
          id: `${decision.id}-${option.id}-${current.events.length}`,
          decisionId: decision.id,
          optionId: option.id,
          prompt: decision.prompt,
          label: option.label
        }
      ],
      currentNodeId: option.next,
      activeDecision: decision,
      isPlaying: true
    }));
  };

  const exploredDecisionOptions = useMemo(() => {
    if (!state.activeDecision) {
      return new Set<string>();
    }

    return new Set(
      state.events
        .filter((event): event is Extract<VisibleEvent, { kind: 'choice' }> => event.kind === 'choice')
        .filter((event) => event.decisionId === state.activeDecision?.id)
        .map((event) => event.optionId)
    );
  }, [state.activeDecision, state.events]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className={`workbench theme-${scenario.theme} ${scenariosOpen ? '' : 'scenarios-collapsed'}`}>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">ARC</span>
            <span>
              <strong>Live ARC-1 Replay</strong>
              <small>Static scenarios, real SAP tool patterns</small>
            </span>
          </Link>
          <div className="topbar-actions">
            <span className="status-pill">Replay only</span>
            <span className="status-pill">{labelForTheme(scenario.theme)}</span>
          </div>
        </header>

        <aside className="scenario-sidebar" id="scenario-sidebar" aria-label="Available scenarios">
          <div className="sidebar-heading">
            <div className="sidebar-title">
              <span>Scenarios</span>
              <small>Jump in directly</small>
            </div>
            <button
              aria-controls="scenario-sidebar"
              aria-expanded={scenariosOpen}
              className="scenario-toggle"
              onClick={() => setScenariosOpen(false)}
              type="button"
            >
              <PanelLeftClose size={16} />
              <span>Hide</span>
            </button>
          </div>
          <div className="scenario-groups">
            {groupedScenarios.map((group) => (
              <section className="scenario-group" key={group.group}>
                <h2>
                  {group.group}
                  <span>{group.items.length}</span>
                </h2>
                <div className="scenario-list">
                  {group.items.map((item) => (
                    <Link
                      aria-current={item.id === scenario.id ? 'page' : undefined}
                      className={`scenario-card ${item.id === scenario.id ? 'active' : ''}`}
                      href={`/scenarios/${item.id}/`}
                      key={item.id}
                    >
                      <div className="scenario-card-top">
                        <ThemeIcon theme={item.theme} />
                        <span>{labelForTheme(item.theme)}</span>
                        <small>{item.estimatedMinutes} min</small>
                      </div>
                      <span className="scenario-group-label">{item.group}</span>
                      <strong>{item.shortTitle}</strong>
                      <p>{item.subtitle}</p>
                      <div className="tag-row">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        {!scenariosOpen ? (
          <div className="scenario-restore-slot">
            <button
              aria-controls="scenario-sidebar"
              aria-expanded={scenariosOpen}
              aria-label="Show scenarios"
              className="scenario-toggle scenario-restore"
              onClick={() => setScenariosOpen(true)}
              title="Show scenarios"
              type="button"
            >
              <PanelLeftOpen size={16} />
              <span>Show scenarios</span>
            </button>
          </div>
        ) : null}

        <section className="replay-stage">
          <ShellFrame scenario={scenario}>
            <div className="stage-header">
              <div>
                <p className="eyebrow">{labelForAudience(scenario.audience)}</p>
                <h1>{scenario.title}</h1>
                <p>{scenario.subtitle}</p>
              </div>
              <div className="progress-block">
                <span>{progress}%</span>
                <div className="progress-track">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="control-row">
              <button className="primary-button" onClick={state.isPlaying ? pause : start} type="button">
                {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {state.isPlaying ? 'Pause' : state.events.length ? 'Resume' : 'Start replay'}
              </button>
              <button className="icon-button" onClick={step} type="button">
                <StepForward size={16} />
                Step
              </button>
              <button className="icon-button" onClick={reset} type="button">
                <RefreshCw size={16} />
                Reset
              </button>
              <div className="segmented" aria-label="Replay speed">
                {(['1x', '2x', 'instant'] as const).map((speed) => (
                  <button className={state.speed === speed ? 'active' : ''} key={speed} onClick={() => setSpeed(speed)} type="button">
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <Transcript scenario={scenario} events={state.events} />

            {state.activeDecision ? (
              <DecisionCard decision={state.activeDecision} exploredOptionIds={exploredDecisionOptions} onChoose={choose} />
            ) : null}
          </ShellFrame>
        </section>

        <aside className="evidence-panel" aria-label="ARC-1 evidence and tool calls">
          <section className="panel-section">
            <div className="panel-heading">
              <Activity size={16} />
              <span>ARC-1 + MCP calls</span>
            </div>
            <ToolTrace tools={toolNodes} />
          </section>

          <section className="panel-section grow">
            <div className="panel-heading">
              <Layers3 size={16} />
              <span>Evidence</span>
            </div>
            <EvidencePanel panel={state.activePanel} scenario={scenario} />
          </section>
        </aside>
      </main>
    </AssistantRuntimeProvider>
  );
}

function toAssistantMessages(scenario: Scenario, events: VisibleEvent[]): ThreadMessageLike[] {
  return events.map((event, index) => {
    if (event.kind === 'choice') {
      return {
        id: event.id,
        role: 'user',
        content: event.label
      };
    }

    const node = scenario.nodes[event.nodeId];
    if (!node) {
      return {
        id: `missing-${index}`,
        role: 'assistant',
        content: ''
      };
    }

    if (node.type === 'message') {
      return {
        id: node.id,
        role: node.role,
        content: node.text
      };
    }

    if (node.type === 'tool') {
      return {
        id: node.id,
        role: 'assistant',
        content: [
          { type: 'text', text: node.summary },
          {
            type: 'tool-call',
            toolCallId: node.callId,
            toolName: node.toolName,
            args: node.args as never,
            argsText: JSON.stringify(node.args),
            result: node.result
          }
        ]
      };
    }

    if (node.type === 'panel') {
      return {
        id: node.id,
        role: 'assistant',
        content: node.panel.body ?? node.panel.title
      };
    }

    return {
      id: node.id,
      role: 'assistant',
      content: node.prompt
    };
  });
}

function ShellFrame({ children, scenario }: { children: React.ReactNode; scenario: Scenario }) {
  if (scenario.theme === 'vscode') {
    const workspace = getVscodeWorkspace(scenario);

    return (
      <div
        className={[
          'client-shell vscode-shell',
          workspace.variant ? `vscode-shell-${workspace.variant}` : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="vscode-titlebar" aria-hidden="true">
          <span className="vscode-menu">File</span>
          <span>Edit</span>
          <span>View</span>
          <div className="vscode-command-center">{workspace.commandCenter}</div>
          <span className="vscode-window-dot" />
          <span className="vscode-window-dot" />
          <span className="vscode-window-dot" />
        </div>
        <div className="vscode-activitybar" aria-hidden="true">
          <span className="codicon codicon-files" />
          <span className="codicon codicon-search" />
          <span className="codicon codicon-source-control" />
          <span className="codicon codicon-debug-alt" />
          <span className="codicon codicon-extensions" />
        </div>
        <div className="vscode-explorer">
          <strong>{workspace.root}</strong>
          {workspace.entries.map((entry, index) => (
            <span
              className={`depth-${entry.depth ?? 0}${entry.active ? ' entry-active' : ''}`}
              key={`${index}-${entry.depth ?? 0}-${entry.label}`}
            >
              {entry.label}
            </span>
          ))}
        </div>
        <div className="vscode-workarea">
          <div className="vscode-tabs" aria-hidden="true">
            {workspace.tabs.map((tab) => (
              <span className={tab.active ? 'active' : ''} key={tab.label}>
                {tab.label}
              </span>
            ))}
          </div>
          <div className="client-main">{children}</div>
        </div>
      </div>
    );
  }

  if (scenario.theme === 'claude') {
    return (
      <div className="client-shell claude-shell">
        <div className="claude-topbar" aria-hidden="true">
          <strong>Claude</strong>
          <div className="claude-model-pill">Claude Sonnet</div>
          <span>ARC-1 MCP connected</span>
        </div>
        <div className="claude-sidebar" aria-hidden="true">
          <div className="claude-logo">C</div>
          <div className="claude-tabs">
            <span>Chat</span>
            <span>Code</span>
            <span className="active">Projects</span>
          </div>
          <div className="claude-history">
            <strong>ARC-1 SAP graph</strong>
            <span>Billing graph</span>
            <span>Risk edges</span>
            <span>Validation gates</span>
          </div>
        </div>
        <div className="client-main">{children}</div>
        <div className="claude-context" aria-hidden="true">
          <strong>Context</strong>
          <span>Project: SAP modernization</span>
          <span>Connector: ARC-1 MCP</span>
          <span>Artifact: Dependency graph</span>
        </div>
      </div>
    );
  }

  if (scenario.theme === 'outlook') {
    return (
      <div className="client-shell microsoft-shell outlook-shell">
        <div className="ms-rail" aria-hidden="true">
          <Mail24Regular />
          <Chat24Regular />
          <Document24Regular />
          <People24Regular />
        </div>
        <div className="mail-list" aria-hidden="true">
          <strong>Inbox</strong>
          <span>Operations</span>
          <span>Support queue</span>
          <span>SAP DEV alerts</span>
        </div>
        <div className="client-main">{children}</div>
      </div>
    );
  }

  if (scenario.theme === 'teams') {
    return (
      <div className="client-shell microsoft-shell teams-shell">
        <div className="teams-topbar" aria-hidden="true">
          <strong>Microsoft Teams</strong>
          <div>Search or type a command</div>
          <span>ARC-1 Copilot</span>
        </div>
        <div className="ms-rail" aria-hidden="true">
          <Chat24Regular />
          <Bot24Regular />
          <Document24Regular />
          <People24Regular />
        </div>
        <div className="teams-channel" aria-hidden="true">
          <strong>SAP Delivery</strong>
          <span className="active">General</span>
          <span>Clean Core</span>
          <span>Release review</span>
        </div>
        <div className="teams-thread">
          <div className="teams-thread-header" aria-hidden="true">
            <strong>SAP Delivery / General</strong>
            <span>Posts</span>
            <span>Files</span>
            <span>ARC-1</span>
          </div>
          <div className="client-main">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-shell microsoft-shell copilot-shell">
      <div className="ms-rail" aria-hidden="true">
        <Chat24Regular />
        <Bot24Regular />
        <Document24Regular />
        <People24Regular />
      </div>
      <div className="teams-channel" aria-hidden="true">
        <strong>Copilot</strong>
        <span>General</span>
        <span>Clean Core</span>
        <span>Release review</span>
      </div>
      <div className="client-main">{children}</div>
    </div>
  );
}

function getVscodeWorkspace(scenario: Scenario): VscodeWorkspace {
  if (scenario.id === 'segw-to-rap-guided') {
    return {
      root: 'arc-1-legacy-ui5-rap-conversion',
      commandCenter: 'migrate-segw-to-rap replay',
      variant: 'migration',
      entries: [
        { label: 'README.md' },
        { label: 'skills/' },
        { label: 'migrate-segw-to-rap.md', depth: 1, active: true },
        { label: 'convert-ui5-to-fiori-elements.md', depth: 1 },
        { label: 'ABAP_SRC/src/' },
        { label: 'zcl_zdemo_mig_projects_mpc.clas.abap', depth: 1 },
        { label: 'zcl_zdemo_mig_projects_dpc_ext.clas.abap', depth: 1 },
        { label: 'dm/', depth: 1 },
        { label: 'zi_dm_project.ddls.asddls', depth: 2, active: true },
        { label: 'zi_dm_task.ddls.asddls', depth: 2 },
        { label: 'zi_dm_timeentry.ddls.asddls', depth: 2 },
        { label: 'zi_dm_project.bdef.asbdef', depth: 2 },
        { label: 'zbp_dm_project.clas.locals_imp.abap', depth: 2 },
        { label: 'zui_dm_projects.srvd.srvdsrv', depth: 2 },
        { label: 'legacy-ui5-app/webapp/' },
        { label: 'controller/Detail.controller.js', depth: 1 },
        { label: 'modern-ui5-ts-app/webapp/' },
        { label: 'controller/Detail.controller.ts', depth: 1 }
      ],
      tabs: [
        { label: 'migrate-segw-to-rap.md', active: true },
        { label: 'DPC_EXT.abap' },
        { label: 'ZI_DM_PROJECT.bdef' },
        { label: 'Detail.controller.ts' }
      ]
    };
  }

  if (scenario.id === 'ui5-typescript-modernization') {
    return {
      root: 'legacy-ui5-rap-modernization',
      commandCenter: 'modernize-ui5-to-typescript replay',
      variant: 'migration',
      entries: [
        { label: 'README.md' },
        { label: 'skills/' },
        { label: 'modernize-ui5-app.md', depth: 1, active: true },
        { label: 'convert-ui5-to-fiori-elements.md', depth: 1 },
        { label: 'rap-contract/' },
        { label: 'ZUI_DM_PROJECTS_O4.srvb.json', depth: 1 },
        { label: 'ZC_DM_PROJECT.ddls.asddls', depth: 1 },
        { label: 'ZC_DM_PROJECT.bdef.asbdef', depth: 1 },
        { label: 'legacy-ui5-app/webapp/' },
        { label: 'manifest.json', depth: 1 },
        { label: 'Component.js', depth: 1 },
        { label: 'controller/App.controller.js', depth: 1 },
        { label: 'controller/Detail.controller.js', depth: 1, active: true },
        { label: 'view/Detail.view.xml', depth: 1 },
        { label: 'modern-ui5-ts-app/webapp/' },
        { label: 'manifest.json', depth: 1 },
        { label: 'controller/Detail.controller.ts', depth: 1 },
        { label: 'annotations/annotation.xml', depth: 1 }
      ],
      tabs: [
        { label: 'modernize-ui5-app.md', active: true },
        { label: 'manifest.json' },
        { label: 'Detail.controller.ts' },
        { label: 'ZC_DM_PROJECT.ddls' }
      ]
    };
  }

  return {
    root: 'ARC-1 Replay',
    commandCenter: 'arc-1 replay workspace',
    entries: [{ label: 'src/abap' }, { label: 'transport' }, { label: 'diagnostics' }],
    tabs: [{ label: 'ARC-1 Chat', active: true }, { label: 'tool-calls.json' }, { label: 'evidence.md' }]
  };
}

function Transcript({ events, scenario }: { events: VisibleEvent[]; scenario: Scenario }) {
  const latestEventRef = useRef<HTMLElement>(null);

  useEffect(() => {
    latestEventRef.current?.scrollIntoView({ block: 'start' });
  }, [events.length]);

  if (!events.length) {
    return (
      <div className="empty-transcript">
        <CirclePlay size={44} />
        <h2>Start with a predefined ARC-1 scenario</h2>
        <p>
          Pick any scenario from the library or press Start replay. Each run shows the chat, the exact ARC-1 tool
          calls, and the SAP evidence returned to the assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="transcript" aria-live="polite">
      {events.map((event, index) => {
        const eventRef = index === events.length - 1 ? latestEventRef : undefined;

        if (event.kind === 'choice') {
          return (
            <article className="message user" key={event.id} ref={eventRef}>
              <div className="avatar">U</div>
              <div>
                <small>{event.prompt}</small>
                <p>{event.label}</p>
              </div>
            </article>
          );
        }

        const node = scenario.nodes[event.nodeId];
        if (!node) {
          return null;
        }

        return <TranscriptNode key={node.id} node={node} nodeRef={eventRef} />;
      })}
    </div>
  );
}

function TranscriptNode({ node, nodeRef }: { node: ReplayNode; nodeRef?: Ref<HTMLElement> }) {
  if (node.type === 'message') {
    return (
      <article className={`message ${node.role}`} ref={nodeRef}>
        <div className="avatar">{node.role === 'user' ? 'U' : 'A'}</div>
        <p>{node.text}</p>
      </article>
    );
  }

  if (node.type === 'tool') {
    const args = formatToolPayload(node.args);
    const result = formatToolResult(node.result);
    const server = toolServerId(node);

    return (
      <article className={`tool-message tool-message-${server}`} ref={nodeRef}>
        <div className={`tool-icon tool-icon-${server}`}>
          <Wrench size={16} />
        </div>
        <div>
          <div className="tool-message-head">
            <strong>{node.toolName}</strong>
            <ToolServerBadge tool={node} />
            <span>{node.callId}</span>
          </div>
          <p>{node.summary}</p>
          <div className="tool-message-detail">
            <div>
              <span>Call</span>
              <code>{args}</code>
            </div>
            <div>
              <span>Response</span>
              <code>{result}</code>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (node.type === 'panel') {
    return (
      <article className="message assistant" ref={nodeRef}>
        <div className="avatar">A</div>
        <p>Opened evidence panel: {node.panel.title}</p>
      </article>
    );
  }

  return null;
}

function toolServerId(tool: ToolNode): McpServerId {
  return tool.server ?? 'arc-1';
}

function ToolServerBadge({ tool }: { tool: ToolNode }) {
  const server = toolServerId(tool);
  return <span className={`tool-server server-${server}`}>{toolServerLabels[server]}</span>;
}

function formatToolPayload(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function formatToolResult(result: string) {
  const compact = result.replace(/\s+/g, ' ').trim();
  if (compact.length <= 420) {
    return compact;
  }
  return `${compact.slice(0, 420)}...`;
}

function DecisionCard({
  decision,
  exploredOptionIds,
  onChoose
}: {
  decision: DecisionNode;
  exploredOptionIds: Set<string>;
  onChoose: (decision: DecisionNode, optionId: string) => void;
}) {
  return (
    <section className="decision-card">
      <p>{decision.prompt}</p>
      <div>
        {decision.options.map((option) => {
          const explored = exploredOptionIds.has(option.id);
          return (
            <button
              className={[option.recommended ? 'recommended' : '', explored ? 'explored' : ''].filter(Boolean).join(' ')}
              key={option.id}
              onClick={() => onChoose(decision, option.id)}
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {explored ? <small>Shown - click again to replay this branch</small> : <small>Show this branch</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ToolTrace({ tools }: { tools: ToolNode[] }) {
  if (!tools.length) {
    return (
      <div className="empty-panel">
        <Wrench size={20} />
        <span>Tool calls appear here as the replay runs.</span>
      </div>
    );
  }

  return (
    <div className="tool-trace">
      {tools.map((tool, index) => (
        <details className="tool-trace-item" key={tool.callId} open={index === tools.length - 1}>
          <summary>
            <span>
              <strong>{tool.toolName}</strong>
              <small>{tool.callId}</small>
            </span>
            <span className="tool-trace-meta">
              <ToolServerBadge tool={tool} />
              <small>{tool.resultFormat}</small>
            </span>
          </summary>
          <div className="tool-trace-body">
            <div className="trace-block">
              <span>Request</span>
              <pre>{formatToolPayload(tool.args)}</pre>
            </div>
            <div className="trace-block">
              <span>Response</span>
              <p>{tool.result}</p>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function EvidencePanel({ panel, scenario }: { panel?: ReplayPanel; scenario: Scenario }) {
  if (!panel) {
    return (
      <div className="scenario-outcome">
        <ThemeIcon theme={scenario.theme} />
        <h2>{scenario.shortTitle}</h2>
        <p>{scenario.outcome}</p>
        <div className="tag-row">
          {scenario.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`evidence-card evidence-${panel.kind}`}>
      {panel.eyebrow ? <p className="eyebrow">{panel.eyebrow}</p> : null}
      <h2>{panel.title}</h2>
      {panel.body ? <p>{panel.body}</p> : null}
      {panel.graph ? <GraphView graph={panel.graph} /> : null}
      {panel.items ? (
        <div className="evidence-items">
          {panel.items.map((item) => (
            <div className={`evidence-item tone-${item.tone ?? 'neutral'}`} key={`${item.label}-${item.value}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {panel.code ? (
        <pre className={`code-block language-${panel.language ?? 'text'}`}>
          <code>{panel.code}</code>
        </pre>
      ) : null}
    </div>
  );
}

function GraphView({ graph }: { graph: ReplayGraph }) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

  return (
    <div className="graph-view" aria-label="Dependency graph">
      <svg className="graph-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {graph.edges.map((edge) => {
          const from = nodesById.get(edge.from);
          const to = nodesById.get(edge.to);
          if (!from || !to) {
            return null;
          }
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g className={`graph-edge tone-${edge.tone ?? 'neutral'}`} key={`${edge.from}-${edge.to}-${edge.label ?? ''}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              {edge.label ? (
                <text x={midX} y={midY}>
                  {edge.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {graph.nodes.map((node) => (
        <div className={`graph-node tone-${node.tone ?? 'neutral'}`} key={node.id} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
          <strong>{node.label}</strong>
          <span>{node.kind}</span>
        </div>
      ))}
    </div>
  );
}

function ThemeIcon({ theme }: { theme: Scenario['theme'] }) {
  if (theme === 'vscode') {
    return <Code24Regular />;
  }
  if (theme === 'claude') {
    return <Bot24Regular />;
  }
  if (theme === 'outlook') {
    return <Mail24Regular />;
  }
  if (theme === 'teams') {
    return <People24Regular />;
  }
  return <Sparkle24Regular />;
}

function labelForTheme(theme: Scenario['theme']) {
  if (theme === 'vscode') {
    return 'VS Code';
  }
  if (theme === 'claude') {
    return 'Claude';
  }
  if (theme === 'teams') {
    return 'Teams';
  }
  if (theme === 'outlook') {
    return 'Outlook';
  }
  return 'Copilot';
}

function labelForAudience(audience: Scenario['audience']) {
  const labels: Record<Scenario['audience'], string> = {
    developer: 'Developer workflow',
    architect: 'Architecture workflow',
    consultant: 'Consultant workflow',
    support: 'Support workflow',
    'release-manager': 'Release workflow'
  };
  return labels[audience];
}
