import { FeastRoute } from '../../FeastRoute';

export default async function FeastScenePage({
  params,
}: {
  params: Promise<{ sceneId: string }>;
}) {
  const { sceneId } = await params;
  return <FeastRoute view="scene" sceneId={sceneId} />;
}
