import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadFeastStudio } from '@/lib/feast/store';
import { FeastStudio, type FeastView } from './FeastStudio';

export async function FeastRoute({
  view,
  sceneId,
}: {
  view: FeastView;
  sceneId?: string;
}) {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');
  const snapshot = await loadFeastStudio(workspace);
  return <FeastStudio initial={snapshot} initialView={view} initialSceneId={sceneId} />;
}
