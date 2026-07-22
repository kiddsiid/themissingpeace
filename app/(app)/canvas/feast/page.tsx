import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { FeastStudio } from './FeastStudio';

// Feast Studio — the menu / hospitality studio (README §2). Loads the shared
// board slice and hands `board.food` + context to the interactive client studio.
export default async function FeastStudioPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });

  return <FeastStudio food={board.food} context={context} workspaceRole={workspace.role} />;
}
