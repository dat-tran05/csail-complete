"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface FloorSummary {
  floor: number;
  label: string;
  roomCount: number;
  groupCount: number;
  groups: { id: string; name: string; color?: string }[];
}

export function FloorCard() {
  const view = useUI((s) => s.view);
  const activeFloor = useUI((s) => s.activeFloor);
  const exitFloor = useUI((s) => s.exitFloor);
  const [data, setData] = useState<FloorSummary | null>(null);

  useEffect(() => {
    if (view !== "floor" || activeFloor == null) { setData(null); return; }
    fetch(`/api/kg/floor/${activeFloor}`).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, [view, activeFloor]);

  if (view !== "floor" || !data) return null;

  return (
    <div className="absolute top-16 right-4 w-[180px] bg-[rgba(10,12,22,0.96)] backdrop-blur-md border border-[rgba(140,160,200,0.22)] rounded-lg p-3 text-xs shadow-2xl z-30">
      <div className="text-[#a8b8d0] tracking-widest text-[9px] mb-2">FLOOR {data.floor}</div>
      <div className="text-white font-semibold text-sm mb-1">{data.label}</div>
      <div className="text-[#7a8aa0] text-[10px] mb-3">{data.roomCount} rooms · {data.groupCount} groups</div>
      <div className="text-[#a0b0c8] text-[8px] tracking-widest mb-2 uppercase">Groups</div>
      <div className="space-y-1">
        {data.groups.map((g) => (
          <div key={g.id} className="flex items-center gap-2 text-[#d0d8e4] text-[10px]">
            <span className="w-2 h-2 rounded-full" style={{ background: g.color, boxShadow: `0 0 4px ${g.color}` }} />
            {g.name}
          </div>
        ))}
      </div>
      <button onClick={exitFloor} className="mt-3 text-[#7a8aa0] text-[10px] hover:text-white transition">← back to building</button>
    </div>
  );
}
