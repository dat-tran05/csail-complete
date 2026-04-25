"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

interface RoomDetail {
  room: { id: string; number: string; floor: number; type: string; label?: string };
  groups: { id: string; name: string; shortName?: string; color?: string; url?: string }[];
  members: { id: string; name: string; homepage?: string }[];
  activity: { papersThisMonth: number; collaborations: number };
}

export function RoomCard() {
  const selectedRoomId = useUI((s) => s.selectedRoomId);
  const selectRoom = useUI((s) => s.selectRoom);
  const [data, setData] = useState<RoomDetail | null>(null);

  useEffect(() => {
    if (!selectedRoomId) { setData(null); return; }
    fetch(`/api/kg/room/${encodeURIComponent(selectedRoomId)}`).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, [selectedRoomId]);

  if (!selectedRoomId || !data) return null;
  const primaryGroup = data.groups[0];
  const accentColor = primaryGroup?.color ?? "#7faec7";

  return (
    <div className="absolute top-16 right-4 w-[200px] bg-[rgba(10,12,22,0.96)] backdrop-blur-md border border-[rgba(140,160,200,0.22)] rounded-lg p-4 text-xs shadow-2xl z-30" style={{ boxShadow: `0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px ${accentColor}33` }}>
      <span className="inline-block px-2 py-0.5 rounded text-[8px] tracking-widest font-semibold mb-2" style={{ background: `${accentColor}33`, color: accentColor }}>
        {primaryGroup?.shortName ?? "ROOM"} · {data.room.id}
      </span>
      <div className="text-white text-sm font-semibold leading-tight mb-1">{primaryGroup?.name ?? data.room.label ?? data.room.number}</div>
      <div className="text-[#7a8aa0] text-[9px] mb-3 font-mono">Floor {data.room.floor} · {data.room.type}</div>

      {data.members.length > 0 && (
        <div className="mb-3">
          <div className="text-[#a0b0c8] text-[8px] tracking-widest uppercase mb-1.5">Members</div>
          {data.members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-[#d0d8e4] text-[10px] py-0.5">
              <span className="w-1 h-1 rounded-full bg-[#ffd28a] shadow-[0_0_4px_#ffd28a]" />
              {m.homepage ? <a href={m.homepage} target="_blank" rel="noopener" className="hover:text-white">{m.name}</a> : m.name}
            </div>
          ))}
          {data.members.length > 5 && <div className="text-[#7a8aa0] text-[9px] mt-1">+{data.members.length - 5} more</div>}
        </div>
      )}

      <div className="text-[#7a8aa0] text-[9px] italic pt-2 border-t border-[rgba(140,160,200,0.12)]">
        {data.activity.papersThisMonth} papers this month · {data.activity.collaborations} collaborations
      </div>

      <button onClick={() => selectRoom(null)} className="mt-3 text-[#7a8aa0] text-[10px] hover:text-white transition">close</button>
    </div>
  );
}
