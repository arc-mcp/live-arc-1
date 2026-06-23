import { ReplayWorkbench } from '@/components/ReplayWorkbench';
import { defaultScenarioId } from '@/lib/scenarios/data';

export default function HomePage() {
  return <ReplayWorkbench initialScenarioId={defaultScenarioId} />;
}
