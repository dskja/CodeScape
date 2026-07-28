import { Viewer } from '@/components/Viewer';
import { getDemoWorld } from '@codescape/fixtures';
import { computeLayout } from '@codescape/layout-engine';

export default function Home() {
  const world = getDemoWorld();
  const layout = computeLayout(world);
  return <Viewer world={world} layout={layout} />;
}
