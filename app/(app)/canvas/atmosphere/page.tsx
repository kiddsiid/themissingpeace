import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { AtmosphereLab } from './AtmosphereLab';

// Atmosphere Lab — the palette & mood control room. Loads the shared board slice
// (palette) plus the wider wedding context (season / light / wedding-palette /
// approver roles) and hands a plain snapshot to the interactive client studio.
export default async function AtmospherePage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });

  return (
    <AtmosphereLab
      palette={board.palette}
      context={context}
      workspaceRole={workspace.role}
    />
  );
}
