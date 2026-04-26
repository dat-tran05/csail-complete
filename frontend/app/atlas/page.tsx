import { TopBar } from "@/components/chrome/TopBar";
import { Dossier } from "@/components/dossier/Dossier";
import { AtlasShell } from "@/components/atlas/AtlasShell";

export default function AtlasPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[var(--ink)]">
      <TopBar />
      <AtlasShell />
      <Dossier />
    </main>
  );
}
