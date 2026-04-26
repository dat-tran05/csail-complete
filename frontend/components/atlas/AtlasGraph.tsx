"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY, type Simulation } from "d3-force";
import { useUI } from "@/lib/store";
import { AtlasFilters, type AtlasFilters as AtlasFiltersT } from "./AtlasFilters";
import { AtlasSearch } from "./AtlasSearch";
import { AtlasLegend } from "./AtlasLegend";

type Kind = "person" | "group" | "project" | "paper" | "news" | "area" | "room";

interface ApiNode {
  nid: number;
  kind: string;
  id: string;
  label: string;
  color?: string | null;
  meta?: { shortName?: string; year?: number; isPI?: boolean; floor?: number };
}
interface ApiEdge { from: number; to: number; type: string; }
interface ApiGraph { nodes: ApiNode[]; edges: ApiEdge[]; error?: string }

interface SimNode extends ApiNode {
  x: number; y: number; vx: number; vy: number;
  fx?: number | null; fy?: number | null;
  degree: number;
}
interface SimEdge { source: SimNode; target: SimNode; type: string; }

const KIND_COLOR: Record<Kind, string> = {
  person:  "#f4ede0",
  group:   "#ffd28a",
  project: "#7fb1d4",
  paper:   "#9762cf",
  news:    "#e26b4a",
  area:    "#5fa86a",
  room:    "#7a8aa6",
};

const EDGE_DASH: Record<string, string> = {
  COAUTHORED_WITH: "3 3",
  MEMBER_OF:       "0",
  PI_OF:           "0",
  LOCATED_IN:      "1 4",
  WORKS_ON:        "0",
  BELONGS_TO:      "0",
  AUTHORED:        "0",
  MENTIONED_IN:    "2 3",
  WORKS_IN_AREA:   "4 2",
  HAS_IMPACT_ON:   "4 2",
};

export function AtlasGraph() {
  const [filters, setFilters] = useState<AtlasFiltersT>({
    kinds: { person: true, group: true, project: true, paper: false, news: false, area: true, room: false },
    edgeTypes: new Set([
      "MEMBER_OF", "PI_OF", "BELONGS_TO", "WORKS_ON",
      "AUTHORED", "COAUTHORED_WITH", "WORKS_IN_AREA",
    ]),
    floor7Only: false,
  });
  const [graph, setGraph] = useState<ApiGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  // Fetch
  useEffect(() => {
    setLoading(true);
    const types = (Object.entries(filters.kinds) as [Kind, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k === "news" ? "NewsItem" : k.charAt(0).toUpperCase() + k.slice(1))
      .join(",");
    const params = new URLSearchParams({ types, limit: "1500" });
    if (filters.floor7Only) params.set("focus", "floor7");
    fetch(`/api/kg/graph?${params}`)
      .then((r) => r.json())
      .then((d: ApiGraph) => {
        setGraph(d);
        setWarning(d.error ?? null);
        setLoading(false);
      })
      .catch((e) => { setLoading(false); setWarning(String(e)); });
  }, [filters.kinds, filters.floor7Only]);

  return (
    <div className="absolute inset-0 pt-12">
      <div className="absolute inset-0 top-12">
        <Canvas graph={graph} loading={loading} filters={filters} />
      </div>
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <AtlasSearch graph={graph} />
      </div>
      <div className="absolute top-14 left-6 z-10 pointer-events-auto">
        <AtlasFilters value={filters} onChange={setFilters} />
      </div>
      <div className="absolute bottom-6 left-6 z-10 pointer-events-auto">
        <AtlasLegend graph={graph} loading={loading} warning={warning} />
      </div>
    </div>
  );
}

/* ─── canvas ─── */

function Canvas({ graph, loading, filters }: { graph: ApiGraph | null; loading: boolean; filters: AtlasFiltersT }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const openDossier = useUI((s) => s.openDossier);
  const dossier = useUI((s) => s.dossier);

  // Run simulation
  const sim = useRef<Simulation<SimNode, SimEdge> | null>(null);
  const [tick, setTick] = useState(0);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<SimEdge[]>([]);

  useEffect(() => {
    if (!graph) return;

    const allowedEdgeTypes = filters.edgeTypes;
    const apiNodes = graph.nodes.filter((n) => filters.kinds[n.kind as Kind]);
    const idToNode = new Map<number, SimNode>();
    const simNodes: SimNode[] = apiNodes.map((n) => {
      const node: SimNode = {
        ...n,
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        vx: 0, vy: 0,
        degree: 0,
      };
      idToNode.set(n.nid, node);
      return node;
    });
    const simEdges: SimEdge[] = graph.edges
      .filter((e) => allowedEdgeTypes.has(e.type) && idToNode.has(e.from) && idToNode.has(e.to))
      .map((e) => {
        const source = idToNode.get(e.from)!;
        const target = idToNode.get(e.to)!;
        source.degree += 1;
        target.degree += 1;
        return { source, target, type: e.type };
      });

    setNodes(simNodes);
    setEdges(simEdges);

    sim.current?.stop();
    sim.current = forceSimulation<SimNode, SimEdge>(simNodes)
      .force("link", forceLink<SimNode, SimEdge>(simEdges).id((d) => d.nid).distance(70).strength(0.5))
      .force("charge", forceManyBody().strength(-180).theta(0.9))
      .force("center", forceCenter(0, 0).strength(0.06))
      .force("collide", forceCollide<SimNode>().radius((d) => 6 + Math.min(20, d.degree * 0.4)))
      .force("x", forceX(0).strength(0.03))
      .force("y", forceY(0).strength(0.03))
      .alpha(1)
      .alphaDecay(0.03)
      .on("tick", () => setTick((t) => t + 1));

    return () => { sim.current?.stop(); };
  }, [graph, filters.kinds, filters.edgeTypes]);

  // Pan / zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setTransform((t) => ({ ...t, k: Math.max(0.15, Math.min(6, t.k * factor)) }));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const nx = e.clientX - d.x;
    const ny = e.clientY - d.y;
    setTransform((t) => ({ ...t, x: nx, y: ny }));
  };
  const onPointerUp = () => { drag.current = null; };

  // Hover/select highlight
  const selectedNid = useMemo(() => {
    if (!dossier) return null;
    const n = nodes.find((nn) => nn.id === dossier.id && nn.kind === dossier.kind);
    return n?.nid ?? null;
  }, [dossier, nodes]);

  const focusNid = hoverId ?? selectedNid;
  const neighborSet = useMemo(() => {
    if (focusNid == null) return null;
    const set = new Set<number>([focusNid]);
    for (const e of edges) {
      if (e.source.nid === focusNid) set.add(e.target.nid);
      if (e.target.nid === focusNid) set.add(e.source.nid);
    }
    return set;
  }, [focusNid, edges]);

  const showLabels = transform.k > 1.4;

  return (
    <svg
      ref={svgRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="w-full h-full select-none"
      style={{
        cursor: drag.current ? "grabbing" : "grab",
        background: "radial-gradient(ellipse at center, #11151f 0%, #08090f 70%, #050609 100%)",
      }}
    >
      <defs>
        <pattern id="atlasGrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.04" />
        </pattern>
      </defs>
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#atlasGrid)"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`} />

      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
        {/* edges */}
        <g>
          {edges.map((e, i) => {
            if (Number.isNaN(e.source.x) || Number.isNaN(e.target.x)) return null;
            const dim = neighborSet && (!neighborSet.has(e.source.nid) || !neighborSet.has(e.target.nid));
            return (
              <line
                key={i}
                x1={e.source.x} y1={e.source.y}
                x2={e.target.x} y2={e.target.y}
                stroke={dim ? "rgba(180,195,220,0.04)" : "rgba(180,195,220,0.16)"}
                strokeWidth={1 / transform.k}
                strokeDasharray={EDGE_DASH[e.type] ?? "0"}
                pointerEvents="none"
              />
            );
          })}
        </g>
        {/* nodes */}
        <g>
          {nodes.map((n) => {
            if (Number.isNaN(n.x) || Number.isNaN(n.y)) return null;
            const dim = neighborSet && !neighborSet.has(n.nid);
            const r = 3 + Math.min(14, n.degree * 0.32);
            const fill = n.color ?? KIND_COLOR[n.kind as Kind] ?? "#7a8aa6";
            const isHovered = hoverId === n.nid;
            const isSelected = selectedNid === n.nid;
            return (
              <g
                key={n.nid}
                transform={`translate(${n.x}, ${n.y})`}
                onMouseEnter={() => setHoverId(n.nid)}
                onMouseLeave={() => setHoverId((h) => h === n.nid ? null : h)}
                onClick={(e) => { e.stopPropagation(); openDossier({ kind: n.kind as Kind, id: n.id }); }}
                style={{ cursor: "pointer", opacity: dim ? 0.18 : 1, transition: "opacity 200ms" }}
              >
                <circle
                  r={r}
                  fill={fill}
                  stroke={isSelected ? "#fff" : isHovered ? fill : "rgba(0,0,0,0.4)"}
                  strokeWidth={(isSelected ? 2.5 : 1) / transform.k}
                />
                {(showLabels || isHovered || isSelected) && (
                  <text
                    y={r + 12 / transform.k}
                    textAnchor="middle"
                    fontSize={10 / transform.k}
                    fill="rgba(244,237,224,0.86)"
                    style={{
                      pointerEvents: "none",
                      fontFamily: "var(--font-plex-mono), monospace",
                      paintOrder: "stroke",
                      stroke: "rgba(0,0,0,0.6)",
                      strokeWidth: 3 / transform.k,
                    }}
                  >
                    {truncate(n.label, 28)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>

      {loading && (
        <text x="50%" y="50%" textAnchor="middle" fill="rgba(244,237,224,0.6)"
              style={{ fontFamily: "var(--font-plex-mono), monospace", fontSize: 11 }}>
          loading graph…
        </text>
      )}
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
