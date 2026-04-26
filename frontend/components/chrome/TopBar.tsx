"use client";
import { usePathname, useRouter } from "next/navigation";
import { useUI } from "@/lib/store";

const TABS: { href: string; label: string; key: string }[] = [
  { href: "/",          label: "Building",  key: "building" },
  { href: "/",          label: "Floor",     key: "floor" },
  { href: "/directory", label: "Directory", key: "directory" },
  { href: "/atlas",     label: "Atlas",     key: "atlas" },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const view = useUI((s) => s.view);
  const enterFloor = useUI((s) => s.enterFloor);
  const exitFloor = useUI((s) => s.exitFloor);
  const activeFloor = useUI((s) => s.activeFloor);
  const selectedRoomId = useUI((s) => s.selectedRoomId);

  const onPath = (href: string) => pathname === href;
  const activeKey =
    pathname === "/directory" ? "directory" :
    pathname === "/atlas"     ? "atlas"     :
    view; // 'building' | 'floor'

  const onTabClick = (key: string, href: string) => {
    if (href === "/" && pathname !== "/") {
      router.push("/");
      return;
    }
    if (key === "building") exitFloor();
    if (key === "floor")    enterFloor(activeFloor ?? 7);
    if (key === "directory" || key === "atlas") router.push(href);
  };

  // Breadcrumb tail
  const tail = (() => {
    if (pathname === "/atlas")     return "/ Atlas — knowledge graph";
    if (pathname === "/directory") return "/ Directory — full index";
    if (view === "floor" && selectedRoomId) {
      const num = selectedRoomId.replace(/^32-G/, "");
      return `/ Floor ${activeFloor} / Room G${num}`;
    }
    if (view === "floor") return `/ Floor ${activeFloor} — Gates Tower`;
    return "/ Building 32 — Stata Center";
  })();

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-5 pointer-events-none bg-gradient-to-b from-[var(--bg)] to-transparent">
      {/* Wordmark */}
      <div className="flex items-baseline gap-3 pointer-events-auto">
        <button
          onClick={() => router.push("/")}
          className="font-display text-[15px] tracking-tight text-[var(--bone)] hover:text-white transition"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
        >
          CSAIL <span className="italic">Complete</span>
        </button>
        <span className="font-mono text-[10px] smallcaps text-[var(--graphite-2)] tabular">
          {tail}
        </span>
      </div>

      {/* View tabs */}
      <nav className="pointer-events-auto flex items-center bg-[var(--ink-glass)] backdrop-blur-md border border-[var(--rule)] rounded-full px-1 py-1">
        {TABS.map((t) => {
          const active = activeKey === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabClick(t.key, t.href)}
              className={[
                "px-3.5 py-1 rounded-full text-[11px] font-mono smallcaps transition",
                active
                  ? "bg-[var(--bone)] text-[var(--ink)]"
                  : "text-[var(--graphite-2)] hover:text-[var(--bone)]"
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Right slot — kept empty here; per-page actions can portal in later */}
      <div className="pointer-events-auto w-[180px] text-right font-mono text-[10px] smallcaps text-[var(--graphite-2)] tabular">
        {pathname === "/" && view === "building" && "32 · Stata · Cambridge"}
        {pathname === "/" && view === "floor" && `32-G${activeFloor} · Floor ${activeFloor}`}
        {pathname === "/directory" && "n = 1,493"}
        {pathname === "/atlas" && "graph · live"}
      </div>
    </header>
  );
}
