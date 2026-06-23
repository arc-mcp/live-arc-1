import { notFound } from 'next/navigation';
import { ReplayWorkbench } from '@/components/ReplayWorkbench';
import { getScenario, scenarios } from '@/lib/scenarios/data';

export function generateStaticParams() {
  return scenarios.map((scenario) => ({ scenarioId: scenario.id }));
}

export default async function ScenarioPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);

  if (!scenario) {
    notFound();
  }

  return <ReplayWorkbench initialScenarioId={scenario.id} />;
}
