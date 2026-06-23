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
  });

  it('starts with a dependency-oriented developer scenario', () => {
    expect(scenarios[0]?.id).toBe('developer-dependency-map');
    expect(scenarios[0]?.tags).toContain('Dependencies');
  });
});
