import { scenarios } from './data';
import type { ArcToolName, ReplayNode } from './types';

const arcToolNames = new Set<ArcToolName>([
  'SAPRead',
  'SAPSearch',
  'SAPWrite',
  'SAPActivate',
  'SAPNavigate',
  'SAPQuery',
  'SAPTransport',
  'SAPGit',
  'SAPContext',
  'SAPLint',
  'SAPDiagnose',
  'SAPManage'
]);

export function validateScenarios(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      errors.push(`Duplicate scenario id: ${scenario.id}`);
    }
    ids.add(scenario.id);

    if (!scenario.nodes[scenario.startNodeId]) {
      errors.push(`${scenario.id}: missing start node ${scenario.startNodeId}`);
    }

    const nodeIds = new Set(Object.keys(scenario.nodes));
    for (const node of Object.values(scenario.nodes)) {
      checkNode(scenario.id, node, nodeIds, errors);
    }
  }

  return errors;
}

function checkNode(scenarioId: string, node: ReplayNode, nodeIds: Set<string>, errors: string[]) {
  if (node.next && !nodeIds.has(node.next)) {
    errors.push(`${scenarioId}/${node.id}: missing next node ${node.next}`);
  }

  if (node.type === 'decision') {
    for (const option of node.options) {
      if (!nodeIds.has(option.next)) {
        errors.push(`${scenarioId}/${node.id}: missing decision target ${option.next}`);
      }
    }
  }

  if (node.type === 'tool' && !arcToolNames.has(node.toolName)) {
    errors.push(`${scenarioId}/${node.id}: unknown ARC-1 tool ${node.toolName}`);
  }
}
