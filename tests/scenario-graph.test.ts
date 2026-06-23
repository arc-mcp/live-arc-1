import { describe, expect, it } from 'vitest';
import { scenarios } from '../lib/scenarios/data';
import type { ScenarioGroup } from '../lib/scenarios/types';
import { validateScenarios } from '../lib/scenarios/validate';

describe('scenario graph', () => {
  it('has valid replay graphs', () => {
    expect(validateScenarios()).toEqual([]);
  });

  it('contains both developer and end-user themes', () => {
    const themes = new Set(scenarios.map((scenario) => scenario.theme));
    expect(themes.has('vscode')).toBe(true);
    expect(themes.has('teams')).toBe(true);
    expect(themes.has('outlook')).toBe(true);
    expect(themes.has('claude')).toBe(true);
    expect(themes.has('copilot')).toBe(true);
  });

  it('groups the expanded catalog into workflow lanes', () => {
    const requiredGroups: ScenarioGroup[] = [
      'Understanding',
      'Build & Test',
      'Modernization',
      'Governance',
      'Operations',
      'Analytics',
      'Business Impact'
    ];
    const groups = new Set(scenarios.map((scenario) => scenario.group));

    expect(scenarios.length).toBeGreaterThanOrEqual(12);
    for (const group of requiredGroups) {
      expect(groups.has(group)).toBe(true);
    }
  });

  it('contains graph-first Claude replay data', () => {
    const claudeScenario = scenarios.find((scenario) => scenario.id === 'claude-billing-graph');
    expect(claudeScenario?.theme).toBe('claude');
    expect(claudeScenario?.tags).toContain('Graph');
  });

  it('starts with a dependency-oriented developer scenario', () => {
    expect(scenarios[0]?.id).toBe('developer-dependency-map');
    expect(scenarios[0]?.tags).toContain('Dependencies');
  });
});
