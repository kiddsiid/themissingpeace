import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { can } from '@/lib/auth/permissions';
import { Atelier } from './Atelier';

// The Atelier — a fashion studio for composing wedding-party looks against the
// palette, previewing them in the day's contexts, and gathering approvals
// (README §4). Loads the shared board slice and hands `board.attire` +
// palette-linked colors + the editable approver roles to the client studio.
export default async function AtelierPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });

  return (
    <Atelier
      looks={board.attire.looks}
      dressCode={board.attire.dressCode}
      rules={board.attire.rules}
      palette={board.palette.colors}
      approverRoles={context.approverRoles}
      projectName={context.projectName}
      canEdit={can(workspace.role, 'plan.full')}
    />
  );
}
