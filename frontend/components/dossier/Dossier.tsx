"use client";
import { useUI } from "@/lib/store";
import { RoomDossier } from "./RoomDossier";
import { PersonDossier } from "./PersonDossier";
import { GroupDossier } from "./GroupDossier";
import { ProjectDossier } from "./ProjectDossier";
import { PaperDossier } from "./PaperDossier";
import { NewsDossier } from "./NewsDossier";
import { AreaDossier } from "./AreaDossier";

export function Dossier() {
  const dossier = useUI((s) => s.dossier);
  const close = useUI((s) => s.closeDossier);

  if (!dossier) return null;

  return (
    <aside
      className="absolute right-0 top-12 bottom-0 w-[400px] z-30 pointer-events-auto animate-fadeUp"
      style={{
        background: "linear-gradient(180deg, rgba(20,23,31,0.96) 0%, rgba(12,14,19,0.98) 100%)",
        borderLeft: "1px solid var(--rule-strong)",
        boxShadow: "-24px 0 48px rgba(0,0,0,0.45)",
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--rule)]">
          <span className="font-mono text-[9px] smallcaps text-[var(--graphite-2)] tabular">
            Dossier · {dossier.kind}
          </span>
          <button
            onClick={close}
            aria-label="close"
            className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] hover:text-[var(--bone)] transition tabular"
          >
            close [esc]
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {dossier.kind === "room"    && <RoomDossier id={dossier.id} />}
          {dossier.kind === "person"  && <PersonDossier id={dossier.id} />}
          {dossier.kind === "group"   && <GroupDossier id={dossier.id} />}
          {dossier.kind === "project" && <ProjectDossier id={dossier.id} />}
          {dossier.kind === "paper"   && <PaperDossier id={dossier.id} />}
          {dossier.kind === "news"    && <NewsDossier id={dossier.id} />}
          {dossier.kind === "area"    && <AreaDossier id={dossier.id} />}
        </div>
      </div>
    </aside>
  );
}
