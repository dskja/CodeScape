import { Viewer } from '@/components/Viewer';
import { buildEmptyWorld } from '@codescape/fixtures';
import { computeLayout } from '@codescape/layout-engine';

export default function EmptyPage() {
  const world = buildEmptyWorld();
  const layout = computeLayout(world);
  return <Viewer world={world} layout={layout} />;
}
