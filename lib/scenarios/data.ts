import type { Scenario } from './types';
import developerDependencyMap from './scenarios/developer-dependency-map.json';
import claudeBillingGraph from './scenarios/claude-billing-graph.json';
import developerCdsImpact from './scenarios/developer-cds-impact.json';
import developerMethodSurgery from './scenarios/developer-method-surgery.json';
import teamsSharepointImpact from './scenarios/teams-sharepoint-impact.json';
import outlookDumpTriage from './scenarios/outlook-dump-triage.json';
import teamsCleanCore from './scenarios/teams-clean-core.json';
import segwToRapGuided from './scenarios/segw-to-rap-guided.json';
import githubAbapPrReview from './scenarios/github-abap-pr-review.json';
import copilotPackageCleanCoreBacklog from './scenarios/copilot-package-clean-core-backlog.json';
import transportReleaseRisk from './scenarios/transport-release-risk.json';
import ui5TypescriptModernization from './scenarios/ui5-typescript-modernization.json';
import analyticsStarSchema from './scenarios/analytics-star-schema.json';

export const scenarios: Scenario[] = [
  developerDependencyMap as Scenario,
  claudeBillingGraph as Scenario,
  developerCdsImpact as Scenario,
  developerMethodSurgery as Scenario,
  teamsSharepointImpact as Scenario,
  outlookDumpTriage as Scenario,
  teamsCleanCore as Scenario,
  segwToRapGuided as Scenario,
  githubAbapPrReview as Scenario,
  copilotPackageCleanCoreBacklog as Scenario,
  transportReleaseRisk as Scenario,
  ui5TypescriptModernization as Scenario,
  analyticsStarSchema as Scenario
];

export const defaultScenarioId = 'developer-dependency-map';

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
