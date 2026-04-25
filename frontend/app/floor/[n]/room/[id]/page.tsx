import { Scene } from "@/components/stata/Scene";
import { FloorCard } from "@/components/cards/FloorCard";
import { RoomCard } from "@/components/cards/RoomCard";
import { ChatBar } from "@/components/chat/ChatBar";
import { GraphPlaceholderModal } from "@/components/graph/GraphPlaceholderModal";
import { MetaLabel } from "@/components/ui/MetaLabel";
import { GraphToggle } from "@/components/ui/GraphToggle";
import { DeepLinkInitializer } from "@/components/ui/DeepLinkInitializer";
import { loadRoomsForFloor, loadGroups } from "@/lib/data";

export default async function DeepLinkPage({ params }: { params: Promise<{ n: string; id: string }> }) {
  const { n, id } = await params;
  const floor = parseInt(n, 10);
  const roomId = decodeURIComponent(id);
  const rooms = await loadRoomsForFloor(floor);
  const groups = await loadGroups();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <Scene rooms={rooms} groups={groups} />
      <MetaLabel />
      <GraphToggle />
      <FloorCard />
      <RoomCard />
      <ChatBar />
      <GraphPlaceholderModal />
      <DeepLinkInitializer floor={floor} roomId={roomId} />
    </main>
  );
}
