import { Scene } from "@/components/stata/Scene";
import { FloorPlan2D } from "@/components/floor/FloorPlan2D";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Dossier } from "@/components/dossier/Dossier";
import { TopBar } from "@/components/chrome/TopBar";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { FloorStrip } from "@/components/ui/FloorStrip";
import { loadGroups } from "@/lib/data";

export default async function Home() {
  const groups = await loadGroups();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[var(--ink)]">
      <Scene />
      <FloorPlan2D groups={groups} />
      <TopBar />
      <MetaLabel />
      <FloorStrip />
      <ChatPanel />
      <Dossier />
    </main>
  );
}
