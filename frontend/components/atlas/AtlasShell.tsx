"use client";
import dynamic from "next/dynamic";

const AtlasGraph = dynamic(() => import("./AtlasGraph").then((m) => m.AtlasGraph), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="font-mono text-[12px] smallcaps text-[var(--graphite-2)] tabular animate-pulseSoft">
        loading atlas
      </div>
    </div>
  ),
});

export function AtlasShell() {
  return <AtlasGraph />;
}
