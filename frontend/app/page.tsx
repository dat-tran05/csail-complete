import { Scene } from "@/components/stata/Scene";
import { FloorPlan2D } from "@/components/floor/FloorPlan2D";
import { LayerToggles } from "@/components/floor/LayerToggles";
import { FloorLegend } from "@/components/floor/FloorLegend";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Dossier } from "@/components/dossier/Dossier";
import { TopBar } from "@/components/chrome/TopBar";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { FloorStrip } from "@/components/ui/FloorStrip";
import { loadGroups } from "@/lib/data";
import { getFloorInsights } from "@/lib/kg/floor-insights";
import type { FloorInsights } from "@shared/schema/floor";

export default async function Home() {
  const groups = await loadGroups();
  let insights: FloorInsights | null = null;
  try {
    insights = await getFloorInsights(7);
  } catch {
    insights = null;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[var(--ink)]">
      <Scene />
      <FloorPlan2D groups={groups} insights={insights} />
      <LayerToggles />
      <FloorLegend insights={insights} curatedGroups={groups} />
      <TopBar />
      <MetaLabel />
      <FloorStrip />
      <ChatPanel />
      <Dossier />
    </main>
  );
}
