import { describe, expect, it } from 'vitest';
import { scenarios } from '../lib/scenarios/data';
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
