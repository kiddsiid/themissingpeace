import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { feastProgress, atmosphereProgress, atelierProgress } from '@/lib/canvas/progress';
import { LivingCanvas } from './LivingCanvas';

// The Living Canvas hub — the doorway that replaces `/board` in the nav.
// Loads the shared board slice, derives per-room progress, and hands a plain
// snapshot to the client hub (rooms, dreams, peace summary).
export default async function CanvasPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });

  const feast = feastProgress(board);
  const atmosphere = atmosphereProgress(board, context.weddingPalette);
  const atelier = atelierProgress(board);

  // Creative-readiness proxy for the header Peace pill (links to Peace Center for
  // the full score). Mean of the three room rings.
  const score = Math.round((feast.pct + atmosphere.pct + atelier.pct) / 3);
  const band = score >= 85 ? 'Peaceful' : score >= 60 ? 'Settling' : score >= 35 ? 'Stirring' : 'Building';

  return (
    <LivingCanvas
      projectName={context.projectName}
      compassSentence={context.compassSentence}
      palette={board.palette.colors}
      approverRoles={context.approverRoles}
      inspirations={board.inspirations}
      progress={{ feast, atmosphere, atelier }}
      peace={{ score, band }}
    />
  );
}
