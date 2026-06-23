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
  Pause,
  Play,
  RefreshCw,
  StepForward,
  Wrench
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultScenarioId, getScenario, scenarios } from '@/lib/scenarios/data';
import type { DecisionNode, ReplayNode, ReplayPanel, Scenario, ToolNode } from '@/lib/scenarios/types';

type VisibleEvent =
  | {
      kind: 'node';
      nodeId: string;
    }
  | {
      kind: 'choice';
      id: string;
      prompt: string;
      label: string;
    };

type Speed = '1x' | '2x' | 'instant';

interface ReplayState {
  events: VisibleEvent[];
  currentNodeId?: string;
  activeDecision?: DecisionNode;
  activePanel?: ReplayPanel;
  isPlaying: boolean;
  speed: Speed;
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

  const start = () => setState((current) => ({ ...current, isPlaying: true, activeDecision: undefined }));
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
          id: `${decision.id}-${option.id}`,
          prompt: decision.prompt,
          label: option.label
        }
      ],
      currentNodeId: option.next,
      activeDecision: undefined,
      isPlaying: true
    }));
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className={`workbench theme-${scenario.theme}`}>
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

        <aside className="scenario-sidebar" aria-label="Available scenarios">
          <div className="sidebar-heading">
            <span>Scenarios</span>
            <small>Jump in directly</small>
          </div>
          <div className="scenario-list">
            {scenarios.map((item) => (
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
        </aside>

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

            {state.activeDecision ? <DecisionCard decision={state.activeDecision} onChoose={choose} /> : null}
          </ShellFrame>
        </section>

        <aside className="evidence-panel" aria-label="ARC-1 evidence and tool calls">
          <section className="panel-section">
            <div className="panel-heading">
              <Activity size={16} />
              <span>ARC-1 tool calls</span>
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
    return (
      <div className="client-shell vscode-shell">
        <div className="vscode-activitybar" aria-hidden="true">
          <span className="codicon codicon-files" />
          <span className="codicon codicon-search" />
          <span className="codicon codicon-source-control" />
          <span className="codicon codicon-debug-alt" />
          <span className="codicon codicon-extensions" />
        </div>
        <div className="vscode-explorer">
          <strong>ARC-1 Replay</strong>
          <span>src/abap</span>
          <span>transport</span>
          <span>diagnostics</span>
        </div>
        <div className="client-main">{children}</div>
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

  return (
    <div className="client-shell microsoft-shell">
      <div className="ms-rail" aria-hidden="true">
        <Chat24Regular />
        <Bot24Regular />
        <Document24Regular />
        <People24Regular />
      </div>
      <div className="teams-channel" aria-hidden="true">
        <strong>{scenario.theme === 'teams' ? 'SAP Delivery' : 'Copilot'}</strong>
        <span>General</span>
        <span>Clean Core</span>
        <span>Release review</span>
      </div>
      <div className="client-main">{children}</div>
    </div>
  );
}

function Transcript({ events, scenario }: { events: VisibleEvent[]; scenario: Scenario }) {
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
      {events.map((event) => {
        if (event.kind === 'choice') {
          return (
            <article className="message user" key={event.id}>
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

        return <TranscriptNode key={node.id} node={node} />;
      })}
    </div>
  );
}

function TranscriptNode({ node }: { node: ReplayNode }) {
  if (node.type === 'message') {
    return (
      <article className={`message ${node.role}`}>
        <div className="avatar">{node.role === 'user' ? 'U' : 'A'}</div>
        <p>{node.text}</p>
      </article>
    );
  }

  if (node.type === 'tool') {
    return (
      <article className="tool-message">
        <div className="tool-icon">
          <Wrench size={16} />
        </div>
        <div>
          <div className="tool-message-head">
            <strong>{node.toolName}</strong>
            <span>{node.callId}</span>
          </div>
          <p>{node.summary}</p>
          <code>{JSON.stringify(node.args)}</code>
        </div>
      </article>
    );
  }

  if (node.type === 'panel') {
    return (
      <article className="message assistant">
        <div className="avatar">A</div>
        <p>Opened evidence panel: {node.panel.title}</p>
      </article>
    );
  }

  return null;
}

function DecisionCard({
  decision,
  onChoose
}: {
  decision: DecisionNode;
  onChoose: (decision: DecisionNode, optionId: string) => void;
}) {
  return (
    <section className="decision-card">
      <p>{decision.prompt}</p>
      <div>
        {decision.options.map((option) => (
          <button className={option.recommended ? 'recommended' : ''} key={option.id} onClick={() => onChoose(decision, option.id)} type="button">
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
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
        <details key={tool.callId} open={index === tools.length - 1}>
          <summary>
            <span>{tool.toolName}</span>
            <small>{tool.resultFormat}</small>
          </summary>
          <pre>{JSON.stringify(tool.args, null, 2)}</pre>
          <p>{tool.result}</p>
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

function ThemeIcon({ theme }: { theme: Scenario['theme'] }) {
  if (theme === 'vscode') {
    return <Code24Regular />;
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
