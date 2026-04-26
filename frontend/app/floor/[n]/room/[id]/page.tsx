import { Scene } from "@/components/stata/Scene";
import { FloorPlan2D } from "@/components/floor/FloorPlan2D";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Dossier } from "@/components/dossier/Dossier";
import { TopBar } from "@/components/chrome/TopBar";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { DeepLinkInitializer } from "@/components/ui/DeepLinkInitializer";
import { loadGroups } from "@/lib/data";
import { getFloorInsights } from "@/lib/kg/floor-insights";
import type { FloorInsights } from "@shared/schema/floor";

export default async function DeepLinkPage({ params }: { params: Promise<{ n: string; id: string }> }) {
  const { n, id } = await params;
  const floor = parseInt(n, 10);
  const roomId = decodeURIComponent(id);
  const groups = await loadGroups();
  let insights: FloorInsights | null = null;
  try {
    insights = await getFloorInsights(floor);
  } catch {
    insights = null;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[var(--ink)]">
      <Scene />
      <FloorPlan2D groups={groups} insights={insights} />
      <TopBar />
      <MetaLabel />
      <ChatPanel />
      <Dossier />
      <DeepLinkInitializer floor={floor} roomId={roomId} />
    </main>
  );
}
