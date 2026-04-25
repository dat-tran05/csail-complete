import { Scene } from "@/components/stata/Scene";
import { FloorCard } from "@/components/cards/FloorCard";
import { RoomCard } from "@/components/cards/RoomCard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { GraphPlaceholderModal } from "@/components/graph/GraphPlaceholderModal";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { GraphToggle } from "@/components/ui/GraphToggle";
import { EnterFloor7Trigger } from "@/components/ui/EnterFloor7Trigger";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export default async function Home() {
  const rooms = await loadRoomsForFloor(7);
  const groups = await loadGroups();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene rooms={rooms} groups={groups} />
      <MetaLabel />
      <GraphToggle />
      <EnterFloor7Trigger />
      <FloorCard />
      <RoomCard />
      <ChatPanel />
      <GraphPlaceholderModal />
    </main>
  );
}
