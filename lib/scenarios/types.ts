export type ScenarioTheme = 'vscode' | 'teams' | 'outlook' | 'copilot' | 'claude';

export type Audience = 'developer' | 'architect' | 'consultant' | 'support' | 'release-manager';

export type ScenarioGroup =
  | 'Understanding'
  | 'Build & Test'
  | 'Modernization'
  | 'Governance'
  | 'Operations'
  | 'Analytics'
  | 'Business Impact';

export type ArcToolName =
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

export type McpServerId = 'arc-1' | 'sap-docs' | 'ui5-mcp' | 'fiori-mcp';

export type PanelKind =
  | 'source'
  | 'diff'
  | 'graph'
  | 'table'
  | 'report'
  | 'email'
  | 'document'
  | 'transport'
  | 'terminal';

export interface Scenario {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  theme: ScenarioTheme;
  group: ScenarioGroup;
  audience: Audience;
  estimatedMinutes: number;
  tags: string[];
  outcome: string;
  startNodeId: string;
  nodes: Record<string, ReplayNode>;
}

export type ReplayNode = MessageNode | ToolNode | PanelNode | DecisionNode;

export interface BaseNode {
  id: string;
  next?: string;
  delayMs?: number;
}

export interface MessageNode extends BaseNode {
  type: 'message';
  role: 'user' | 'assistant';
  text: string;
}

export interface ToolNode extends BaseNode {
  type: 'tool';
  server?: McpServerId;
  toolName: string;
  callId: string;
  args: Record<string, unknown>;
  result: string;
  summary: string;
  resultFormat: 'text' | 'json' | 'diff' | 'table' | 'graph';
  panel?: ReplayPanel;
}

export interface PanelNode extends BaseNode {
  type: 'panel';
  panel: ReplayPanel;
}

export interface DecisionNode extends BaseNode {
  type: 'decision';
  prompt: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  next: string;
  recommended?: boolean;
}

export interface ReplayPanel {
  title: string;
  kind: PanelKind;
  eyebrow?: string;
  body?: string;
  code?: string;
  language?: string;
  items?: Array<{
    label: string;
    value: string;
    tone?: 'good' | 'warn' | 'danger' | 'neutral';
  }>;
  graph?: ReplayGraph;
}

export interface ReplayGraph {
  nodes: Array<{
    id: string;
    label: string;
    kind: string;
    x: number;
    y: number;
    tone?: 'good' | 'warn' | 'danger' | 'neutral';
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    tone?: 'good' | 'warn' | 'danger' | 'neutral';
  }>;
}
